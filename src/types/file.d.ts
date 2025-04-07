// file.d.ts
export interface FileNode {
    id: string
    name: string
    path: string
    isDirectory: boolean
    isLeaf: boolean
    content?: string
    children: FileNode[]
}

interface FileResult extends File {
    exists: boolean
    fullPath: string
    rawContent: string
    contentWithAgl: string
    message?: string
    error?: string
}

export interface File {
    name: string // 文件名，例如 "aiService.ts"
    path: string // 文件相对路径，例如 "ai/aiService.ts"
    hash: string // 文件内容的 SHA256 哈希，用于检测变化
    summary: string // 文件摘要，由 AI 生成的简短描述
    overview: Overview // 文件概览，由 AI 生成的详细说明
    funcs: FuncInfo[] // 函数列表，例如 ["registerIpcHandlers", "initializeProject"]
    needsAiUpdate: boolean // 是否需要 AI 更新摘要/概览/函数列表

    extension: string // 文件扩展名，例如 ".ts"
    size: number // 文件大小（字节），用于快速比较
    lastModified: number // 最后修改时间（时间戳），便于跟踪变化
    language: string // 编程语言，例如 "typescript"、"javascript"
    linesOfCode: number // 代码行数，统计非空非注释行
    isBinary: boolean // 是否为二进制文件，用于区分文本和非文本文件
}

export interface Overview {
    behavior: string
    markdown: string
}

export interface FuncInfo {
    func_name: string // 函数名，例如 "process_data" 或 "class_name.__init__"
    agls: AGL[] // 注解列表，描述函数的关键步骤或逻辑
}

export interface AGL {
    line: number // 代码行号，例如 15
    agl: string // 注解内容，例如 "#> 该函数先去除输入的'0x'前缀..."
}
