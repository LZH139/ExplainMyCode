import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Landing from './pages/Landing/Landing'
import Editor from './pages/Editor/Editor'
import Loading from './pages/Loading/Loading'
import type { ReactElement } from 'react'

const variants = {
    hidden: { opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } },
    visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } }
}

// 可复用的动画包裹组件
const PageWrapper = ({ children }: { children: React.ReactNode }): ReactElement => (
    <motion.div
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        style={{ width: '100%', minHeight: '100vh' }}
    >
        {children}
    </motion.div>
)

// 动画路由组件
function AnimatedRoutes(): ReactElement {
    const location = useLocation()

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route
                    path="/"
                    element={
                        <PageWrapper>
                            <Landing />
                        </PageWrapper>
                    }
                />
                <Route
                    path="/loading"
                    element={
                        <PageWrapper>
                            <Loading />
                        </PageWrapper>
                    }
                />
                <Route
                    path="/editor"
                    element={
                        <PageWrapper>
                            <Editor />
                        </PageWrapper>
                    }
                />
            </Routes>
        </AnimatePresence>
    )
}

// 主组件
function App(): ReactElement {
    return <AnimatedRoutes />
}

export default App
