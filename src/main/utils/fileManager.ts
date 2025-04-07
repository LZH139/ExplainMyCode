import fs from 'fs'
import path from 'path'

// 递归获取目录下的所有文件
export function getAllFiles(dir: string): { path: string }[] {
    let results: { path: string }[] = []
    const list = fs.readdirSync(dir)

    list.forEach((file) => {
        const filePath = path.join(dir, file)
        // 跳过 .nextcode 文件夹
        if (filePath.includes('.nextcode')) return

        const stat = fs.statSync(filePath)
        if (stat.isDirectory()) {
            results = results.concat(getAllFiles(filePath))
        } else {
            results.push({ path: filePath })
        }
    })
    return results
}

// 判断是否是代码文件
export function isCodeFile(filePath: string): boolean {
    const codeExtensions = ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.cs', '.go', '.rb', '.php']
    const ext = path.extname(filePath).toLowerCase()
    return codeExtensions.includes(ext)
}

// 文件类型检测
export function isBinaryFile(content: Buffer): boolean {
    // 实际实现可使用第三方库如isbinaryfile
    return content.some((byte) => byte === 0 || byte > 127)
}

// 语言类型映射
export function getLanguage(filePath: string): string {
    const ext = path.extname(filePath).slice(1).toLowerCase()
    const languageMap: Record<string, string> = {
        ts: 'typescript',
        js: 'javascript',
        py: 'python',
        java: 'java',
        cpp: 'cpp'
    }
    return languageMap[ext] || ext
}

// 代码行统计
export function countLines(content: string): number {
    const trimmed = content.trim()
    if (trimmed === '') return 0
    return trimmed.split('\n').length
}

export function addLineNumbers(inputFile: string): string {
    try {
        // 读取文件内容
        const content = fs.readFileSync(inputFile, 'utf-8')
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

export function readFileContent(filePath: string) {
    try {
        // 规范化文件路径
        const absolutePath = path.resolve(filePath)

        // 检查文件是否存在
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`文件不存在: ${absolutePath}`)
        }

        // 读取文件内容
        return fs.readFileSync(absolutePath, 'utf8')
    } catch (error) {
        // 处理不同类型的错误
        const err = error as NodeJS.ErrnoException
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
