// main/project/projectManager.ts
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { File } from '../../types/file'
import { getDatabase, initializeDatabase } from './db.ts'
import { countLines, getAllFiles, getLanguage, isBinaryFile } from './fileManager.ts'
import { FileNode } from '../../types/file'

// ai识别忽略文件
const IGNORED_DIRS = ['.nextcode']
const IGNORED_FILES = new Set(['__init__.py']) // 需要忽略的文件
const IGNORED_EXTENSIONS = new Set(['exe']) // 需要忽略的扩展名

const AI_ENABLED_EXTENSIONS = new Set(['py'])

// 文件树忽略文件
const DEFAULT_IGNORE_PATTERNS = [
    '.nextcode',
    'node_modules',
    '.git',
    '.DS_Store',
    '.github',
    '.gitignore',
    'LICENSE.txt'
]

export class ProjectManager {
    static ignorePatterns: string[] = [...DEFAULT_IGNORE_PATTERNS]

    static createDir(projectPath: string): string {
        const nextcodeDir = path.join(projectPath, '.nextcode')
        if (!fs.existsSync(nextcodeDir)) {
            fs.mkdirSync(nextcodeDir, { recursive: true })
        }

        return nextcodeDir
    }

    static async setupProjectDirectory(projectPath: string) {
        const dbPath = this.createDir(projectPath)
        const db = await initializeDatabase(dbPath)
        await db.waitForInitialization() // 显式等待初始化完成
        console.log('database indices ready')
    }

    static async syncFilesWithDatabase(projectPath: string): Promise<File[]> {
        const files = getAllFiles(projectPath).filter((file) => {
            const fileName = path.basename(file.path)
            const fileExt = path.extname(file.path).slice(1)

            return (
                !IGNORED_DIRS.some((dir) => file.path.includes(dir)) && // 过滤文件夹
                !IGNORED_FILES.has(fileName) && // 过滤特定文件
                !IGNORED_EXTENSIONS.has(fileExt)
            ) // 过滤特定扩展名
        })

        const db = getDatabase()
        await db.waitForInitialization()

        const collection = db.getFileCollection()
        const currentPaths = new Set(files.map((file) => path.relative(projectPath, file.path)))

        // Cleanup deleted files
        collection.findAndRemove({ path: { $nin: [...currentPaths] } })

        return files.map((file) => {
            const filePath = file.path
            const relativePath = path.relative(projectPath, filePath)
            const stats = fs.statSync(filePath)
            const content = fs.readFileSync(filePath)

            return this.createOrUpdateFileRecord(collection, relativePath, stats, content)
        })
    }

    private static createOrUpdateFileRecord(
        collection: Collection<File>,
        relativePath: string,
        stats: fs.Stats,
        content: Buffer
    ): File {
        const hash = crypto.createHash('sha256').update(content).digest('hex')
        const existing = collection.findOne({ path: relativePath })
        const extension = path.extname(relativePath).slice(1)
        const isTargetFile = AI_ENABLED_EXTENSIONS.has(extension)

        if (existing) {
            if (existing.hash !== hash) {
                const updated = { ...existing, hash, needsAiUpdate: isTargetFile }
                collection.update(updated)
            }
            return existing
        }

        const fileData: File = {
            name: path.basename(relativePath),
            path: relativePath,
            hash,
            extension,
            size: stats.size,
            lastModified: stats.mtimeMs,
            language: getLanguage(relativePath),
            linesOfCode: isTargetFile ? countLines(content.toString()) : 0,
            isBinary: isBinaryFile(content),
            needsAiUpdate: isTargetFile,
            summary: '',
            overview: {
                behavior: '',
                markdown: ''
            },
            funcs: []
        }

        return collection.insert(fileData) as File
    }

    // 新增文件树生成方法
    static generateFileTree(projectPath: string): FileNode {
        const buildTree = (currentPath: string): FileNode | null => {
            const relativePath = path.relative(projectPath, currentPath)
            const pathSegments = relativePath.split(path.sep).filter((p) => p !== '')

            // 检查忽略规则 (Check ignore rules)
            if (
                pathSegments.some(
                    (segment) =>
                        this.ignorePatterns.includes(segment) ||
                        this.ignorePatterns.includes(path.basename(currentPath))
                )
            ) {
                return null
            }

            const stats = fs.statSync(currentPath)
            const isDirectory = stats.isDirectory()

            const node: FileNode = {
                id: relativePath.startsWith('/') ? relativePath : `/${relativePath}`, // Keep using relativePath for id
                name: path.basename(currentPath),
                path: currentPath,
                isDirectory,
                isLeaf: !isDirectory,
                children: []
            }

            if (isDirectory) {
                node.children = fs
                    .readdirSync(currentPath)
                    .map((child) => path.join(currentPath, child)) // Generate absolute paths for children
                    .map(buildTree)
                    .filter((child) => child !== null) as FileNode[]
            }

            return node
        }

        return buildTree(projectPath) as FileNode
    }

    static generateTextFileTree(projectPath: string): string {
        const rootName = path.basename(projectPath)
        const treeLines: string[] = [rootName]

        const buildTextTree = (currentPath: string, prefix: string): void => {
            const relativePath = path.relative(projectPath, currentPath)
            const pathSegments = relativePath.split(path.sep).filter((p) => p !== '')

            // 检查忽略规则，应用在每个层级
            if (
                this.ignorePatterns.includes(path.basename(currentPath)) ||
                pathSegments.some((segment) => this.ignorePatterns.includes(segment))
            ) {
                return
            }

            const items = fs.readdirSync(currentPath)
            const directories: string[] = []
            const files: string[] = []

            items.forEach((item) => {
                const itemPath = path.join(currentPath, item)
                const stats = fs.statSync(itemPath)
                if (stats.isDirectory()) {
                    directories.push(item)
                } else {
                    files.push(item)
                }
            })

            directories.sort()
            files.sort()
            const allItems = [...directories, ...files]

            allItems.forEach((item, index) => {
                const isLast = index === allItems.length - 1
                const itemPath = path.join(currentPath, item)
                const stats = fs.statSync(itemPath)
                const isDirectory = stats.isDirectory()

                // 在添加节点前再次检查忽略规则
                if (this.ignorePatterns.includes(item)) {
                    return
                }

                const branch = isLast ? '└── ' : '├── '
                treeLines.push(prefix + branch + item)

                if (isDirectory) {
                    const newPrefix = prefix + (isLast ? '    ' : '│   ')
                    buildTextTree(itemPath, newPrefix)
                }
            })
        }

        // 处理根目录下的子节点，确保忽略规则生效
        const rootItems = fs
            .readdirSync(projectPath)
            .filter((item) => !this.ignorePatterns.includes(item)) // 直接过滤根目录下的忽略项
        rootItems.forEach((item, index) => {
            const itemPath = path.join(projectPath, item)
            const stats = fs.statSync(itemPath)
            const isLast = index === rootItems.length - 1
            const branch = isLast ? '└── ' : '├── '
            treeLines.push(branch + item)

            if (stats.isDirectory()) {
                const newPrefix = isLast ? '    ' : '│   '
                buildTextTree(itemPath, newPrefix)
            }
        })

        return treeLines.join('\n')
    }

    static configureIgnorePatterns(patterns: string[]) {
        this.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...patterns]
    }
}
