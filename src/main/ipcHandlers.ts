import { ipcMain } from 'electron'
import pLimit from 'p-limit'
import { ProjectManager } from './utils/projectManager.ts'
import { ProgressManager } from './utils/progressManager.ts'
import { AIProcessor } from './ai/aiProcessor.ts'
import { promises as fs } from 'fs'
import { getDatabase } from './utils/db.ts'
import { AGL, File } from '../types/file'
import path from 'path'
import { globalSettings } from './stores/globalSettings.ts'

const AI_PROCESS_CONCURRENCY = 2
const processLimit = pLimit(AI_PROCESS_CONCURRENCY)

let globalProjectPath: string | null = null

export function registerIpcHandlers() {
    ipcMain.handle('init-project', async (event, projectPath: string) => {
        try {
            globalProjectPath = projectPath

            await ProjectManager.setupProjectDirectory(projectPath)
            const fileTree = ProjectManager.generateFileTree(projectPath)
            const files = await ProjectManager.syncFilesWithDatabase(projectPath)
            const pendingUpdates = files.filter((f: { needsAiUpdate: boolean }) => f.needsAiUpdate)

            const progressManager = ProgressManager.create(
                event.sender,
                // +1 是因为还有个模块分析
                pendingUpdates.length + 1
            )

            if (pendingUpdates.length === 0) {
                progressManager.complete(fileTree)
                return { success: true, message: 'No updates needed' }
            }

            const processingTasks = pendingUpdates.map((file) =>
                processLimit(async () => {
                    try {
                        await AIProcessor.processFile(projectPath, file, () =>
                            progressManager.updateProgress(file.name)
                        )
                    } catch (error) {
                        console.error(`文件处理失败: ${file.path}`, error)
                        throw error
                    }
                })
            )

            await Promise.all(processingTasks)

            // 生成文件树文本
            const textFileTree = ProjectManager.generateTextFileTree(projectPath)

            // 构建行为描述
            const db = getDatabase()
            const descriptions = db
                .getFileCollection()
                .chain()
                .where((file) => file.overview.behavior !== '')
                .data()
                .map((file) => `${file.path.replace(/\\/g, '/')}: ${file.overview.behavior}`)
                .join('\n')

            console.log('textFileTree\n', textFileTree)
            console.log('descriptions\n', descriptions)

            await AIProcessor.processProject(projectPath, textFileTree, descriptions, () => {
                progressManager.updateProgress('project module analysis')
            })

            progressManager.complete(fileTree)

            return {
                success: true,
                message: 'AI 处理完成'
            }
        } catch (error) {
            console.error('项目初始化失败:', error)
            event.sender.send('progress-update', {
                progress: -1,
                message: `错误: ${error instanceof Error ? error.message : error}`
            })
            return {
                success: false,
                message: error instanceof Error ? error.message : '未知错误'
            }
        }
    })

    ipcMain.handle('get-file-by-path', async (_, filePath: string) => {
        try {
            if (!globalProjectPath) {
                throw new Error('Project path not initialized. Please init project first.')
            }

            // 转换为相对路径并统一路径格式
            const relativePath = path.relative(globalProjectPath, filePath)
            const normalizedRelativePath = relativePath.replace(/\\/g, '/')

            // 获取文件内容
            let rawContent: string
            try {
                rawContent = await fs.readFile(filePath, 'utf8')
            } catch (error) {
                console.error(`Error reading file content: ${filePath}`, error)
                return {
                    exists: false,
                    message: 'File not found or cannot be read',
                    error: error instanceof Error ? error.message : '未知错误'
                }
            }

            // 获取数据库中的文件信息
            const db = getDatabase()
            await db.waitForInitialization()

            const files = db.getFileCollection()
            const fileRecord = files.findOne({ path: normalizedRelativePath }) as File | null

            // 处理带有AGL注解的内容
            let contentWithAgl = rawContent
            if (fileRecord?.funcs?.length) {
                const agls: AGL[] = fileRecord.funcs
                    .reduce<AGL[]>((acc, func) => acc.concat(func.agls), [])
                    .sort((a, b) => b.line - a.line)

                const lines = rawContent.split('\n')

                // 处理 AGL 对齐
                agls.forEach(({ line, agl }) => {
                    const insertPos = line - 1 // 转换为0-based索引
                    if (insertPos >= 0 && insertPos < lines.length) {
                        // 获取下一行的缩进（如果下一行存在）
                        const nextLine = lines[insertPos]
                        let indent = ''
                        if (nextLine) {
                            // 计算缩进（前导空格或制表符）
                            const match = nextLine.match(/^\s*/)
                            indent = match ? match[0] : ''
                        }
                        // 将 AGL 与下一行缩进对齐
                        const alignedAgl = indent + agl.trim()
                        lines.splice(insertPos, 0, alignedAgl)
                    } else {
                        console.warn(`[AGL] Invalid line ${line} in ${normalizedRelativePath}`)
                    }
                })

                contentWithAgl = lines.join('\n')
            }

            // 构建完整的返回结果
            return {
                exists: true,
                fullPath: filePath,
                rawContent,
                contentWithAgl,
                // 如果数据库中有文件记录，则合并到结果中
                ...(fileRecord || {})
            }
        } catch (error) {
            console.error(`Error retrieving file: ${filePath}`, error)
            return {
                exists: false,
                message:
                    '无法获取文件信息: ' + (error instanceof Error ? error.message : '未知错误'),
                error: error instanceof Error ? error.message : '未知错误'
            }
        }
    })

    ipcMain.handle('get-project-graph', async () => {
        try {
            if (!globalProjectPath) {
                throw new Error('Project path not initialized. Please init project first.')
            }

            const db = getDatabase()
            await db.waitForInitialization()

            return db.getProjectSummaryCollection().findOne()
        } catch (error) {
            console.error('Error retrieving project modules:', error)
            return {
                success: false,
                message: error instanceof Error ? error.message : '未知错误'
            }
        }
    })

    ipcMain.handle('refresh-project-graph', async () => {
        try {
            if (!globalProjectPath) {
                throw new Error('Project path not initialized. Please init project first.')
            }

            // 生成文件树文本
            const textFileTree = ProjectManager.generateTextFileTree(globalProjectPath)

            // 构建行为描述
            const db = getDatabase()
            await db.waitForInitialization()

            const descriptions = db
                .getFileCollection()
                .chain()
                .where((file: File) => file.overview.behavior !== '')
                .data()
                .map((file: File) => `${file.path.replace(/\\/g, '/')}: ${file.overview.behavior}`)
                .join('\n')

            // 执行项目级 AI 处理
            await AIProcessor.processProject(
                globalProjectPath,
                textFileTree,
                descriptions,
                () => {} // 空回调替代进度更新
            )

            // 获取更新后的项目结构返回给渲染进程
            return db.getProjectSummaryCollection().findOne()
        } catch (error) {
            console.error('项目结构刷新失败:', error)
            return {
                success: false,
                message: error instanceof Error ? error.message : '未知错误',
                error: error instanceof Error ? error.stack : undefined
            }
        }
    })

    ipcMain.handle('save-settings', (_event, settings) => {
        globalSettings.setSettings(settings)
        console.log('Settings saved:', globalSettings.getSettings())
    })
}
