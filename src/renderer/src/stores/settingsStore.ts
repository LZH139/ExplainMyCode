// src/renderer/stores/settingsStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Settings {
    languages: string
    models: string
    apiKey: string
}

interface SettingsStore {
    settings: Settings
    setLanguage: (lang: string) => void
    setModel: (model: string) => void
    setApiKey: (key: string) => void
    saveSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set, get) => ({
            settings: {
                languages: '',
                models: '',
                apiKey: ''
            },
            setLanguage: (lang) =>
                set((state) => ({
                    settings: { ...state.settings, languages: lang }
                })),
            setModel: (model) =>
                set((state) => ({
                    settings: { ...state.settings, models: model }
                })),
            setApiKey: (key) =>
                set((state) => ({
                    settings: { ...state.settings, apiKey: key }
                })),
            saveSettings: async () => {
                // 通过IPC与主进程通信保存设置
                await window.api.saveSettings(get().settings)
            }
        }),
        {
            name: 'app-settings', // 本地存储的key
            // getStorage: () => localStorage // 指定存储介质
        }
    )
)
