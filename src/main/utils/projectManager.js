'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.ProjectManager = void 0
// main/project/projectManager.ts
const path_1 = __importDefault(require('path'))
const fs_1 = __importDefault(require('fs'))
const crypto_1 = __importDefault(require('crypto'))
const db_1 = require('../utils/db')
const fileManager_1 = require('../utils/fileManager')
// ai识别忽略文件
const IGNORED_DIRS = ['.nextcode']
const IGNORED_FILES = new Set(['__init__.py']) // 需要忽略的文件
const IGNORED_EXTENSIONS = new Set(['exe']) // 需要忽略的扩展名
const AI_ENABLED_EXTENSIONS = new Set(['py'])
// 文件树忽略文件
const DEFAULT_IGNORE_PATTERNS = [
    '.nextcode',
    'node_modules',
    '.git',
    '.DS_Store',
    '.github',
    '.gitignore',
    'LICENSE.txt'
]

class ProjectManager {
    static createDir(projectPath) {
        const nextcodeDir = path_1.default.join(projectPath, '.nextcode')
        if (!fs_1.default.existsSync(nextcodeDir)) {
            fs_1.default.mkdirSync(nextcodeDir, { recursive: true })
        }
        return nextcodeDir
    }

    static async setupProjectDirectory(projectPath) {
        const dbPath = this.createDir(projectPath)
        const db = await (0, db_1.initializeDatabase)(dbPath)
        await db.waitForInitialization() // 显式等待初始化完成
        console.log('database indices ready')
    }

    static async syncFilesWithDatabase(projectPath) {
        const files = (0, fileManager_1.getAllFiles)(projectPath).filter((file) => {
            const fileName = path_1.default.basename(file.path)
            const fileExt = path_1.default.extname(file.path).slice(1)
            return (
                !IGNORED_DIRS.some((dir) => file.path.includes(dir)) && // 过滤文件夹
                !IGNORED_FILES.has(fileName) && // 过滤特定文件
                !IGNORED_EXTENSIONS.has(fileExt)
            ) // 过滤特定扩展名
        })
        const db = (0, db_1.getDatabase)()
        await db.waitForInitialization()
        const collection = db.getFileCollection()
        const currentPaths = new Set(
            files.map((file) => path_1.default.relative(projectPath, file.path))
        )
        // Cleanup deleted files
        collection.findAndRemove({ path: { $nin: [...currentPaths] } })
        return files.map((file) => {
            const filePath = file.path
            const relativePath = path_1.default.relative(projectPath, filePath)
            const stats = fs_1.default.statSync(filePath)
            const content = fs_1.default.readFileSync(filePath)
            return this.createOrUpdateFileRecord(collection, relativePath, stats, content)
        })
    }

    static createOrUpdateFileRecord(collection, relativePath, stats, content) {
        const hash = crypto_1.default.createHash('sha256').update(content).digest('hex')
        const existing = collection.findOne({ path: relativePath })
        const extension = path_1.default.extname(relativePath).slice(1)
        const isTargetFile = AI_ENABLED_EXTENSIONS.has(extension)
        if (existing) {
            if (existing.hash !== hash) {
                const updated = { ...existing, hash, needsAiUpdate: isTargetFile }
                collection.update(updated)
            }
            return existing
        }
        const fileData = {
            name: path_1.default.basename(relativePath),
            path: relativePath,
            hash,
            extension,
            size: stats.size,
            lastModified: stats.mtimeMs,
            language: (0, fileManager_1.getLanguage)(relativePath),
            linesOfCode: isTargetFile ? (0, fileManager_1.countLines)(content.toString()) : 0,
            isBinary: (0, fileManager_1.isBinaryFile)(content),
            needsAiUpdate: isTargetFile,
            summary: '',
            overview: {
                behavior: '',
                markdown: ''
            },
            funcs: []
        }
        return collection.insert(fileData)
    }

    // 新增文件树生成方法
    static generateFileTree(projectPath) {
        const buildTree = (currentPath) => {
            const relativePath = path_1.default.relative(projectPath, currentPath)
            const pathSegments = relativePath.split(path_1.default.sep).filter((p) => p !== '')
            // 检查忽略规则 (Check ignore rules)
            if (
                pathSegments.some(
                    (segment) =>
                        this.ignorePatterns.includes(segment) ||
                        this.ignorePatterns.includes(path_1.default.basename(currentPath))
                )
            ) {
                return null
            }
            const stats = fs_1.default.statSync(currentPath)
            const isDirectory = stats.isDirectory()
            const node = {
                id: relativePath.startsWith('/') ? relativePath : `/${relativePath}`, // Keep using relativePath for id
                name: path_1.default.basename(currentPath),
                path: currentPath,
                isDirectory,
                isLeaf: !isDirectory,
                children: []
            }
            if (isDirectory) {
                node.children = fs_1.default
                    .readdirSync(currentPath)
                    .map((child) => path_1.default.join(currentPath, child)) // Generate absolute paths for children
                    .map(buildTree)
                    .filter((child) => child !== null)
            }
            return node
        }
        return buildTree(projectPath)
    }

    static generateTextFileTree(projectPath) {
        const rootName = path_1.default.basename(projectPath)
        const treeLines = [rootName]
        const buildTextTree = (currentPath, prefix) => {
            const relativePath = path_1.default.relative(projectPath, currentPath)
            const pathSegments = relativePath.split(path_1.default.sep).filter((p) => p !== '')
            // 检查忽略规则，应用在每个层级
            if (
                this.ignorePatterns.includes(path_1.default.basename(currentPath)) ||
                pathSegments.some((segment) => this.ignorePatterns.includes(segment))
            ) {
                return
            }
            const items = fs_1.default.readdirSync(currentPath)
            const directories = []
            const files = []
            items.forEach((item) => {
                const itemPath = path_1.default.join(currentPath, item)
                const stats = fs_1.default.statSync(itemPath)
                if (stats.isDirectory()) {
                    directories.push(item)
                } else {
                    files.push(item)
                }
            })
            directories.sort()
            files.sort()
            const allItems = [...directories, ...files]
            allItems.forEach((item, index) => {
                const isLast = index === allItems.length - 1
                const itemPath = path_1.default.join(currentPath, item)
                const stats = fs_1.default.statSync(itemPath)
                const isDirectory = stats.isDirectory()
                // 在添加节点前再次检查忽略规则
                if (this.ignorePatterns.includes(item)) {
                    return
                }
                const branch = isLast ? '└── ' : '├── '
                treeLines.push(prefix + branch + item)
                if (isDirectory) {
                    const newPrefix = prefix + (isLast ? '    ' : '│   ')
                    buildTextTree(itemPath, newPrefix)
                }
            })
        }
        // 处理根目录下的子节点，确保忽略规则生效
        const rootItems = fs_1.default
            .readdirSync(projectPath)
            .filter((item) => !this.ignorePatterns.includes(item)) // 直接过滤根目录下的忽略项
        rootItems.forEach((item, index) => {
            const itemPath = path_1.default.join(projectPath, item)
            const stats = fs_1.default.statSync(itemPath)
            const isLast = index === rootItems.length - 1
            const branch = isLast ? '└── ' : '├── '
            treeLines.push(branch + item)
            if (stats.isDirectory()) {
                const newPrefix = isLast ? '    ' : '│   '
                buildTextTree(itemPath, newPrefix)
            }
        })
        return treeLines.join('\n')
    }

    static configureIgnorePatterns(patterns) {
        this.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...patterns]
    }
}

exports.ProjectManager = ProjectManager
ProjectManager.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS]
//# sourceMappingURL=projectManager.js.map
