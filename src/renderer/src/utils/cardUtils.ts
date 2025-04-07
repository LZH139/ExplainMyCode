import { ModuleCard } from '../../../types/card'
import { CARD_SIZE } from '../constants/glassPanel'
import { useState } from 'react'

export const useLongPress = (onLongPress: () => void, onClick: () => void, delay = 500) => {
    const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)
    const [isLongPress, setIsLongPress] = useState(false)

    const start = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        setIsLongPress(false)
        setTimer(
            setTimeout(() => {
                setIsLongPress(true)
                onLongPress()
            }, delay)
        )
    }

    const end = () => {
        if (timer) clearTimeout(timer)
        if (!isLongPress) onClick()
        setIsLongPress(false)
    }

    return { onMouseDown: start, onTouchStart: start, onMouseUp: end, onTouchEnd: end }
}

export const calculateInitialPosition = (
    index: number,
    total: number,
    containerWidth: number,
    containerHeight: number
): { x: number; y: number } => {
    const { width: cardWidth, height: cardHeight } = CARD_SIZE
    const padding = 20
    let x = 0,
        y = 0

    if (total === 1) {
        // 单个卡片居中
        x = (containerWidth - cardWidth) / 2
        y = (containerHeight - 2 * cardHeight) / 2
    } else if (total === 2) {
        // 左右分布
        x =
            index === 0
                ? containerWidth * 0.25 - cardWidth / 2
                : containerWidth * 0.75 - cardWidth / 2
        y = (containerHeight - 2 * cardHeight) / 2
    } else if (total === 3) {
        // 三角形布局
        const centerX = containerWidth / 2
        const centerY = containerHeight / 2
        const radius = Math.min(containerWidth, containerHeight) * 0.3
        const angles = [-90, 150, 30].map((deg) => (deg * Math.PI) / 180)
        x = centerX + Math.cos(angles[index]) * radius - cardWidth / 2
        y = centerY + Math.sin(angles[index]) * radius - cardHeight / 2
    } else if (total === 4) {
        // 四象限布局
        const col = index % 2
        const row = Math.floor(index / 2)
        x = (containerWidth * (col + 1)) / 3 - cardWidth / 2
        y = (containerHeight * (row + 1)) / 3 - cardHeight / 2
    } else if (total === 5) {
        // 五芒星布局
        const centerX = containerWidth / 2
        const centerY = containerHeight / 2
        const radius = Math.min(containerWidth, containerHeight) * 0.3
        const angle = (-90 + index * 72) * (Math.PI / 180)
        x = centerX + Math.cos(angle) * radius - cardWidth / 2
        y = centerY + Math.sin(angle) * radius - cardHeight / 2
    } else {
        // 平铺布局：从中间向上下扩展
        const perRow = Math.floor((containerWidth + padding) / (cardWidth + padding)) || 1
        const rowIndex = Math.floor(index / perRow)

        // 计算行号（0, -1, 1, -2, 2...）
        let rowNumber = 0
        if (rowIndex > 0) {
            const group = Math.ceil(rowIndex / 2)
            const isNegative = rowIndex % 2 === 1
            rowNumber = isNegative ? -group : group
        }

        // 计算当前行的卡片数量
        const start = rowIndex * perRow
        const end = Math.min(start + perRow, total)
        const numInRow = end - start

        // 水平居中
        const col = index % perRow
        const totalWidth = numInRow * cardWidth + (numInRow - 1) * padding
        x = col * (cardWidth + padding) + (containerWidth - totalWidth) / 2

        // 垂直居中并扩展
        const baseY = (containerHeight - cardHeight) / 2
        y = baseY + rowNumber * (cardHeight + padding)
    }

    return { x, y }
}

export const getCardKey = (card: ModuleCard, moduleStack: ModuleCard[]) => {
    const path = moduleStack.map((m) => m.id).join('-')
    return `${path}-${card.id}`
}
