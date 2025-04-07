import { useState, useEffect, useRef } from 'react'
import type { FileTreeItem } from '../../../../types/graph'
import type { ReactElement } from 'react'

// FileTree 组件 Props 类型
export interface FileTreeProps {
    data: FileTreeItem[]
    level?: number
    onHover?: (content: string) => void
    onLeave?: () => void
    onFileSelect: (path: string) => void
}

// Tooltip 组件 Props 类型
interface TooltipProps {
    content: string | null
    visible: boolean
}

export const FileTree = ({
    data,
    level = 0,
    onHover,
    onLeave,
    onFileSelect
}: FileTreeProps): ReactElement => (
    <div className={`space-y-1 ${level ? 'pl-4' : ''}`}>
        {data.map((item, index) => (
            <div key={index}>
                <div
                    className="flex items-center hover:bg-gray-200/30 rounded px-2 py-1 transition-colors cursor-pointer relative group"
                    onMouseEnter={() => onHover?.(item.description)}
                    onMouseLeave={onLeave}
                    onClick={() => {
                        if (item.type === 'file') {
                            onFileSelect?.(item.path)
                        }
                    }}
                >
                    <span className="mr-2 text-gray-600">
                        {item.type === 'directory' ? '📁' : '📄'}
                    </span>
                    <span className="text-sm text-black font-mono">{item.name}</span>
                </div>
                {item.children && (
                    <FileTree
                        data={item.children}
                        level={level + 1}
                        onHover={onHover}
                        onLeave={onLeave}
                        onFileSelect={onFileSelect}
                    />
                )}
            </div>
        ))}
    </div>
)

export const Tooltip = ({ content, visible }: TooltipProps): ReactElement => {
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const tooltipRef = useRef<HTMLDivElement>(null)

    useEffect((): (() => void) => {
        const handleMouseMove = (e: MouseEvent): void => {
            if (visible && tooltipRef.current) {
                const offset = 10
                const maxX = window.innerWidth - tooltipRef.current.offsetWidth - offset
                const maxY = window.innerHeight - tooltipRef.current.offsetHeight - offset

                setPosition({
                    x: Math.min(e.clientX + offset, maxX),
                    y: Math.min(e.clientY + offset, maxY)
                })
            }
        }

        window.addEventListener('mousemove', handleMouseMove)
        return (): void => window.removeEventListener('mousemove', handleMouseMove)
    }, [visible])

    return (
        <div
            ref={tooltipRef}
            className={`absolute p-3 border border-gray-300 rounded-xl text-sm max-w-sm text-black z-50 ${
                visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`
            }}
        >
            {content}
        </div>
    )
}
