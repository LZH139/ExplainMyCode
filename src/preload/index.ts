import { contextBridge, IpcRendererEvent, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { GlobalSettings } from '../types/settings'
import { FileNode } from '../types/file'

// Custom APIs for renderer
const api = {
    // 监听进度更新
    onProgressUpdate: (callback: (event: IpcRendererEvent, progress: number) => void) => {
        ipcRenderer.on('progress-update', callback)
    },
    // 移除进度更新监听器
    removeProgressUpdateListener: (
        handler: (event: IpcRendererEvent, progress: number) => void
    ) => {
        ipcRenderer.removeListener('progress-update', handler)
    },
    onProgressComplete: (
        callback: (event: IpcRendererEvent, data: { fileTree: FileNode }) => void
    ) => {
        ipcRenderer.on('progress-complete', callback)
    },
    removeProgressCompleteListener: (
        handler: (event: IpcRendererEvent, data: { fileTree: FileNode }) => void
    ) => {
        ipcRenderer.removeListener('progress-complete', handler)
    },

    // 新增方法：获取拖拽文件的路径
    getFilePath: (file: File) => {
        return webUtils.getPathForFile(file)
    },

    // 初始化项目
    initProject: (projectPath: string) => ipcRenderer.invoke('init-project', projectPath),

    // 获取文件内容
    getFileContent: (filePath: string) => ipcRenderer.invoke('get-file-content', filePath),
    getFileContentWithAGL: (filePath: string) =>
        ipcRenderer.invoke('get-file-content-with-agl', filePath),
    getFileByPath: (filePath: string) => ipcRenderer.invoke('get-file-by-path', filePath),

    // 获取项目图
    getProjectGraph: () => ipcRenderer.invoke('get-project-graph'),

    refreshProjectGraph: () => ipcRenderer.invoke('refresh-project-graph'),

    // 保存设置
    saveSettings: (settings: GlobalSettings) => ipcRenderer.invoke('save-settings', settings)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    window.electron = electronAPI
    // @ts-ignore (define in dts)
    window.api = api
}
