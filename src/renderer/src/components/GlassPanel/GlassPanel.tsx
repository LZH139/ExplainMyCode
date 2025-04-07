// GlassPanel.tsx
import { ReactElement, useState } from 'react'
import { motion } from 'framer-motion'
import { PANEL_PADDING, BUTTON_SIZE } from '../../constants/glassPanel'
import './GlassPanel.css'
import PanelContent from './PanelContent'
import { ProjectSummary } from '../../../../types/graph' // 导入类型

interface GlassPanelProps {
    projectSummary: ProjectSummary
    onFileSelect: (path: string) => void
}

const transition = {
    type: 'spring',
    stiffness: 300,
    damping: 30
}

const sizeVariants = {
    closed: {
        width: BUTTON_SIZE.width,
        height: BUTTON_SIZE.height,
        transition
    },
    open: {
        width: `calc(100vw - ${PANEL_PADDING * 2}px)`,
        height: `calc(100vh - ${PANEL_PADDING * 2}px)`,
        transition
    }
}

const GlassPanel = ({ projectSummary, onFileSelect }: GlassPanelProps): ReactElement => {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div
            className="fixed z-50"
            style={{
                top: PANEL_PADDING,
                right: PANEL_PADDING
            }}
        >
            <motion.div
                className="relative backdrop-blur-lg bg-white/10 rounded-lg shadow-lg overflow-hidden"
                style={{ transformOrigin: 'top right' }}
                variants={sizeVariants}
                initial={false}
                animate={isOpen ? 'open' : 'closed'}
            >
                {!isOpen ? (
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center cursor-pointer"
                        onClick={() => setIsOpen(true)}
                    >
                        <span className="text-black">Graph</span>
                    </motion.div>
                ) : (
                    <>
                        <div className="absolute top-2 left-4 text-sm opacity-80">Graph</div>

                        <div
                            className="absolute right-2 top-2 w-6 h-6 flex items-center justify-center
                                bg-white/20 rounded-full hover:bg-white/30 transition-colors z-50
                                cursor-pointer"
                            onClick={() => setIsOpen(false)}
                        >
                            ×
                        </div>

                        <motion.div
                            className="absolute inset-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <PanelContent
                                projectSummary={projectSummary}
                                onClose={() => setIsOpen(false)}
                                onFileSelect={(path) => {
                                    setIsOpen(false)
                                    onFileSelect(path)
                                }}
                            />
                        </motion.div>
                    </>
                )}
            </motion.div>
        </div>
    )
}

export default GlassPanel
