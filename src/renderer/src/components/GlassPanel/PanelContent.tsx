import { useState, useEffect, useRef, ReactElement, useCallback } from 'react'
import mermaid from 'mermaid'
import { FileTree, Tooltip } from './FileTree'
import { ProjectSummary } from '../../../../types/graph'
import { useSettingsStore } from '../../stores/settingsStore'

interface PanelContentProps {
  projectSummary: ProjectSummary
  onClose: () => void
  onFileSelect: (path: string) => void
}

const translations = {
  zh: {
    moduleInfo: '模块信息中心',
    functionDescription: '功能描述',
    fileStructure: '文件架构',
    clickPrompt: '点击左侧模块查看详细信息',
    noDescription: '暂无描述'
  },
  en: {
    moduleInfo: 'Module Information Center',
    functionDescription: 'Functional Description',
    fileStructure: 'File Structure',
    clickPrompt: 'Click on a module to view details',
    noDescription: 'No description available'
  }
}

const PanelContent = ({
                        projectSummary,
                        onClose,
                        onFileSelect
                      }: PanelContentProps): ReactElement => {
  const { settings } = useSettingsStore()
  const currentLang = settings.languages === 'zh' ? 'zh' : 'en'

  const [currentProjectSummary, setCurrentProjectSummary] = useState(projectSummary)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedModule, setSelectedModule] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('selectedModule') || '' : ''
  )
  const [svgCode, setSvgCode] = useState('')
  const [tooltipContent, setTooltipContent] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragStartPosition = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setCurrentProjectSummary(projectSummary)
  }, [projectSummary])

  const renderDiagram = useCallback(async (): Promise<void> => {
    try {
      const { svg } = await mermaid.render('mermaid-graph', currentProjectSummary.graph)
      setSvgCode(svg)
    } catch (err) {
      console.error('Mermaid 渲染失败:', err)
    }
  }, [currentProjectSummary.graph])

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      flowchart: { htmlLabels: true, useMaxWidth: true },
      themeVariables: { edgeLabelBackground: '#ffffff00' },
      themeCSS: `
                g.edgeLabel rect, g.edgeLabel foreignObject > div {
                    background-color: transparent !important;
                }
                svg {
                    max-width: 100%;
                    height: auto !important;
                }
                g.node { cursor: pointer; pointer-events: auto; }
            `
    })
    renderDiagram()
  }, [renderDiagram])

  const handleRefresh = async (): Promise<void> => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      const newSummary = await window.api.refreshProjectGraph()
      setCurrentProjectSummary(newSummary)
    } catch (error) {
      console.error('刷新项目图失败:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleWheel = (event: WheelEvent): void => {
    event.preventDefault()
    setScale((prev) => Math.min(Math.max(prev - event.deltaY * 0.02, 0.5), 3))
  }

  const handleMouseDown = (event: React.MouseEvent): void => {
    const target = event.target as Element
    if (target.closest('g.node')) return
    setIsDragging(true)
    dragStart.current = { x: event.clientX - translate.x, y: event.clientY - translate.y }
    dragStartPosition.current = { x: event.clientX, y: event.clientY }
  }

  const handleMouseMove = (event: React.MouseEvent): void => {
    if (!isDragging) return
    setTranslate({
      x: event.clientX - dragStart.current.x,
      y: event.clientY - dragStart.current.y
    })
  }

  const handleMouseUp = (event: React.MouseEvent): void => {
    const dx = event.clientX - dragStartPosition.current.x
    const dy = event.clientY - dragStartPosition.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 5) {
      const target = event.target as Element
      const nodeElement = target.closest('g.node')

      if (nodeElement) {
        const textElements = nodeElement.querySelectorAll('p')
        let moduleName = ''
        textElements.forEach((textEl) => {
          const text = textEl.textContent?.trim()
          if (text && !moduleName) {
            const found = currentProjectSummary.moduleConfigs.find(
              (m) => m.name === text
            )
            if (found) moduleName = text
          }
        })
        if (moduleName) {
          localStorage.setItem('selectedModule', moduleName)
          setSelectedModule(moduleName)
        }
      }
    }
    setIsDragging(false)
  }

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
    }
    return (): void => {
      if (container) {
        container.removeEventListener('wheel', handleWheel)
      }
    }
  }, [])

  return (
    <div className="flex h-full relative">
      <Tooltip content={tooltipContent} visible={!!tooltipContent} />

      {/* 刷新按钮 */}
      <button
        className={`absolute bottom-6 right-6 z-20 ${
          isRefreshing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        } text-gray-500 hover:text-gray-800 transition-colors`}
        onClick={handleRefresh}
        disabled={isRefreshing}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0
        }}
      >
        <svg
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 4v5h-.582m-15.356 2A8.001 8.001 0 0119.418 9m0 0H15m-11 11v-5h.581m0 0a8.003 8.003 0 0015.357-2m-15.357 2H9"
          />
        </svg>
      </button>

      <div
        className="flex-7 relative overflow-hidden"
        style={{ flex: 7, height: 'calc(100vh - 80px)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={containerRef}
          className="h-full w-full p-4 flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center'
          }}
          dangerouslySetInnerHTML={{ __html: svgCode }}
        />
      </div>
      <div className="flex-3 p-6 overflow-y-auto backdrop-blur-lg bg-transparent">
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-black tracking-wide">
            {selectedModule || translations[currentLang].moduleInfo}
          </h2>
          {selectedModule ? (
            <div className="space-y-8 animate-fadeIn">
              <div className="p-5 rounded-xl bg-white/10 ring-1 ring-white/20">
                <h3 className="text-sm font-semibold text-black">
                  {translations[currentLang].functionDescription}
                </h3>
                <p className="text-gray-800">
                  {currentProjectSummary.moduleConfigs.find(
                      (m) => m.name === selectedModule
                    )?.description?.[currentLang] ||
                    translations[currentLang].noDescription}
                </p>
              </div>
              <div className="pt-6 pl-5">
                <h3 className="text-sm font-semibold text-black">
                  {translations[currentLang].fileStructure}
                </h3>
                <div className="rounded-lg bg-white/10 border border-white/20">
                  <FileTree
                    data={
                      currentProjectSummary.moduleConfigs.find(
                        (m) => m.name === selectedModule
                      )?.fileTree || []
                    }
                    onHover={setTooltipContent}
                    onLeave={() => setTooltipContent(null)}
                    onFileSelect={(path) => {
                      onClose()
                      onFileSelect(path)
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">
              {translations[currentLang].clickPrompt}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default PanelContent
