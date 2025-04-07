import * as monaco from 'monaco-editor'
import { MutableRefObject, useEffect } from 'react'

type EditorInstanceRef = MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>

const IMPORT_PATTERNS = [
    /^\s*import\s+.*/,
    /^\s*from\s+[\w.]+\s+import/,
    /^\s*import\s*{/,
    /^\s*export\s+default\s+/
]

const useFoldImports = (editorRef: EditorInstanceRef) => {
    useEffect(() => {
        const editor = editorRef.current
        if (!editor) return

        const model = editor.getModel()
        if (!model) return

        // 检测 import 代码块的函数
        const detectImportBlocks = () => {
            const importBlocks: monaco.languages.FoldingRange[] = []
            let inImportBlock = false
            let startLine = 0
            let lastImportLine = 0

            for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
                const lineContent = model.getLineContent(lineNumber).trim()
                const isImportLine = IMPORT_PATTERNS.some((pattern) => pattern.test(lineContent))
                const isEmptyLine = lineContent === ''

                if (isImportLine) {
                    if (!inImportBlock) {
                        inImportBlock = true
                        startLine = lineNumber
                    }
                    lastImportLine = lineNumber // 记录 import 语句的最后一行
                } else if (!isEmptyLine && inImportBlock) {
                    // 发现第一个非 import 语句且非空行，则结束折叠块
                    importBlocks.push({
                        start: startLine,
                        end: lastImportLine, // 只折叠 import 语句，不包含空行
                        kind: monaco.languages.FoldingRangeKind.Imports
                    })
                    inImportBlock = false
                }
            }

            // 处理 import 在文件末尾的情况
            if (inImportBlock) {
                importBlocks.push({
                    start: startLine,
                    end: lastImportLine,
                    kind: monaco.languages.FoldingRangeKind.Imports
                })
            }

            return importBlocks
        }

        // 注册折叠提供程序
        const updateFolding = () => {
            const foldingProvider: monaco.languages.FoldingRangeProvider = {
                provideFoldingRanges: () => detectImportBlocks()
            }

            const disposable = monaco.languages.registerFoldingRangeProvider(
                model.getLanguageId(),
                foldingProvider
            )

            // 触发折叠
            editor.trigger('fold', 'editor.foldAll', {})

            return disposable
        }

        let disposable: monaco.IDisposable | undefined

        // 初始化折叠
        const timeoutId = setTimeout(() => {
            disposable = updateFolding()
        }, 500)

        // 监听内容变化
        const changeDisposable = model.onDidChangeContent(() => {
            disposable?.dispose()
            disposable = updateFolding()
        })

        return () => {
            clearTimeout(timeoutId)
            changeDisposable.dispose()
            disposable?.dispose()
        }
    }, [editorRef])
}

export default useFoldImports
