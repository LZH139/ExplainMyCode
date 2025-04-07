import { getDatabase } from '../utils/db.ts'
import { AGL, File, FuncInfo } from '../../types/file'
import path from 'path'
import OpenAI from 'openai'
import { addLineNumbers } from '../utils/fileManager.ts'
import { PROMPTS } from './prompts.ts'
import fs from 'fs'
import { globalSettings } from '../stores/globalSettings.ts'

export class AIProcessor {
    private static getOpenAIClient() {
        // Get settings from global store
        const settings = globalSettings.getSettings()
        const apiKey = settings.apiKey // Fallback if not set
        const baseURL = settings.models // Using models field for baseURL

        return new OpenAI({
            baseURL,
            apiKey
        })
    }

    private static getLanguagePrompt(promptKey: string): string {
        // Get language setting from global store

        const settings = globalSettings.getSettings()
        const language = settings.languages || 'ZH' // Default to Chinese if not set

        // Choose the correct prompt based on language setting
        const promptSuffix = language.toUpperCase() === 'EN' ? 'EN' : 'ZH'
        const fullPromptKey = `${promptKey}${promptSuffix}` as keyof typeof PROMPTS

        // Check if the prompt exists and return it or a fallback
        if (fullPromptKey in PROMPTS) {
            return PROMPTS[fullPromptKey]
        }

        // Fallback to ZH if the specific language version doesn't exist
        const fallbackKey = `${promptKey}ZH` as keyof typeof PROMPTS
        return PROMPTS[fallbackKey]
    }

    static async processFile(
        projectPath: string,
        file: File,
        progressCallback: (progress: number, message: string) => void
    ): Promise<void> {
        const db = getDatabase()
        const fullPath = path.join(projectPath, file.path)

        try {
            // 生成带行号的代码内容
            const numberedCode = `filename: ${path.basename(file.path)}\n${addLineNumbers(fullPath)}`

            // 使用封装的AI请求方法
            const aiResponse = await this.getAIResponse(
                'deepseek-chat',
                this.getLanguagePrompt('fileSummary'),
                numberedCode
            )

            // 解析响应数据
            const { summary, overview, funcs } = aiResponse.data

            // 转换函数结构
            const funcInfo: FuncInfo[] = funcs.map(
                (func: FuncInfo) =>
                    ({
                        func_name: func.func_name,
                        agls: func.agls.map(
                            (agl) =>
                                ({
                                    line: agl.line,
                                    agl: agl.agl
                                }) as AGL
                        )
                    }) as FuncInfo
            )

            // 更新数据库记录
            const collection = db.getFileCollection()
            collection.findAndUpdate({ path: file.path }, (entry) => {
                Object.assign(entry, {
                    summary,
                    overview,
                    funcs: funcInfo,
                    needsAiUpdate: false
                })
                return entry
            })
            await db.saveDatabase()

            progressCallback(100, `已处理 ${path.basename(file.path)}`)
        } catch (error) {
            console.error(`文件处理失败 ${file.path}:`, error)

            // 记录错误信息到数据库
            db.getFileCollection().findAndUpdate({ path: file.path }, (entry) => ({
                ...entry,
                needsAiUpdate: false,
                error: error instanceof Error ? error.message : String(error),
                updatedAt: new Date().toISOString()
            }))

            progressCallback(100, `处理失败: ${path.basename(file.path)}`)
            throw error
        }
    }

    // 在AIProcessor类中添加以下新方法
    static async processProject(
        projectPath: string,
        fileTree: string,
        descriptions: string,
        progressCallback: (progress: number, message: string) => void
    ): Promise<void> {
        const db = getDatabase()

        try {
            // 第一步：获取需要读取的说明性文档列表
            console.log('fileTree\n', fileTree)
            const step1Response = await this.getAIResponse(
                'deepseek-reasoner',
                this.getLanguagePrompt('projectSummary1'),
                fileTree
            )
            const docsToRead = step1Response.data as string[]
            console.log('docsToRead\n', docsToRead)
            // 第二步：读取文档内容并生成输入
            const docContents = await this.readDocumentContents(projectPath, docsToRead)

            console.log('docContents\n', docContents)
            const step2Response = await this.getAIResponse(
                'deepseek-chat',
                this.getLanguagePrompt('projectSummary2'),
                docContents
            )
            const explanation = step2Response.data.doc

            // 第三步：生成最终流程图
            const finalInput = `[FILETREE]\n${fileTree}\n\n[FILEDESC]\n${descriptions}\n\n[EXPLANATION]\n${explanation}`

            console.log('finalInput\n', finalInput)
            const step3Response = await this.getAIResponse(
                'deepseek-reasoner',
                this.getLanguagePrompt('summary2Graph'),
                finalInput
            )

            // 数据库操作
            const modulesCollection = db.getProjectSummaryCollection()
            const existing = modulesCollection.findOne({ path: projectPath })

            if (existing) {
                modulesCollection.findAndUpdate({ path: projectPath }, (entry) => {
                    entry.graph = step3Response.graph
                    entry.moduleConfigs = step3Response.data
                    return entry
                })
            } else {
                modulesCollection.insert({
                    path: projectPath,
                    graph: step3Response.graph,
                    moduleConfigs: step3Response.data
                })
            }
            await db.saveDatabase()

            progressCallback(100, '项目分析完成')
        } catch (error) {
            console.error('项目处理失败:', error)
            progressCallback(
                100,
                `处理失败: ${error instanceof Error ? error.message : String(error)}`
            )
            throw error
        }
    }

    private static async getAIResponse(
        model: string,
        systemPrompt: string,
        userContent: string,
        maxRetries = 3
    ) {
        let retries = 0
        const openai = this.getOpenAIClient()

        while (retries < maxRetries) {
            try {
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ],
                    model: model
                })

                if (!completion.choices[0].message.content) {
                    throw new Error('空响应内容')
                }

                const sanitized = completion.choices[0].message.content
                    .replace(/^```json\s*/i, '')
                    .replace(/```$/g, '')
                    .trim()

                return JSON.parse(sanitized)
            } catch (error) {
                retries++
                if (retries >= maxRetries) {
                    throw new Error(
                        `AI请求失败: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
                await new Promise((resolve) => setTimeout(resolve, 1000 * retries))
            }
        }
    }

    private static async readDocumentContents(projectPath: string, filePaths: string[]) {
        const contents: string[] = []

        for (const filePath of filePaths) {
            try {
                const fullPath = path.join(projectPath, filePath)
                const content = fs.readFileSync(fullPath, 'utf-8')
                contents.push(`[${path.basename(filePath)}]\n${content}`)
            } catch (error) {
                console.warn(`无法读取文档: ${filePath}`, error)
                contents.push(`[${path.basename(filePath)}]\n<文件不可读>`)
            }
        }

        return contents.join('\n\n')
    }
}
