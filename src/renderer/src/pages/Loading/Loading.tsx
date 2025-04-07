import './Loading.css'
import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FileNode } from '../../../../types/file'

const Loading = () => {
    const [progress, setProgress] = useState(0)
    const navigate = useNavigate()
    const location = useLocation()

    // 使用ref存储事件处理器引用
    const handlers = useRef<{
        update?: (event: unknown, progress: number) => void
        complete?: (event: unknown, data: { fileTree: FileNode }) => void
    }>({})

    // 使用ref存储filepath是否已执行过
    const filepathExecuted = useRef(false)

    useEffect(() => {
        const filepath = location.state?.filepath

        if (filepath && !filepathExecuted.current) {
            filepathExecuted.current = true
            window.api.initProject(filepath)
        }

        // 先移除旧的监听器
        if (handlers.current.update) {
            window.api.removeProgressUpdateListener(handlers.current.update)
        }
        if (handlers.current.complete) {
            window.api.removeProgressCompleteListener(handlers.current.complete)
        }

        // 定义新的处理器
        const updateHandler = (_: unknown, progress: number) => {
            setProgress(progress)
        }

        const completeHandler = (_: unknown, data: { fileTree: FileNode }) => {
            // 导航前自动移除监听器
            window.api.removeProgressUpdateListener(updateHandler)
            window.api.removeProgressCompleteListener(completeHandler)
            navigate('/editor', { state: { fileTree: data.fileTree } })
        }

        // 存储到ref
        handlers.current = { update: updateHandler, complete: completeHandler }

        // 注册新监听器
        window.api.onProgressUpdate(updateHandler)
        window.api.onProgressComplete(completeHandler)

        return () => {
            // 清理时使用ref中的引用
            if (handlers.current.update) {
                window.api.removeProgressUpdateListener(handlers.current.update)
            }
            if (handlers.current.complete) {
                window.api.removeProgressCompleteListener(handlers.current.complete)
            }
        }
        // 优化依赖数组，只在filepath变化时重新绑定
    }, [navigate, location.state?.filepath])

    return (
        <div className="loading-container">
            <div className="progress-bar">
                <div
                    className="progress"
                    style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}
                />
            </div>
            <div className="progress-text">{progress}%</div>
        </div>
    )
}

export default Loading
