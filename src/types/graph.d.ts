// src/types/index.ts
export type FileTreeItem = {
    name: string
    path: string
    description: string
    children?: FileTreeItem[]
    type?: 'directory' | 'file'
}

export type ModuleConfig = {
    name: string
    description: string
    fileTree: FileTreeItem[]
}

export type ProjectSummary = {
    path: string
    graph: string
    moduleConfigs: ModuleConfig[]
}

export interface FileTreeProps {
    data: FileTreeItem[]
    level?: number
    onHover?: (content: string, position: DOMRect) => void
    onLeave?: () => void
}
