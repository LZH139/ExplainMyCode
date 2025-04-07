// 语言映射配置
const LANGUAGE_MAPPINGS: {
    extensions: Record<string, string>
    filenames: Record<string, string>
} = {
    extensions: {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        mjs: 'javascript',
        cjs: 'javascript',
        py: 'python',
        java: 'java',
        c: 'c',
        h: 'c',
        cpp: 'cpp',
        hpp: 'cpp',
        cs: 'csharp',
        fs: 'fsharp',
        go: 'go',
        rb: 'ruby',
        php: 'php',
        swift: 'swift',
        kt: 'kotlin',
        kts: 'kotlin',
        rs: 'rust',
        dart: 'dart',
        hs: 'haskell',
        lhs: 'haskell',
        scala: 'scala',
        clj: 'clojure',
        exs: 'elixir',
        erl: 'erlang',

        // 脚本语言
        sh: 'shell',
        bash: 'shell',
        zsh: 'shell',
        ps1: 'powershell',
        bat: 'bat',
        cmd: 'bat',

        // Web相关
        html: 'html',
        htm: 'html',
        css: 'css',
        scss: 'scss',
        less: 'less',
        json: 'json',
        jsonc: 'jsonc',
        xml: 'xml',
        xsd: 'xml',
        xsl: 'xml',

        // 配置与数据
        yml: 'yaml',
        yaml: 'yaml',
        toml: 'toml',
        ini: 'ini',
        env: 'ini',

        // 文档
        md: 'markdown',
        markdown: 'markdown',

        // 数据库
        sql: 'sql',
        pgsql: 'sql',
        mysql: 'sql',

        // 模板引擎
        ejs: 'html',
        erb: 'erb',
        twig: 'twig',
        mustache: 'handlebars',

        // 其他
        lua: 'lua',
        pl: 'perl',
        r: 'r',
        groovy: 'groovy',
        ml: 'ocaml',
        pas: 'pascal',
        vb: 'vb',
        tex: 'latex',
        nim: 'nim',
        prolog: 'prolog',
        coffee: 'coffeescript',
        litcoffee: 'coffeescript',
        vue: 'vue',
        svelte: 'svelte',

        // 特殊类型
        diff: 'diff',
        log: 'log',
        csv: 'csv'
    },

    // 特殊文件名映射
    filenames: {
        Dockerfile: 'dockerfile',
        Makefile: 'makefile',
        'webpack.config.js': 'javascript'
    }
}

// 主识别函数
export function getLanguage(filename: string): string {
    const lowerName = filename.toLowerCase()

    // 1. 检查特殊文件名
    for (const [name, lang] of Object.entries(LANGUAGE_MAPPINGS.filenames)) {
        if (lowerName === name.toLowerCase()) return lang
    }

    // 2. 处理扩展名
    const extension = lowerName.split('.').pop() || ''
    return LANGUAGE_MAPPINGS.extensions[extension] || 'plaintext'
}

// 支持的语言列表
export const SUPPORTED_LANGUAGES = [
    ...new Set([
        ...Object.values(LANGUAGE_MAPPINGS.extensions),
        ...Object.values(LANGUAGE_MAPPINGS.filenames)
    ])
]
