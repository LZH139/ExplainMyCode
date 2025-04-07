//DropZone.tsx
import { useState, useCallback, ReactElement } from 'react'
import './DropZone.css'

interface DropZoneProps {
    onDrop: (filepath: string) => void
    children?: React.ReactNode
}

function DropZone({ onDrop }: DropZoneProps): ReactElement {
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState('')

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
        setError('')
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragging(false)

            const items = e.dataTransfer.items
            if (!items.length) return

            const entry = items[0].webkitGetAsEntry()
            if (!entry?.isDirectory) {
                setError('请拖入文件夹而不是单个文件')
                return
            }

            const file = e.dataTransfer.files[0]
            if (!file) return

            try {
                const filePath = await window.api.getFilePath(file)
                console.log(filePath)
                onDrop(filePath)
            } catch (err) {
                console.error('文件夹读取失败:', err)
                setError('文件夹读取失败，请重试')
            }
        },
        [onDrop]
    )

    return (
        <div
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <p className="drop-zone-text">
                {error || (isDragging ? '释放以打开项目' : '拖入项目文件夹')}
            </p>
        </div>
    )
}

export default DropZone
