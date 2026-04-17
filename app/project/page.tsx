"use client"

import React, { useState, useEffect } from "react"
import {
    ChevronDown, Lock, Play, Cloud, Settings, Download, Share,
    ChevronLeft, ChevronRight, RotateCw, Smartphone, Monitor, Maximize2,
    CodeXml, X, Box, Globe, FileCode2, Folder, FolderOpen, FileJson,
    Plus, MoreHorizontal, TerminalSquare
} from "lucide-react"

import { PromptInputBox } from "@/components/ai-prompt-box"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import Editor from "@monaco-editor/react"

export default function ProjectPage() {
    const [sidebarWidth, setSidebarWidth] = useState(550)
    const [isDragging, setIsDragging] = useState(false)
    const [user, setUser] = useState<{ name: string; email: string; avatar: string } | null>(null)

    // View state: 'preview' or 'code'
    const [activeView, setActiveView] = useState<'preview' | 'code'>('code')
    // Terminal toggle state
    const [isTerminalOpen, setIsTerminalOpen] = useState(false)

    // Simple toggle states for the mock file explorer
    const [isAppOpen, setIsAppOpen] = useState(true)
    const [isComponentsOpen, setIsComponentsOpen] = useState(true)

    const defaultCode = `'use client'

export default function SynthetixFooter() {
  return (
    <footer className="border-t border-white/10 py-16 px-8 text-center bg-[#0a0a0c] relative">
      <div className="font-serif italic text-4xl mb-8 inline-block">
        Synthetix.
      </div>

      <div className="flex justify-center gap-8 mb-16">
        <a href="#" className="text-gray-500 text-sm hover:text-white transition-colors">
          Manifesto
        </a>
        <a href="#" className="text-gray-500 text-sm hover:text-white transition-colors">
          Documentation
        </a>
        <a href="#" className="text-gray-500 text-sm hover:text-white transition-colors">
          HuggingFace
        </a>
        <a href="#" className="text-gray-500 text-sm hover:text-white transition-colors">
          Twitter
        </a>
      </div>

      <div className="text-gray-600 text-xs">
        © 2024 Synthetix Intelligence Labs. All systems operational.
      </div>
    </footer>
  )
}`

    // Setup custom Monaco theme and remove TS errors
    const handleEditorWillMount = (monaco: any) => {
        // 1. Set the custom dark theme to #171717 (Soft Dark Grey)
        monaco.editor.defineTheme('midnight-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#171717',
                'editor.lineHighlightBackground': '#262626',
                'editorLineNumber.foreground': '#525252',
                'editorIndentGuide.background': '#262626',
            }
        });

        // 2. Tell Monaco to expect React JSX
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            jsx: monaco.languages.typescript.JsxEmit.React,
            jsxFactory: 'React.createElement',
            reactNamespace: 'React',
            allowNonTsExtensions: true,
            allowJs: true,
            target: monaco.languages.typescript.ScriptTarget.Latest,
        });

        // 3. Turn off semantic validation to prevent "Cannot find module" red lines
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: false,
        });
    }

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
            if (authUser) {
                setUser({
                    name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User",
                    email: authUser.email || "",
                    avatar: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || "",
                })
            }
        })
    }, [])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return
            const newWidth = Math.min(Math.max(e.clientX, 300), 800)
            setSidebarWidth(newWidth)
        }

        const handleMouseUp = () => setIsDragging(false)

        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
        }
    }, [isDragging])

    return (
        <div className={`flex flex-col h-screen w-full bg-[#121212] text-neutral-100 font-sans antialiased tracking-tight selection:bg-neutral-500/30 overflow-hidden ${isDragging ? 'select-none cursor-col-resize' : ''}`}>

            {/* Top Global Header */}
            <header className="h-14 flex items-center justify-between px-4 bg-[#171717] border-b border-[#262626] shrink-0">
                <div className="flex items-center gap-4">
                    {/* Workspace Selector */}
                    <div className="flex items-center gap-3">
                        <div className="font-bold text-xl tracking-tighter flex items-center text-white">
                            v<span className="text-[17px] -ml-0.5 mt-0.5">0</span>
                        </div>
                        <span className="text-neutral-600 font-light text-xl">/</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-neutral-600" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '3px 3px' }} />
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                        </div>
                    </div>
                </div>

                {/* Right Area */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 text-sm font-medium border-[#262626] text-neutral-300 hover:text-white hover:bg-[#262626]/50 transition-colors bg-transparent">
                        Settings
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 text-sm font-medium border-[#262626] text-neutral-300 hover:text-white hover:bg-[#262626]/50 transition-colors bg-transparent">
                        Share
                    </Button>
                    <Button size="sm" className="h-9 text-sm font-medium bg-white text-black hover:bg-neutral-200 transition-colors flex items-center gap-1.5 px-4">
                        <Globe className="w-4 h-4" /> Publish
                    </Button>
                    <div className="relative ml-1 cursor-pointer">
                        <Avatar className="h-9 w-9 ring-2 ring-transparent transition-all hover:ring-neutral-500/50">
                            <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
                            <AvatarFallback
                                className="bg-neutral-700 text-white text-xs font-semibold"
                                style={{
                                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)`,
                                    backgroundSize: '4px 4px'
                                }}
                            >
                                {user ? (user.name || user.email?.split("@")[0] || "U").slice(0, 2).toUpperCase() : "U"}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </header>

            {/* Main Workspace Area */}
            <div className="flex flex-1 overflow-hidden">

                {/* Left Sidebar (Chat/Prompt) */}
                <aside
                    style={{ width: `${sidebarWidth}px` }}
                    className="flex flex-col bg-[#171717] shrink-0 relative"
                >
                    <div className="flex-1 overflow-y-auto" />

                    {/* Chat Input Container */}
                    <div className="p-4 shrink-0 bg-[#171717] border-t border-[#262626]">
                        <div className="relative">
                            <PromptInputBox
                                placeholder="Ask for a follow up..."
                                className="border-[#262626] shadow-inner w-full !bg-[#121212] focus-within:ring-1 focus-within:ring-neutral-500/30 text-neutral-100 placeholder:text-neutral-500 rounded-lg"
                            />
                        </div>
                    </div>
                </aside>

                {/* Drag Handle Divider */}
                <div
                    onMouseDown={() => setIsDragging(true)}
                    className={`w-1 cursor-col-resize shrink-0 transition-colors z-10 ${isDragging ? 'bg-neutral-500' : 'bg-[#262626] hover:bg-[#333333]'}`}
                />

                {/* Right Workspace */}
                <main className="flex-1 flex flex-col min-w-0 bg-[#121212]">
                    {/* Top Utilities Header (Tabs) */}
                    <div className="h-14 flex items-center justify-between px-4 border-b border-[#262626] shrink-0 bg-[#171717]">
                        <div className="flex items-center gap-1.5">
                            {/* Code Tab */}
                            <button
                                onClick={() => setActiveView('code')}
                                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-colors font-medium border ${activeView === 'code'
                                    ? 'text-neutral-100 bg-[#262626] border-[#333333]'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#262626]/50 border-transparent'
                                    }`}
                            >
                                <CodeXml className="w-4 h-4" /> Code
                            </button>

                            {/* Preview Tab */}
                            <button
                                onClick={() => setActiveView('preview')}
                                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-colors font-medium border ${activeView === 'preview'
                                    ? 'text-neutral-100 bg-[#262626] border-[#333333]'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#262626]/50 border-transparent'
                                    }`}
                            >
                                <Play className="w-4 h-4" /> Preview
                            </button>

                            <div className="w-[1px] h-4 bg-[#262626] mx-1" />

                            <button className="text-neutral-400 hover:text-neutral-200 p-2 rounded-md hover:bg-[#262626]/50 transition-colors ml-1">
                                <Cloud className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Terminal Toggle Button (Icon Only) */}
                            <button
                                onClick={() => {
                                    setActiveView('code'); // Switch to code view if not there
                                    setIsTerminalOpen(!isTerminalOpen); // Toggle terminal
                                }}
                                className={`p-2 rounded-md transition-colors ${isTerminalOpen && activeView === 'code'
                                    ? 'text-neutral-200 bg-[#262626]/80'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#262626]/50'
                                    }`}
                                title="Toggle Terminal"
                            >
                                <TerminalSquare className="w-4 h-4" />
                            </button>

                            <button className="text-neutral-400 hover:text-neutral-200 p-2 rounded-md hover:bg-[#262626]/50 transition-colors">
                                <Download className="w-4 h-4" />
                            </button>
                            <button className="flex items-center gap-2 text-sm text-neutral-300 bg-[#262626] hover:bg-[#333333] px-3 py-1.5 rounded-md border border-[#333333] transition-colors font-medium">
                                <Share className="w-3.5 h-3.5" /> Share
                            </button>
                        </div>
                    </div>

                    {/* Conditional Rendering based on activeView */}
                    <div className="flex flex-1 overflow-hidden relative">

                        {/* --- PREVIEW VIEW --- */}
                        {activeView === 'preview' && (
                            <div className="flex-1 flex flex-col bg-[#121212] relative z-0 w-full h-full animate-in fade-in duration-200">
                                {/* Browser Toolbar */}
                                <div className="h-12 flex items-center px-4 border-b border-[#262626] bg-[#171717] gap-4 shrink-0">
                                    <div className="flex items-center gap-1.5">
                                        <button className="text-neutral-500 hover:text-neutral-300 p-1.5 rounded-md hover:bg-[#262626]/50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                        <button className="text-neutral-500 hover:text-neutral-300 p-1.5 rounded-md hover:bg-[#262626]/50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                                        <button className="text-neutral-500 hover:text-neutral-300 p-1.5 rounded-md hover:bg-[#262626]/50 transition-colors"><RotateCw className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex-1 bg-[#121212] border border-[#262626] rounded-md h-8 flex items-center px-3 shadow-inner">
                                        <Lock className="w-3 h-3 text-neutral-500 mr-2" />
                                        <span className="text-neutral-400 text-xs font-medium">localhost:3000</span>
                                    </div>
                                </div>

                                {/* Canvas */}
                                <div className="flex-1 bg-white m-4 rounded-lg shadow-sm border border-neutral-200 overflow-hidden flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Box className="w-6 h-6 text-neutral-400" />
                                        </div>
                                        <p className="text-neutral-500 font-medium">Preview Canvas</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- CODE VIEW --- */}
                        {activeView === 'code' && (
                            <div className="flex flex-1 w-full h-full animate-in fade-in duration-200">
                                {/* File Explorer Sidebar */}
                                <div className="w-64 flex flex-col bg-[#171717] border-r border-[#262626] shrink-0">
                                    <div className="h-10 flex items-center justify-between px-3 shrink-0">
                                        <span className="text-[11px] font-semibold text-neutral-400 tracking-wider">EXPLORER</span>
                                        <div className="flex items-center gap-1">
                                            <button className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-[#262626]/50 rounded"><Plus className="w-3.5 h-3.5" /></button>
                                            <button className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-[#262626]/50 rounded"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto py-2">
                                        {/* Mock File Tree */}
                                        <div className="flex flex-col">
                                            {/* App Folder */}
                                            <div
                                                className="flex items-center gap-1.5 px-3 py-1 text-sm text-neutral-300 hover:bg-[#262626]/50 cursor-pointer transition-colors"
                                                onClick={() => setIsAppOpen(!isAppOpen)}
                                            >
                                                <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${!isAppOpen && '-rotate-90'}`} />
                                                {isAppOpen ? <FolderOpen className="w-4 h-4 text-neutral-400" /> : <Folder className="w-4 h-4 text-neutral-400" />}
                                                <span>app</span>
                                            </div>
                                            {isAppOpen && (
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 pl-9 pr-3 py-1 text-sm text-neutral-400 hover:bg-[#262626]/50 cursor-pointer">
                                                        <FileCode2 className="w-4 h-4 text-neutral-400" /> globals.css
                                                    </div>
                                                    <div className="flex items-center gap-2 pl-9 pr-3 py-1 text-sm text-neutral-400 hover:bg-[#262626]/50 cursor-pointer">
                                                        <FileCode2 className="w-4 h-4 text-neutral-400" /> layout.tsx
                                                    </div>
                                                    <div className="flex items-center gap-2 pl-9 pr-3 py-1 text-sm text-neutral-400 hover:bg-[#262626]/50 cursor-pointer">
                                                        <FileCode2 className="w-4 h-4 text-neutral-400" /> page.tsx
                                                    </div>
                                                </div>
                                            )}

                                            {/* Components Folder */}
                                            <div
                                                className="flex items-center gap-1.5 px-3 py-1 text-sm text-neutral-300 hover:bg-[#262626]/50 cursor-pointer transition-colors"
                                                onClick={() => setIsComponentsOpen(!isComponentsOpen)}
                                            >
                                                <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${!isComponentsOpen && '-rotate-90'}`} />
                                                {isComponentsOpen ? <FolderOpen className="w-4 h-4 text-neutral-400" /> : <Folder className="w-4 h-4 text-neutral-400" />}
                                                <span>components</span>
                                            </div>
                                            {isComponentsOpen && (
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 pl-9 pr-3 py-1 text-sm text-neutral-100 bg-[#262626]/50 border-l-2 border-l-neutral-400 cursor-pointer">
                                                        <FileCode2 className="w-4 h-4 text-neutral-300" /> synthetix-footer.tsx
                                                    </div>
                                                    <div className="flex items-center gap-2 pl-9 pr-3 py-1 text-sm text-neutral-400 hover:bg-[#262626]/50 cursor-pointer">
                                                        <FileCode2 className="w-4 h-4 text-neutral-400" /> synthetix-hero.tsx
                                                    </div>
                                                    <div className="flex items-center gap-2 pl-9 pr-3 py-1 text-sm text-neutral-400 hover:bg-[#262626]/50 cursor-pointer">
                                                        <FileCode2 className="w-4 h-4 text-neutral-400" /> synthetix-nav.tsx
                                                    </div>
                                                </div>
                                            )}

                                            {/* Root Files */}
                                            <div className="flex items-center gap-2 pl-6 pr-3 py-1 text-sm text-neutral-400 hover:bg-[#262626]/50 cursor-pointer mt-1">
                                                <FileJson className="w-4 h-4 text-neutral-400" /> package.json
                                            </div>
                                            <div className="flex items-center gap-2 pl-6 pr-3 py-1 text-sm text-neutral-400 hover:bg-[#262626]/50 cursor-pointer">
                                                <FileJson className="w-4 h-4 text-neutral-400" /> tsconfig.json
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Editor + Terminal Wrapper */}
                                <div className="flex-1 flex flex-col bg-[#171717] min-w-0 z-10 relative">

                                    {/* Editor Tabs (Now uses #121212 to look like a track) */}
                                    <div className="h-10 bg-[#121212] border-b border-[#262626] flex items-center shrink-0 overflow-x-auto no-scrollbar">

                                        {/* Active Tab */}
                                        <div className="flex items-center gap-2 px-4 h-full bg-[#171717] text-neutral-200 text-sm font-medium cursor-pointer border-r border-[#262626] relative">
                                            {/* Subtle top accent line */}
                                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-neutral-400" />
                                            <FileCode2 className="w-4 h-4 text-neutral-300" />
                                            synthetix-footer.tsx
                                            <button className="ml-2 p-0.5 text-neutral-500 hover:text-neutral-300 hover:bg-[#333333] rounded transition-colors">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                            {/* Bottom cover block to perfectly blend the tab into the #171717 editor below it */}
                                            <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-[#171717]" />
                                        </div>

                                        {/* Inactive Tab */}
                                        <div className="flex items-center gap-2 px-4 h-full text-neutral-500 hover:text-neutral-300 hover:bg-[#171717]/50 text-sm font-medium cursor-pointer transition-colors border-r border-[#262626]">
                                            <FileCode2 className="w-4 h-4 text-neutral-500" />
                                            globals.css
                                        </div>

                                    </div>

                                    {/* Monaco Editor Component - min-h-0 prevents it from pushing terminal off screen */}
                                    <div className="flex-1 min-h-0">
                                        <Editor
                                            height="100%"
                                            language="typescript"
                                            theme="midnight-theme"
                                            value={defaultCode}
                                            beforeMount={handleEditorWillMount}
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 13,
                                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                                lineHeight: 22,
                                                padding: { top: 16 },
                                                scrollBeyondLastLine: false,
                                                smoothScrolling: true,
                                                cursorBlinking: "smooth",
                                                renderLineHighlight: "all",
                                                overviewRulerBorder: false,
                                                hideCursorInOverviewRuler: true,
                                                wordWrap: "on",
                                                scrollbar: {
                                                    verticalScrollbarSize: 8,
                                                    horizontalScrollbarSize: 8,
                                                    verticalHasArrows: false,
                                                    horizontalHasArrows: false,
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* TERMINAL PANEL */}
                                    {isTerminalOpen && (
                                        <div className="h-64 border-t border-[#262626] bg-[#121212] flex flex-col shrink-0 z-20 animate-in slide-in-from-bottom-2 duration-200">
                                            {/* Terminal Header */}
                                            <div className="h-9 flex items-center justify-between px-4 bg-[#171717] border-b border-[#262626]">
                                                <div className="flex items-center gap-6 h-full">
                                                    <div className="text-[11px] font-semibold text-neutral-200 tracking-wider h-full flex items-center border-b-2 border-neutral-400 cursor-pointer">
                                                        TERMINAL
                                                    </div>
                                                    <div className="text-[11px] font-medium text-neutral-500 tracking-wider h-full flex items-center hover:text-neutral-300 cursor-pointer transition-colors">
                                                        OUTPUT
                                                    </div>
                                                    <div className="text-[11px] font-medium text-neutral-500 tracking-wider h-full flex items-center hover:text-neutral-300 cursor-pointer transition-colors">
                                                        PROBLEMS
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button className="text-neutral-500 hover:text-neutral-300 transition-colors">
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setIsTerminalOpen(false)}
                                                        className="text-neutral-500 hover:text-neutral-300 transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Terminal Body */}
                                            <div className="p-4 font-mono text-sm text-neutral-300 flex-1 overflow-y-auto">
                                                {/* Mock Past Command */}
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-green-400 font-medium">user@panxo</span>
                                                    <span className="text-neutral-500 font-bold">:</span>
                                                    <span className="text-blue-400 font-medium">~/project</span>
                                                    <span className="text-neutral-500 font-bold">$</span>
                                                    <span className="text-neutral-300">npm run dev</span>
                                                </div>
                                                <div className="text-neutral-400 mb-1">&gt; project@0.1.0 dev</div>
                                                <div className="text-neutral-400 mb-4">&gt; next dev</div>
                                                <div className="text-green-400 mb-6">ready - started server on 0.0.0.0:3000, url: http://localhost:3000</div>

                                                {/* Active Prompt */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-green-400 font-medium">user@panxo</span>
                                                    <span className="text-neutral-500 font-bold">:</span>
                                                    <span className="text-blue-400 font-medium">~/project</span>
                                                    <span className="text-neutral-500 font-bold">$</span>
                                                    <input
                                                        type="text"
                                                        className="bg-transparent border-none outline-none text-neutral-100 flex-1 focus:ring-0"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        )}

                    </div>
                </main>
            </div>
        </div>
    )
}