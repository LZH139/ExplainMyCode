'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.ProgressManager = void 0
class ProgressManager {
    constructor(
        sender, // 修改为 WebContents 类型
        totalFiles
    ) {
        this.sender = sender
        this.processedFiles = 0
        this.totalFiles = Math.max(totalFiles, 1)
    }
    updateProgress(fileName) {
        this.processedFiles++
        const progress = Math.floor((this.processedFiles / this.totalFiles) * 100)
        console.log(`Processing ${fileName} (${this.processedFiles}/${this.totalFiles})`)
        this.sender.send('progress-update', progress)
    }
    // 新增完成方法，发送文件树数据
    complete(fileTree) {
        this.sender.send('progress-update', 100)
        this.sender.send('progress-complete', { fileTree })
    }
    static create(sender, totalFiles) {
        return new ProgressManager(sender, totalFiles)
    }
}
exports.ProgressManager = ProgressManager
//# sourceMappingURL=progressManager.js.map
