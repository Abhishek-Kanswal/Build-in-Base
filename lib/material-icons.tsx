import React from "react"

const BASE_URL = "https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@main/icons"

// 1. Exact File Name Matches (Highest Priority)
const fileNames: Record<string, string> = {
    // Node / NPM / Yarn / PNPM / Bun
    "package.json": "nodejs",
    "package-lock.json": "nodejs",
    ".nvmrc": "nodejs",
    ".npmignore": "npm",
    ".npmrc": "npm",
    "yarn.lock": "yarn",
    ".yarnrc": "yarn",
    "pnpm-lock.yaml": "pnpm",
    "pnpm-workspace.yaml": "pnpm",
    "bun.lockb": "bun",
    "bun.lock": "bun",
    "bunfig.toml": "bun",

    // Frameworks & Tools
    "next.config.js": "next",
    "next.config.mjs": "next",
    "next.config.ts": "next",
    "tailwind.config.js": "tailwindcss",
    "tailwind.config.ts": "tailwindcss",
    "tailwind.config.cjs": "tailwindcss",
    "postcss.config.js": "postcss",
    "postcss.config.cjs": "postcss",
    "vite.config.ts": "vite",
    "vite.config.js": "vite",
    "svelte.config.js": "svelte",
    "svelte.config.ts": "svelte",
    "nuxt.config.js": "nuxt",
    "nuxt.config.ts": "nuxt",
    "vue.config.js": "vue-config",
    "vue.config.ts": "vue-config",
    "astro.config.mjs": "astro-config",
    "astro.config.ts": "astro-config",
    "remix.config.js": "remix",
    "remix.config.ts": "remix",

    // TypeScript / JavaScript
    "tsconfig.json": "tsconfig",
    "tsconfig.node.json": "tsconfig",
    "tsconfig.app.json": "tsconfig",
    "jsconfig.json": "jsconfig",
    ".eslintrc": "eslint",
    ".eslintrc.json": "eslint",
    ".eslintrc.js": "eslint",
    ".eslintrc.cjs": "eslint",
    ".eslintignore": "eslint",
    "eslint.config.js": "eslint",
    ".prettierrc": "prettier",
    ".prettierrc.json": "prettier",
    ".prettierrc.js": "prettier",
    ".prettierignore": "prettier",
    "biome.json": "biome",
    "biome.jsonc": "biome",

    // Git & Environment
    ".gitignore": "git",
    ".gitattributes": "git",
    ".gitmodules": "git",
    ".env": "tune",
    ".env.local": "tune",
    ".env.development": "tune",
    ".env.production": "tune",
    ".env.example": "tune",

    // Docs & CI/CD
    "readme.md": "readme",
    "changelog.md": "changelog",
    "contributing.md": "contributing",
    "license": "license",
    "license.md": "license",
    "dockerfile": "docker",
    "docker-compose.yml": "docker",
    ".dockerignore": "docker",
    "vercel.json": "vercel",
    ".vercelignore": "vercel",
    "netlify.toml": "netlify",
    "turbo.json": "turborepo",

    // UI/Testing
    "components.json": "ui", // shadcn/ui
    "jest.config.js": "jest",
    "jest.config.ts": "jest",
    "playwright.config.ts": "playwright",
    "cypress.json": "cypress",
    "cypress.config.ts": "cypress",
}

// 2. File Extension Matches (Fallback)
const fileExtensions: Record<string, string> = {
    // React / Web
    tsx: "react_ts",
    jsx: "react",
    ts: "typescript",
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    html: "html",
    htm: "html",
    css: "css",
    scss: "sass",
    sass: "sass",
    less: "less",
    json: "json",
    jsonc: "json",
    md: "markdown",
    mdx: "mdx",
    
    // Framework Specific
    vue: "vue",
    svelte: "svelte",
    astro: "astro",

    // Backend / Other Languages
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "h",
    hpp: "hpp",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    dart: "dart",
    sql: "database",
    graphql: "graphql",
    gql: "graphql",

    // Config / Shell
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    sh: "console",
    bash: "console",
    zsh: "console",
    bat: "console",
    ps1: "powershell",

    // Images & Media
    svg: "svg",
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    ico: "favicon",
    webp: "image",
    mp4: "video",
    mp3: "audio",
    wav: "audio",

    // Fonts & Others
    ttf: "font",
    woff: "font",
    woff2: "font",
    eot: "font",
    pdf: "pdf",
    zip: "zip",
    tar: "zip",
    gz: "zip",
    csv: "table",
    xlsx: "table",
}

// 3. Folder Name Matches
const folderNames: Record<string, string> = {
    src: "folder-src",
    app: "folder-app",
    components: "folder-components",
    ui: "folder-ui",
    lib: "folder-lib",
    utils: "folder-utils",
    hooks: "folder-hook",
    api: "folder-api",
    public: "folder-public",
    styles: "folder-css",
    assets: "folder-images",
    fonts: "folder-fonts",
    icons: "folder-icons",
    layouts: "folder-layout",
    pages: "folder-client",
    server: "folder-server",
    actions: "folder-server",
    types: "folder-typescript",
    interfaces: "folder-typescript",
    node_modules: "folder-node",
    dist: "folder-dist",
    build: "folder-dist",
    out: "folder-dist",
    ".next": "folder-next",
    ".vercel": "folder-vercel",
    ".git": "folder-git",
    ".github": "folder-github",
    tests: "folder-test",
    __tests__: "folder-test",
    coverage: "folder-coverage",
    docs: "folder-docs",
    config: "folder-config",
}

interface MaterialIconProps {
    name: string
    type: "file" | "folder"
    isOpen?: boolean
    className?: string
}

export function MaterialIcon({ name, type, isOpen = false, className = "w-4 h-4" }: MaterialIconProps) {
    const getIconName = () => {
        const lowerName = name.toLowerCase()

        if (type === "folder") {
            // Check specific folder mapping, otherwise return generic folder
            const folderIcon = folderNames[lowerName] || "folder"
            // Append '-open' if the folder is expanded (material theme supports this)
            return isOpen ? `${folderIcon}-open` : folderIcon
        }

        // 1. Check exact file names first (e.g., package.json)
        if (fileNames[lowerName]) {
            return fileNames[lowerName]
        }

        // 2. Check extensions (handle multiple dots like .d.ts)
        const parts = lowerName.split(".")
        if (parts.length > 1) {
            // Check for compound extensions first (e.g., d.ts)
            const compoundExt = parts.slice(-2).join(".")
            if (compoundExt === "d.ts") return "typescript-def"
            if (compoundExt === "config.js") return "settings"
            if (compoundExt === "config.ts") return "settings"
            
            // Standard single extension check
            const extension = parts.pop() || ""
            if (extension && fileExtensions[extension]) {
                return fileExtensions[extension]
            }
        }

        // 3. Fallback generic file icon
        return "document"
    }

    const iconName = getIconName()
    const iconUrl = `${BASE_URL}/${iconName}.svg`

    return (
        <img 
            src={iconUrl} 
            alt={`${name} icon`} 
            className={`${className} flex-shrink-0`}
            onError={(e) => {
                // FIXED: If the CDN request fails, respect the isOpen state for the fallback folder
                const fallbackIcon = type === 'folder' ? (isOpen ? 'folder-open' : 'folder') : 'document'
                e.currentTarget.src = `${BASE_URL}/${fallbackIcon}.svg`
            }}
        />
    )
}