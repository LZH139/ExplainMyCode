/// <reference types="vite/client" />

import { IpcRendererEvent } from 'electron'
import { ProjectSummary } from './types/graph'
import { GlobalSettings } from './types/settings'
import { FileNode } from './file'
import { FileResult } from '../../types/file'

declare global {
    interface Window {
        electronAPI: any // electron-toolkit 已定义的类型
        api: {
            // 监听进度更新
            onProgressUpdate: (
                callback: (event: IpcRendererEvent, progress: number) => void
            ) => void
            removeProgressUpdateListener: (
                handler: (event: IpcRendererEvent, progress: number) => void
            ) => void
            onProgressComplete: (
                callback: (event: IpcRendererEvent, data: { fileTree: FileNode }) => void
            ) => void
            removeProgressCompleteListener: (
                handler: (event: IpcRendererEvent, data: { fileTree: FileNode }) => void
            ) => void

            // 获取文件路径
            getFilePath: (file: File) => Promise<string>

            // 初始化项目
            initProject: (projectPath: string) => Promise<{
                success: boolean
                message: string
            }>

            // 统一的文件获取方法 - 包含所有信息
            getFileByPath: (filePath: string) => Promise<FileResult>

            // 获取项目图
            getProjectGraph: () => Promise<ProjectSummary>

            refreshProjectGraph: () => Promise<ProjectSummary>

            // 保存设置
            saveSettings: (settings: Partial<GlobalSettings>) => Promise<void>
        }
    }
}
