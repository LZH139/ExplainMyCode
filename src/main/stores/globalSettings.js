'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.useGlobalSettings = void 0
// globalSetting.ts
const zustand_1 = require('zustand')
exports.useGlobalSettings = (0, zustand_1.create)((set) => ({
    languages: '',
    models: '',
    apiKey: '',
    setSettings: (settings) => set((state) => ({ ...state, ...settings }))
}))
//# sourceMappingURL=globalSettings.js.map
