// src/utils/fileUtils.ts

import { FileNode } from '../../../types/file'

export const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string) // this will now return plain text content
        reader.onerror = reject
        reader.readAsText(file) // Use readAsText if the file is text-based
    })
}

export const processDirectoryEntry = async (
    entry: FileSystemDirectoryEntry,
    path = ''
): Promise<FileNode> => {
    const node: FileNode = {
        id: path + entry.name,
        name: entry.name,
        path: path + entry.name,
        isDirectory: true,
        children: [],
        isLeaf: false // 初始为false，处理子节点后调整
    }

    const reader = entry.createReader()
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject)
    })

    for (const entry of entries) {
        if (entry.isDirectory) {
            const childNode = await processDirectoryEntry(
                entry as FileSystemDirectoryEntry,
                `${node.path}/`
            )
            node.children?.push(childNode)
        } else {
            const file = await new Promise<File>((resolve, reject) => {
                ;(entry as FileSystemFileEntry).file(resolve, reject)
            })
            const content = await readFileContent(file)
            node.children?.push({
                id: `${node.path}/${entry.name}`,
                name: entry.name,
                path: `${node.path}/${entry.name}`,
                isDirectory: false,
                content: content,
                children: [],
                isLeaf: true // 文件节点为叶子节点
            })
        }
    }

    // 处理完子节点后，设置目录是否为叶子节点
    node.isLeaf = node.children.length === 0

    return node
}
