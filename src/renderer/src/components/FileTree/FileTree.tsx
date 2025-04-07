import { Tree } from 'react-arborist'
import { FiFile, FiFolder, FiChevronRight, FiChevronDown } from 'react-icons/fi'
import type { NodeRendererProps, TreeApi } from 'react-arborist'
import { FileNode } from '../../../../types/file'
import './FileTree.css'
import { ReactElement, useEffect, useRef } from 'react'

// 单个节点的渲染
const Node = ({ node, style }: NodeRendererProps<FileNode>): ReactElement => {
    const isDirectory = node.data.isDirectory

    return (
        <div
            className={`tree-node ${node.isSelected ? 'selected' : ''}`}
            style={{ ...style, paddingLeft: `${node.level * 16}px` }}
            onClick={() => node.toggle()}
        >
            <div className="arrow-container">
                {isDirectory &&
                    (node.isOpen ? (
                        <FiChevronDown className="arrow-icon" />
                    ) : (
                        <FiChevronRight className="arrow-icon" />
                    ))}
            </div>

            <div className="icon-container">
                {isDirectory ? (
                    <FiFolder className="folder-icon" />
                ) : (
                    <FiFile className="file-icon" />
                )}
            </div>

            <span className="node-text">{node.data.name}</span>
        </div>
    )
}

interface FileTreeProps {
    data: FileNode[]
    onFileSelect?: (id: string) => void
    selectedPath?: string
}

const sortData = (data: FileNode[]): FileNode[] => {
    return data
        .sort((a, b) => {
            if (a.isLeaf && !b.isLeaf) return 1
            if (!a.isLeaf && b.isLeaf) return -1
            return a.name.localeCompare(b.name)
        })
        .map((node) => {
            if (node.children) {
                node.children = sortData(node.children)
            }
            return node
        })
}

const FileTree = ({ data, onFileSelect, selectedPath }: FileTreeProps): ReactElement => {
    const treeRef = useRef<TreeApi<FileNode> | null>(null)

    useEffect(() => {
        if (treeRef.current && selectedPath) {
            treeRef.current.select(selectedPath)
        }
    }, [selectedPath])

    return (
        <div className="file-tree-container">
            <Tree
                ref={treeRef}
                data={sortData(data)}
                idAccessor="id"
                openByDefault={false}
                width="100%"
                height={window.innerHeight}
                rowHeight={28}
                indent={16}
                padding={4}
                onSelect={(nodes) => {
                    const selectedId = nodes[0]?.data.id
                    onFileSelect?.(selectedId)
                }}
            >
                {Node}
            </Tree>
        </div>
    )
}

export default FileTree
