// editorStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface StoreState {
    panelOpen: boolean
    panelDimensions: { width: number; height: number }
    panelOpacity: number
    currentFile: { id: string; content: string; language: string } | null
    AGLMode: boolean // 新增状态
    setCurrentFile: (file: { id: string; content: string; language: string } | null) => void
    togglePanel: () => void
    setPanelDimensions: (dimensions: { width: number; height: number }) => void
    setPanelOpacity: (opacity: number) => void
    toggleMode: () => void // 新增方法
    setAGLMode: (mode: boolean) => void // 新增方法
}

export const useStore = create<StoreState>()(
    persist(
        (set) => ({
            panelOpen: false,
            panelDimensions: { width: 140, height: 48 },
            panelOpacity: 0,
            currentFile: null,
            AGLMode: false, // 初始化状态
            setCurrentFile: (file) => set({ currentFile: file }),
            togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
            setPanelDimensions: (dimensions) => set({ panelDimensions: dimensions }),
            setPanelOpacity: (opacity) => set({ panelOpacity: opacity }),
            toggleMode: () => set((state) => ({ AGLMode: !state.AGLMode })),
            setAGLMode: (mode) => set({ AGLMode: mode })
        }),
        {
            name: 'editor-storage',
            partialize: (state) => ({
                panelOpen: state.panelOpen,
                panelDimensions: state.panelDimensions,
                AGLMode: state.AGLMode // 持久化模式状态
            })
        }
    )
)
