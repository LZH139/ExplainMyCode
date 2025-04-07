import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import FileTree from '../../components/FileTree/FileTree'
import MonacoEditor from '../../components/MonacoEditor/MonacoEditor'
import { FileNode } from '../../../../types/file'
import { getLanguage } from '../../components/Common/languageUtils'
import './Editor.css'
import GlassPanel from '../../components/GlassPanel/GlassPanel'
import { useStore } from '../../stores/editorStore'
import MarkdownEditor from '../../components/MarkdownEditor/MarkdownEditor'
import { ProjectSummary } from '../../../../types/graph'

const Editor = () => {
    const { state } = useLocation()
    const { currentFile, setCurrentFile, AGLMode, setAGLMode } = useStore()
    const fileData = state?.fileTree || []

    const [mdContent, setMdContent] = useState('# Select a file to view documentation')
    const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(null)

    useEffect(() => {
        const loadProjectSummary = async () => {
            try {
                const summary = await window.api.getProjectGraph()
                setProjectSummary(summary)
            } catch (error) {
                console.error('Failed to load project summary:', error)
                setProjectSummary({
                    path: '/default/path',
                    graph: 'graph TD\nA[Error] --> B[Failed to load data]',
                    moduleConfigs: []
                })
            }
        }
        loadProjectSummary()
    }, [])

    const findFileNode = (nodes: FileNode[], id: string): FileNode | undefined => {
        for (const node of nodes) {
            if (node.id === id) return node
            if (node.children) {
                const found = findFileNode(node.children, id)
                if (found) return found
            }
        }
        return undefined
    }

    const fetchFileContent = async (fileId: string, aglMode: boolean) => {
        const fileNode = findFileNode([fileData], fileId)
        if (!fileNode?.isLeaf) return

        try {
            const fileResult = await window.api.getFileByPath(fileNode.path)
            const content = aglMode ? fileResult.contentWithAgl : fileResult.rawContent

            // Update both states in sequence
            setCurrentFile({
                id: fileNode.id,
                content,
                language: getLanguage(fileNode.name)
            })

            // Update markdown based on aglMode
            if (aglMode) {
                const markdown = fileResult.overview?.markdown || '# No documentation available'
                setMdContent(markdown)
            } else {
                setMdContent('# Select a file to view documentation')
            }
        } catch (error) {
            console.error('Error loading file:', error)
            setCurrentFile(null)
            setMdContent('# Error loading documentation')
        }
    }

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') {
                event.preventDefault()
                setAGLMode(!AGLMode)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [AGLMode])

    useEffect(() => {
        if (currentFile) fetchFileContent(currentFile.id, AGLMode)
    }, [AGLMode])

    return (
        <div className="editor-container">
            <div className="file-tree-wrapper">
                <FileTree
                    data={[fileData]}
                    onFileSelect={(id) => fetchFileContent(id, AGLMode)}
                    selectedPath={currentFile?.id}
                />
            </div>

            <div className="editor-content">
                {currentFile ? (
                    <MonacoEditor
                        key={`${currentFile.id}-${AGLMode}`}
                        value={currentFile.content}
                        language={currentFile.language}
                    />
                ) : (
                    <div className="editor-placeholder"></div>
                )}
            </div>

            {AGLMode && (
                <>
                    <MarkdownEditor
                        content={mdContent}
                        key={`markdown-${currentFile?.id}-${mdContent.substring(0, 20)}`}
                    />
                    {projectSummary && (
                        <GlassPanel
                            projectSummary={projectSummary}
                            onFileSelect={(id) => fetchFileContent(id, AGLMode)}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default Editor
