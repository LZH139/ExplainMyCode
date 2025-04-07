import { useNavigate } from 'react-router-dom'
import DropZone from '../../components/Common/DropZone'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Select, { SingleValue } from 'react-select'
import './Landing.css'
import { useSettingsStore } from '../../stores/settingsStore'

const Landing = () => {
    const navigate = useNavigate()
    const [step, setStep] = useState(0)
    const { settings, setLanguage, setModel, setApiKey, saveSettings } = useSettingsStore()

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [])

    const languageOptions = [
        { value: 'zh', label: '中文' },
        { value: 'en', label: 'English' }
    ]

    const modelOptions = [
        { value: 'https://api.deepseek.com', label: 'DeepSeek' },
        { value: 'https://api.openai.com/v1', label: 'ChatGPT' }
    ]

    const handleDrop = async (filepath: string) => {
        await saveSettings()
        navigate('/loading', { state: { filepath, ...settings } })
    }

    const handleLanguageSelect = (
        selectedOption: SingleValue<{ value: string; label: string }>
    ) => {
        if (selectedOption) {
            setLanguage(selectedOption.value)
            if (step === 0) setStep(1)
        }
    }

    const handleModelSelect = (selectedOption: SingleValue<{ value: string; label: string }>) => {
        if (selectedOption) {
            setModel(selectedOption.value)
            if (step === 1) setStep(2)
        }
    }

    const nextStep = () => {
        if (step === 0 && settings.languages) setStep(1)
        if (step === 1 && settings.models) setStep(2)
        if (step === 2 && settings.apiKey) setStep(3)
    }

    const isFormComplete = step === 3

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            <motion.div
                className="fixed inset-0 bg-gray-500/50 z-30"
                animate={{ opacity: isFormComplete ? 0 : 1 }}
                transition={{ duration: 0.5 }}
                style={{
                    pointerEvents: isFormComplete ? 'none' : 'auto',
                    touchAction: 'none'
                }}
            />

            <div
                className="relative z-20 landing-container"
                style={{
                    pointerEvents: isFormComplete ? 'auto' : 'none',
                    filter: isFormComplete ? 'none' : 'blur(2px)'
                }}
            >
                <DropZone onDrop={handleDrop} />
            </div>

            <motion.div
                className="fixed bottom-6 right-4 bg-white rounded-lg shadow-xl p-6 z-40 overflow-visible"
                initial={{ height: 'auto', width: 300, y: 0 }}
                animate={{
                    height: step === 0 ? 170 : step === 1 ? 250 : step === 2 ? 330 : 'auto',
                    y: step === 3 ? window.innerHeight + 100 : 0
                }}
                transition={{
                    type: 'spring',
                    stiffness: 120,
                    damping: 12,
                    mass: 1.2,
                    velocity: step === 3 ? 40 : 0
                }}
                layout
            >
                <div className="space-y-4 text-gray-700">
                    <div>
                        <label className="block text-sm font-medium mb-2">选择语言:</label>
                        <Select
                            options={languageOptions}
                            value={languageOptions.find(
                                (option) => option.value === settings.languages
                            )}
                            onChange={handleLanguageSelect}
                            placeholder="请选择语言..."
                            className="react-select-container"
                            classNamePrefix="react-select"
                        />
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: step >= 1 ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {step >= 1 && (
                            <div>
                                <label className="block text-sm font-medium mb-2">选择模型:</label>
                                <Select
                                    options={modelOptions}
                                    value={modelOptions.find(
                                        (option) => option.value === settings.models
                                    )}
                                    onChange={handleModelSelect}
                                    placeholder="请选择模型..."
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                />
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: step >= 2 ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {step >= 2 && (
                            <div>
                                <label className="block text-sm font-medium mb-2">API密钥:</label>
                                <input
                                    type="text"
                                    value={settings.apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="请输入API密钥"
                                    className="w-full px-3 py-2 border rounded-md
                                             focus:outline-none focus:ring-2
                                             focus:ring-blue-500 focus:border-transparent
                                             transition-all"
                                />
                            </div>
                        )}
                    </motion.div>
                </div>

                {step < 3 && (
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="mt-4"
                    >
                        <button
                            onClick={nextStep}
                            disabled={
                                (step === 0 && !settings.languages) ||
                                (step === 1 && !settings.models) ||
                                (step === 2 && !settings.apiKey)
                            }
                            className="w-full px-4 py-2 bg-blue-200 text-black rounded-md
                                  hover:bg-blue-300
                                  focus:outline-none focus:ring-0
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  transition-colors duration-200 font-medium
                                  outline-none ring-0 border-transparent"
                        >
                            {step === 2 ? '确认' : '下一步'}
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    )
}

export default Landing
