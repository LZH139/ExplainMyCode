// MarkdownEditor.tsx
import { useState, useEffect, useRef } from 'react'
import { EditorProvider } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import { motion } from 'framer-motion'
import './MarkdownEditor.css'

interface MarkdownEditorProps {
    content: string
}

const MarkdownEditor = ({ content }: MarkdownEditorProps) => {
    // 接收 content prop
    // ...保持其他代码不变...
    const [isHovered, setIsHovered] = useState(false)
    const [isFixed, setIsFixed] = useState(false)
    const editorRef = useRef<HTMLDivElement>(null)

    const extensions = [
        StarterKit,
        Markdown.configure({
            html: false,
            transformCopiedText: true,
            bulletListMarker: '*'
        })
    ]

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
                setIsFixed(false)
                setIsHovered(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <motion.div
            ref={editorRef}
            className="markdown-editor"
            initial={{
                x: 'calc(100% - 50px)',
                y: 'calc(100% - 50px)'
            }}
            animate={{
                x: isHovered || isFixed ? 0 : 'calc(100% - 50px)',
                y: isHovered || isFixed ? 0 : 'calc(100% - 50px)'
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onMouseLeave={() => !isFixed && setIsHovered(false)}
            onClick={() => !isFixed && setIsFixed(true)}
        >
            {/* 触发热区 */}
            <div
                className="trigger-area"
                onMouseEnter={() => setIsHovered(true)}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '50px',
                    height: '50px',
                    pointerEvents: isFixed || isHovered ? 'none' : 'auto',
                    cursor: 'pointer',
                    zIndex: 20
                }}
            />

            <EditorProvider
                extensions={extensions}
                content={content}
                editorProps={{
                    attributes: {
                        class: 'md-editor'
                    }
                }}
                editorContainerProps={{
                    className: 'editor-container'
                }}
            />
        </motion.div>
    )
}

export default MarkdownEditor
