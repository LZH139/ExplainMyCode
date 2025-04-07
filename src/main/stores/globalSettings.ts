import { GlobalSettings } from '../../types/settings'

class GlobalSettingsManager {
    private settings: GlobalSettings = {
        languages: '',
        models: '',
        apiKey: ''
    }

    setSettings(settings: Partial<GlobalSettings>) {
        this.settings = {
            ...this.settings,
            ...settings
        }
    }

    getSettings(): GlobalSettings {
        return this.settings
    }
}

export const globalSettings = new GlobalSettingsManager()
