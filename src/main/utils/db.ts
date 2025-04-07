import Loki from 'lokijs'
import path from 'path'
import { ProjectSummary } from '../../types/graph' // 确保路径正确
import { File } from '../../types/file' // 确保路径正确

const DB_FILENAME = 'nc.db'

class Database {
    private db!: Loki
    private readonly dbPath: string
    private readonly initPromise: Promise<void>
    private collection: Loki.Collection<File> | null = null
    private moduleCollection: Loki.Collection<ProjectSummary> | null = null

    constructor(directory: string) {
        this.dbPath = path.join(directory, DB_FILENAME)

        this.initPromise = new Promise((resolve, reject) => {
            this.db = new Loki(this.dbPath, {
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

    private initializeCollections() {
        // 创建集合时明确指定泛型类型和索引
        this.collection =
            this.db.getCollection<File>('files') ||
            this.db.addCollection<File>('files', {
                unique: ['path'], // path作为唯一标识
                indices: ['name', 'hash', 'extension', 'lastModified', 'needsAiUpdate'], // 常用查询字段建立索引
                exact: ['isBinary'] // 精确匹配字段
            })
        this.moduleCollection =
            this.db.getCollection<ProjectSummary>('graph') ||
            this.db.addCollection<ProjectSummary>('graph', {
                indices: ['path'],
                unique: ['path']
            })
    }

    public getProjectSummaryCollection(): Loki.Collection<ProjectSummary> {
        if (!this.moduleCollection) {
            throw new Error('Module collection not initialized')
        }
        return this.moduleCollection
    }

    public getFileCollection(): Loki.Collection<File> {
        if (!this.collection) {
            throw new Error('Database collection not initialized')
        }
        return this.collection
    }

    public async saveDatabase() {
        await this.initPromise
        this.db.saveDatabase()
    }

    public getDbPath(): string {
        return this.dbPath
    }

    public async waitForInitialization() {
        await this.initPromise
    }
}

let dbInstance: Database | null = null

// 函数重载声明
export function getDatabase(basePath: string): Database
export function getDatabase(): Database
export function getDatabase(basePath?: string): Database {
    if (!dbInstance) {
        if (!basePath) {
            throw new Error('必须先在项目初始化时传递 basePath 参数')
        }
        dbInstance = new Database(basePath)
    }
    return dbInstance
}

// 推荐的显式初始化方法
export const initializeDatabase = async (basePath: string): Promise<Database> => {
    const db = getDatabase(basePath)
    await db.waitForInitialization()
    return db
}
