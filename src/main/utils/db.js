'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.initializeDatabase = void 0
exports.getDatabase = getDatabase
// main/utils/db.ts
const lokijs_1 = __importDefault(require('lokijs'))
const path_1 = __importDefault(require('path'))
const DB_FILENAME = 'nc.db'
class Database {
    constructor(directory) {
        this.collection = null
        this.moduleCollection = null
        this.dbPath = path_1.default.join(directory, DB_FILENAME)
        this.initPromise = new Promise((resolve, reject) => {
            this.db = new lokijs_1.default(this.dbPath, {
                autoload: true,
                autoloadCallback: (err) => {
                    if (err) return reject(err)
                    try {
                        this.initializeCollections()
                        resolve()
                    } catch (error) {
                        reject(error)
                    }
                },
                autosave: true,
                autosaveInterval: 4000
            })
        })
    }
    initializeCollections() {
        // 创建集合时明确指定泛型类型和索引
        this.collection =
            this.db.getCollection('files') ||
            this.db.addCollection('files', {
                unique: ['path'], // path作为唯一标识
                indices: ['name', 'hash', 'extension', 'lastModified', 'needsAiUpdate'], // 常用查询字段建立索引
                exact: ['isBinary'] // 精确匹配字段
            })
        this.moduleCollection =
            this.db.getCollection('graph') ||
            this.db.addCollection('graph', {
                indices: ['path'],
                unique: ['path']
            })
    }
    getProjectSummaryCollection() {
        if (!this.moduleCollection) {
            throw new Error('Module collection not initialized')
        }
        return this.moduleCollection
    }
    getFileCollection() {
        if (!this.collection) {
            throw new Error('Database collection not initialized')
        }
        return this.collection
    }
    async saveDatabase() {
        await this.initPromise
        this.db.saveDatabase()
    }
    getDbPath() {
        return this.dbPath
    }
    async waitForInitialization() {
        await this.initPromise
    }
}
let dbInstance = null
function getDatabase(basePath) {
    if (!dbInstance) {
        if (!basePath) {
            throw new Error('必须先在项目初始化时传递 basePath 参数')
        }
        dbInstance = new Database(basePath)
    }
    return dbInstance
}
// 推荐的显式初始化方法
const initializeDatabase = async (basePath) => {
    const db = getDatabase(basePath)
    await db.waitForInitialization()
    return db
}
exports.initializeDatabase = initializeDatabase
//# sourceMappingURL=db.js.map
