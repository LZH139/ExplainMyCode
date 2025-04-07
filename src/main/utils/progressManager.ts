// main/utils/progressManager.ts
import { WebContents } from 'electron'
import { FileNode } from '../../types/file'

export class ProgressManager {
    private totalFiles: number
    private processedFiles = 0

    constructor(
        private readonly sender: WebContents, // 修改为 WebContents 类型
        totalFiles: number
    ) {
        this.totalFiles = Math.max(totalFiles, 1)
    }

    updateProgress(fileName: string) {
        this.processedFiles++
        const progress = Math.floor((this.processedFiles / this.totalFiles) * 100)

        console.log(`Processing ${fileName} (${this.processedFiles}/${this.totalFiles})`)
        this.sender.send('progress-update', progress)
    }

    // 新增完成方法，发送文件树数据
    complete(fileTree: FileNode) {
        this.sender.send('progress-update', 100)
        this.sender.send('progress-complete', { fileTree })
    }

    static create(sender: WebContents, totalFiles: number) {
        // 修改参数类型
        return new ProgressManager(sender, totalFiles)
    }
}
