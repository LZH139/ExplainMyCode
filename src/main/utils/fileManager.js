'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.getAllFiles = getAllFiles
exports.isCodeFile = isCodeFile
exports.isBinaryFile = isBinaryFile
exports.getLanguage = getLanguage
exports.countLines = countLines
exports.addLineNumbers = addLineNumbers
exports.readFileContent = readFileContent
const fs_1 = __importDefault(require('fs'))
const path_1 = __importDefault(require('path'))

// 递归获取目录下的所有文件
function getAllFiles(dir) {
    let results = []
    const list = fs_1.default.readdirSync(dir)
    list.forEach((file) => {
        const filePath = path_1.default.join(dir, file)
        // 跳过 .nextcode 文件夹
        if (filePath.includes('.nextcode')) return
        const stat = fs_1.default.statSync(filePath)
        if (stat.isDirectory()) {
            results = results.concat(getAllFiles(filePath))
        } else {
            results.push({ path: filePath })
        }
    })
    return results
}

// 判断是否是代码文件
function isCodeFile(filePath) {
    const codeExtensions = ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.cs', '.go', '.rb', '.php']
    const ext = path_1.default.extname(filePath).toLowerCase()
    return codeExtensions.includes(ext)
}

// 文件类型检测
function isBinaryFile(content) {
    // 实际实现可使用第三方库如isbinaryfile
    return content.some((byte) => byte === 0 || byte > 127)
}

// 语言类型映射
function getLanguage(filePath) {
    const ext = path_1.default.extname(filePath).slice(1).toLowerCase()
    const languageMap = {
        ts: 'typescript',
        js: 'javascript',
        py: 'python',
        java: 'java',
        cpp: 'cpp'
    }
    return languageMap[ext] || ext
}

// 代码行统计
function countLines(content) {
    const trimmed = content.trim()
    if (trimmed === '') return 0
    return trimmed.split('\n').length
}

function addLineNumbers(inputFile) {
    try {
        // 读取文件内容
        const content = fs_1.default.readFileSync(inputFile, 'utf-8')
        const lines = content.split('\n') // 将文件内容按行分割
        // 为每一行添加行号
        const numberedLines = lines.map((line, index) => `${index + 1}: ${line}`)
        // 将结果合并为单个字符串，以换行符连接
        return numberedLines.join('\n')
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            console.error(`错误：文件 '${inputFile}' 不存在。`)
            process.exit(1)
        } else {
            console.error(`读取文件时发生错误：${error instanceof Error ? error.message : error}`)
            process.exit(1)
        }
    }
}

function readFileContent(filePath) {
    try {
        // 规范化文件路径
        const absolutePath = path_1.default.resolve(filePath)
        // 检查文件是否存在
        if (!fs_1.default.existsSync(absolutePath)) {
            throw new Error(`文件不存在: ${absolutePath}`)
        }
        // 读取文件内容
        return fs_1.default.readFileSync(absolutePath, 'utf8')
    } catch (error) {
        // 处理不同类型的错误
        const err = error
        if (err.code === 'ENOENT') {
            console.error(`错误: 文件未找到 - ${filePath}`)
        } else if (err.code === 'EACCES') {
            console.error(`错误: 没有权限访问文件 - ${filePath}`)
        } else {
            console.error(`读取文件时发生错误: ${err.message}`)
        }
        throw err
    }
}

//# sourceMappingURL=fileManager.js.map
