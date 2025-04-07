import React, { useRef, useEffect, useCallback } from 'react'
import * as monaco from 'monaco-editor'

interface MonacoEditorProps {
    width?: string
    height?: string
    value?: string
    language?: string
}

const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }
}

// 创建样式元素
const createStyleElement = () => {
    const style = document.createElement('style')
    style.textContent = `
    /* 为 #> 行设置深蓝色字体 */
    .agl-line-text-inline {
        color: #2E5D87 !important; /* 深蓝色 */
    }

    /* 光标所在行的背景样式 */
    .agl-line-background {
        background: rgba(0, 180, 216, 0.1) !important;
        border-left: 3px solid #00B4D8;
        margin-left: -4px;
        box-decoration-break: clone;
        width: calc(100% + 8px) !important;
    }

    /* 高光动画 */
    @keyframes highlight-flow {
        0% {
            background-position: -100% 0;
        }
        100% {
            background-position: 200% 0;
        }
    }

    .agl-line-highlight-flow {
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
        background-size: 200% 100%;
        animation: highlight-flow 2s linear infinite;
    }
    `
    return style
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
    width = '100vw',
    height = '100vh',
    value = '',
    language = 'python'
}) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const monacoInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
    const decorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
    const cursorDecoration = useRef<string | null>(null)
    const styleElement = useRef<HTMLStyleElement | null>(null)

    useEffect(() => {
        styleElement.current = createStyleElement()
        document.head.appendChild(styleElement.current)
        return () => {
            if (styleElement.current) {
                document.head.removeChild(styleElement.current)
            }
        }
    }, [])

    const updateDecorations = useCallback(() => {
        if (!monacoInstance.current) return
        const model = monacoInstance.current.getModel()
        if (!model) return

        const matches = model.findMatches('^\\s*#>.*$', false, true, false, null, true)

        const newDecorations = matches.map((match) => {
            const line = match.range.startLineNumber
            const maxColumn = model.getLineMaxColumn(line)
            return {
                range: new monaco.Range(line, 1, line, maxColumn),
                options: {
                    inlineClassName: 'agl-line-text-inline',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            }
        })

        decorations.current?.clear()
        decorations.current = monacoInstance.current.createDecorationsCollection(newDecorations)
    }, [])

    const updateCursorLineDecoration = useCallback(() => {
        if (!monacoInstance.current) return
        const position = monacoInstance.current.getPosition()
        if (!position) return

        const lineNumber = position.lineNumber
        const model = monacoInstance.current.getModel()
        if (!model) return

        const lineContent = model.getLineContent(lineNumber)
        if (/^\s*#>/.test(lineContent)) {
            const maxColumn = model.getLineMaxColumn(lineNumber)
            const decoration = {
                range: new monaco.Range(lineNumber, 1, lineNumber, maxColumn),
                options: {
                    className: 'agl-line-background agl-line-highlight-flow',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            }
            if (cursorDecoration.current) {
                monacoInstance.current.deltaDecorations([cursorDecoration.current], [])
            }
            const newDecorationIds = monacoInstance.current.deltaDecorations([], [decoration])
            cursorDecoration.current = newDecorationIds[0]
        } else {
            if (cursorDecoration.current) {
                monacoInstance.current.deltaDecorations([cursorDecoration.current], [])
                cursorDecoration.current = null
            }
        }
    }, [])

    useEffect(() => {
        const container = editorRef.current
        if (!container) return

        monacoInstance.current = monaco.editor.create(container, {
            value,
            language,
            theme: 'hc-light',
            automaticLayout: true,
            minimap: {
                enabled: false // 禁用迷你地图
            },
            guides: {
                indentation: false,
                bracketPairs: false
            },
            stickyScroll: {
                enabled: false
            },
            codeLens: true,
            renderLineHighlight: 'none',
            matchBrackets: 'near',
            folding: true,
            showFoldingControls: 'mouseover',
            scrollBeyondLastLine: false,
            smoothScrolling: true
        })

        const debouncedUpdate = debounce(updateDecorations, 30)
        const disposables = [
            monacoInstance.current.onDidChangeModelContent(debouncedUpdate),
            monacoInstance.current.onDidChangeCursorPosition(updateCursorLineDecoration)
        ]

        updateDecorations()
        updateCursorLineDecoration()

        return () => {
            disposables.forEach((d) => d.dispose())
            if (cursorDecoration.current) {
                monacoInstance.current?.deltaDecorations([cursorDecoration.current], [])
            }
            monacoInstance.current?.dispose()
        }
    }, [updateDecorations, updateCursorLineDecoration, value, language])

    return <div ref={editorRef} style={{ width, height, overflow: 'hidden' }} />
}

export default MonacoEditor
