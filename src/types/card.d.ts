export type FileItem = {
    name: string
    type: 'file' | 'folder'
    description?: string
    items?: FileItem[]
}

export interface ModuleCard {
    id: number
    title: string
    description: string
    structure: FileItem[]
    children?: ModuleCard[]
}

export interface DraggableCardProps {
    card: ModuleCard
    containerRef: React.RefObject<HTMLDivElement | null>
    index: number
    onCardClick: (card: ModuleCard) => void
    isActive: boolean
    initialPosition?: { x: number; y: number }
    onPositionChange: (position: { x: number; y: number }) => void
}

export type PositionMap = {
    [key: string]: { x: number; y: number }
}
