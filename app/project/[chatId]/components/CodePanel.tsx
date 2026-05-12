import React, { useRef, useMemo, useState, useEffect } from "react"
import { CodeXml } from "lucide-react"
import Editor from "@monaco-editor/react"
import { MaterialIcon } from "@/lib/material-icons"
import type { FileMap } from "@/lib/builder/bolt"
import type { FileTreeNode } from "@/lib/builder/webcontainer"
import { FileTree } from "./FileTree"
import { EditorTabs, type EditorTab } from "./EditorTabs"
import { TerminalPanel } from "./TerminalPanel"

interface CodePanelProps {
    fileTree: FileTreeNode[]
    filesByPath: FileMap
    activeFile: string
    openFiles: EditorTab[]
    expandedFolders: Record<string, boolean>
    isTerminalOpen: boolean
    terminalLogs: string[]
    terminalLoading: boolean
    editorFontSize: number
    webcontainer: any | null
    onSetActiveFile: (file: string) => void
    onOpenFile: (path: string, type: "code" | "json") => void
    onCloseFile: (e: React.MouseEvent, id: string) => void
    onToggleFolder: (path: string) => void
    onSetTerminalOpen: (open: boolean) => void
    onFileChange: (path: string, content: string) => void
    onCreateFile: (basePath?: string) => void
    onCreateFolder: (basePath?: string) => void
    onDeleteFile: (path: string) => void
    onDeleteFolder: (path: string) => void
    onOpenTerminal: (path?: string) => void
    onGetTargetFolderPath: () => string
    isFileDirty: (path: string) => boolean
    onMarkSaved: (path: string, content: string) => void
}

export function CodePanel({
    fileTree,
    filesByPath,
    activeFile,
    openFiles,
    expandedFolders,
    isTerminalOpen,
    terminalLogs,
    terminalLoading,
    webcontainer,
    editorFontSize,
    onSetActiveFile,
    onOpenFile,
    onCloseFile,
    onToggleFolder,
    onSetTerminalOpen,
    onFileChange,
    onCreateFile,
    onCreateFolder,
    onDeleteFile,
    onDeleteFolder,
    onOpenTerminal,
    onGetTargetFolderPath,
    isFileDirty,
    onMarkSaved,
}: CodePanelProps) {
    const editorRef = useRef<any>(null)
    const monacoSetupDoneRef = useRef(false)
    const shikiMonacoInitRef = useRef<Promise<void> | null>(null)

    const activeFileContent = activeFile ? filesByPath[activeFile] ?? "" : ""

    const activeEditorLanguage = useMemo(() => {
        if (!activeFile) return "typescript"
        if (activeFile.endsWith(".tsx")) return "tsx"
        if (activeFile.endsWith(".jsx")) return "jsx"
        if (activeFile.endsWith(".ts")) return "typescript"
        if (activeFile.endsWith(".js") || activeFile.endsWith(".mjs") || activeFile.endsWith(".cjs")) return "javascript"
        if (activeFile.endsWith(".json") || activeFile.endsWith(".jsonc")) return "json"
        if (activeFile.endsWith(".css") || activeFile.endsWith(".scss") || activeFile.endsWith(".sass") || activeFile.endsWith(".less")) return "css"
        if (activeFile.endsWith(".html") || activeFile.endsWith(".htm")) return "html"
        return "typescript"
    }, [activeFile])

    const getPrettierParser = (filePath: string, language: string) => {
        const lowerPath = filePath.toLowerCase()
        if (lowerPath.endsWith(".tsx") || lowerPath.endsWith(".ts")) return "typescript"
        if (lowerPath.endsWith(".jsx") || lowerPath.endsWith(".js") || lowerPath.endsWith(".mjs") || lowerPath.endsWith(".cjs")) return "babel"
        if (lowerPath.endsWith(".json") || lowerPath.endsWith(".jsonc")) return "json"
        if (lowerPath.endsWith(".css") || lowerPath.endsWith(".scss") || lowerPath.endsWith(".sass") || lowerPath.endsWith(".less")) return "css"
        if (lowerPath.endsWith(".html") || lowerPath.endsWith(".htm")) return "html"
        if (language === "typescript" || language === "tsx") return "typescript"
        if (language === "javascript" || language === "jsx") return "babel"
        return "babel"
    }

    const formatActiveFile = async () => {
        if (!editorRef.current) return
        const source = editorRef.current.getValue()
        const parser = getPrettierParser(activeFile, activeEditorLanguage)
        try {
            const prettierModule = await import("prettier/standalone")
            const [babelPlugin, tsPlugin, estreePlugin, postcssPlugin, htmlPlugin] = await Promise.all([
                import("prettier/plugins/babel"),
                import("prettier/plugins/typescript"),
                import("prettier/plugins/estree"),
                import("prettier/plugins/postcss"),
                import("prettier/plugins/html"),
            ])
            const formatted = await prettierModule.format(source, {
                parser,
                plugins: [
                    (babelPlugin as any).default ?? babelPlugin,
                    (tsPlugin as any).default ?? tsPlugin,
                    (estreePlugin as any).default ?? estreePlugin,
                    (postcssPlugin as any).default ?? postcssPlugin,
                    (htmlPlugin as any).default ?? htmlPlugin,
                ],
                semi: true,
                singleQuote: true,
                trailingComma: "all",
                printWidth: 100,
            })
            editorRef.current.setValue(formatted)
            onMarkSaved(activeFile, formatted)
            onFileChange(activeFile, formatted)
        } catch (error) {
            console.error("Failed to format with Prettier", error)
        }
    }

    const handleEditorWillMount = (monaco: any) => {
        const compilerOptions = {
            jsx: monaco.languages.typescript.JsxEmit.React,
            jsxFactory: 'React.createElement',
            reactNamespace: 'React',
            allowNonTsExtensions: true,
            allowJs: true,
            target: monaco.languages.typescript.ScriptTarget.Latest,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            resolveJsonModule: true,
        }
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({ ...compilerOptions })
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({ ...compilerOptions })
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false })
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false })
        monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
        monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)

        if (!monacoSetupDoneRef.current) {
            monacoSetupDoneRef.current = true
            const reactAndNextLib = `
declare module "react" { export = React; }
declare module "next/link" { const Link: any; export default Link; }
declare module "next/image" { const Image: any; export default Image; }
`
            monaco.languages.typescript.typescriptDefaults.addExtraLib(reactAndNextLib, "file:///node_modules/@types/react/index.d.ts")
            monaco.languages.typescript.javascriptDefaults.addExtraLib(reactAndNextLib, "file:///node_modules/@types/react/index.d.ts")
        }
    }

    const initializeShikiMonaco = async (monaco: any) => {
        if (!shikiMonacoInitRef.current) {
            shikiMonacoInitRef.current = (async () => {
                const [{ createHighlighter }, { shikiToMonaco }] = await Promise.all([
                    import("shiki"),
                    import("@shikijs/monaco"),
                ])
                const languages = ["typescript", "javascript", "json", "css", "html", "tsx", "jsx"]
                const highlighter = await createHighlighter({ themes: ["vitesse-dark"], langs: languages })
                for (const languageId of languages) {
                    if (!monaco.languages.getLanguages().some((language: any) => language.id === languageId)) {
                        monaco.languages.register({ id: languageId })
                    }
                }
                for (const aliasId of ["typescriptreact", "javascriptreact"]) {
                    if (!monaco.languages.getLanguages().some((language: any) => language.id === aliasId)) {
                        monaco.languages.register({ id: aliasId })
                    }
                }
                shikiToMonaco(highlighter, monaco)
            })()
        }
        await shikiMonacoInitRef.current
    }

    return (
        <div className="flex flex-1 w-full h-full animate-in fade-in duration-200">
            {/* File Explorer */}
            <FileTree
                fileTree={fileTree}
                activeFile={activeFile}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onOpenFile={onOpenFile}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onDeleteFile={onDeleteFile}
                onDeleteFolder={onDeleteFolder}
                onOpenTerminal={onOpenTerminal}
                onGetTargetFolderPath={onGetTargetFolderPath}
            />

            {/* Editor + Terminal Wrapper */}
            <div className="flex-1 flex flex-col bg-[#171717] min-w-0 z-10 relative">
                <EditorTabs
                    openFiles={openFiles}
                    activeFile={activeFile}
                    onSelectFile={onSetActiveFile}
                    onCloseFile={onCloseFile}
                    isFileDirty={isFileDirty}
                />

                {/* Monaco Editor */}
                <div className="flex-1 min-h-0">
                    {openFiles.length > 0 ? (
                        <Editor
                            height="100%"
                            language={activeEditorLanguage}
                            theme="vitesse-dark"
                            value={activeFileContent || "// Generated files will appear here"}
                            onChange={(value) => {
                                if (value !== undefined) onFileChange(activeFile, value)
                            }}
                            beforeMount={handleEditorWillMount}
                            onMount={(editor, monaco) => {
                                editorRef.current = editor
                                void initializeShikiMonaco(monaco)
                                editor.addAction({
                                    id: "format-active-file",
                                    label: "Format Document",
                                    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
                                    run: async () => { await formatActiveFile() },
                                })
                                editor.addAction({
                                    id: "format-active-file-alt",
                                    label: "Format Document (Alt)",
                                    keybindings: [monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
                                    run: async () => { await formatActiveFile() },
                                })
                            }}
                            options={{
                                minimap: { enabled: false },
                                fontSize: editorFontSize,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                lineHeight: 22,
                                padding: { top: 16 },
                                scrollBeyondLastLine: false,
                                smoothScrolling: true,
                                automaticLayout: true,
                                cursorBlinking: "smooth",
                                renderLineHighlight: "all",
                                overviewRulerBorder: false,
                                hideCursorInOverviewRuler: true,
                                wordWrap: "on",
                                quickSuggestions: { other: true, comments: false, strings: true },
                                suggestOnTriggerCharacters: true,
                                parameterHints: { enabled: true },
                                acceptSuggestionOnEnter: "smart",
                                tabCompletion: "on",
                                snippetSuggestions: "inline",
                                formatOnType: true,
                                formatOnPaste: true,
                                scrollbar: {
                                    verticalScrollbarSize: 8,
                                    horizontalScrollbarSize: 8,
                                    verticalHasArrows: false,
                                    horizontalHasArrows: false,
                                },
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 bg-[#121212]">
                            <CodeXml className="w-12 h-12 mb-4 opacity-50" />
                            <p className="font-medium text-sm">Select a file to view its contents</p>
                        </div>
                    )}
                </div>

                {/* Terminal */}
                <TerminalPanel
                    isOpen={isTerminalOpen}
                    onClose={() => onSetTerminalOpen(false)}
                    logs={terminalLogs}
                    isLoading={terminalLoading}
                    webcontainer={webcontainer}
                />
            </div>
        </div>
    )
}
