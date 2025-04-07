'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.AIProcessor = void 0
const db_1 = require('../utils/db')
const path_1 = __importDefault(require('path'))
const openai_1 = __importDefault(require('openai'))
const fileManager_1 = require('../utils/fileManager')
const prompts_1 = require('./prompts')
const fs_1 = __importDefault(require('fs'))
const globalSettings_1 = require('../../common/globalSettings')

class AIProcessor {
    static getOpenAIClient() {
        // Get settings from global store
        const store = globalSettings_1.useGlobalSettings.getState()
        const apiKey = store.apiKey // Fallback if not set
        const baseURL = store.models // Using models field for baseURL
        return new openai_1.default({
            baseURL,
            apiKey
        })
    }

    static getLanguagePrompt(promptKey) {
        // Get language setting from global store
        const store = globalSettings_1.useGlobalSettings.getState()
        const language = store.languages || 'ZH' // Default to Chinese if not set
        // Choose the correct prompt based on language setting
        const promptSuffix = language.toUpperCase() === 'EN' ? 'EN' : 'ZH'
        const fullPromptKey = `${promptKey}${promptSuffix}`
        // Check if the prompt exists and return it or a fallback
        if (fullPromptKey in prompts_1.PROMPTS) {
            return prompts_1.PROMPTS[fullPromptKey]
        }
        // Fallback to ZH if the specific language version doesn't exist
        const fallbackKey = `${promptKey}ZH`
        return prompts_1.PROMPTS[fallbackKey]
    }

    static async processFile(projectPath, file, progressCallback) {
        const db = (0, db_1.getDatabase)()
        const fullPath = path_1.default.join(projectPath, file.path)
        try {
            // 生成带行号的代码内容
            const numberedCode = `filename: ${path_1.default.basename(file.path)}\n${(0, fileManager_1.addLineNumbers)(fullPath)}`
            // 使用封装的AI请求方法
            const aiResponse = await this.getAIResponse(
                'deepseek-chat',
                this.getLanguagePrompt('fileSummary'),
                numberedCode
            )
            // 解析响应数据
            const { summary, overview, funcs } = aiResponse.data
            // 转换函数结构
            const funcInfo = funcs.map((func) => ({
                func_name: func.func_name,
                agls: func.agls.map((agl) => ({
                    line: agl.line,
                    agl: agl.agl
                }))
            }))
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
            progressCallback(100, `已处理 ${path_1.default.basename(file.path)}`)
        } catch (error) {
            console.error(`文件处理失败 ${file.path}:`, error)
            // 记录错误信息到数据库
            db.getFileCollection().findAndUpdate({ path: file.path }, (entry) => ({
                ...entry,
                needsAiUpdate: false,
                error: error instanceof Error ? error.message : String(error),
                updatedAt: new Date().toISOString()
            }))
            progressCallback(100, `处理失败: ${path_1.default.basename(file.path)}`)
            throw error
        }
    }

    // 在AIProcessor类中添加以下新方法
    static async processProject(projectPath, fileTree, descriptions, progressCallback) {
        const db = (0, db_1.getDatabase)()
        try {
            // 第一步：获取需要读取的说明性文档列表
            console.log('fileTree\n', fileTree)
            const step1Response = await this.getAIResponse(
                'deepseek-reasoner',
                this.getLanguagePrompt('projectSummary1'),
                fileTree
            )
            const docsToRead = step1Response.data
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

    static async getAIResponse(model, systemPrompt, userContent, maxRetries = 3) {
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

    static async readDocumentContents(projectPath, filePaths) {
        const contents = []
        for (const filePath of filePaths) {
            try {
                const fullPath = path_1.default.join(projectPath, filePath)
                const content = fs_1.default.readFileSync(fullPath, 'utf-8')
                contents.push(`[${path_1.default.basename(filePath)}]\n${content}`)
            } catch (error) {
                console.warn(`无法读取文档: ${filePath}`, error)
                contents.push(`[${path_1.default.basename(filePath)}]\n<文件不可读>`)
            }
        }
        return contents.join('\n\n')
    }
}

exports.AIProcessor = AIProcessor
//# sourceMappingURL=aiProcessor.js.map
