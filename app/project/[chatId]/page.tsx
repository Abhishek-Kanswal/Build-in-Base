"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
    ChevronDown, Lock, Play, Settings, Download, Share,
    ChevronLeft, ChevronRight, RotateCw, Smartphone, Monitor, Maximize2,
    CodeXml, X, Box, Globe, FileCode2, Folder, FolderOpen, FileJson,
    Plus, MoreHorizontal, TerminalSquare, ExternalLink, Github, Loader2,
    User, Bot, PanelLeft
} from "lucide-react"

import { PromptInputBox } from "@/components/ai-prompt-box"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import Editor from "@monaco-editor/react"
import Breadcrumb from "@/components/breadcrumb"
import { useParams } from "next/navigation"
import { TaskWidget, type TaskData } from '@/components/ui/task-widget-disclosure-base';

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    created_at: string
}

const MOCK_DATA: TaskData = {
    title: "Design System",
    progress: 75,
    completedCount: 3,
    totalCount: 4,
    priority: "Urgent",
    status: "In Progress",
    subtasks: [
        { id: '1', title: "Design Tokens", completed: true },
        { id: '2', title: "Color System", completed: true },
        { id: '3', title: "Type System", completed: true },
        { id: '4', title: "Documentation", completed: false },
    ],
    assignees: [
        { name: "Chloe", avatar: "https://i.pravatar.cc/150?u=chloe", color: "bg-white dark:bg-gray-900" },
        { name: "Anna", avatar: "https://i.pravatar.cc/150?u=anna", color: "bg-white" },
        { name: "Ramesh", avatar: "https://i.pravatar.cc/150?u=ramesh", color: "bg-white" },
    ]
};

export default function ProjectPage() {
    const params = useParams()
    const chatId = params.chatId as string

    const [sidebarWidth, setSidebarWidth] = useState(550)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isDragging, setIsDragging] = useState(false)
    const [user, setUser] = useState<{ name: string; email: string; avatar: string } | null>(null)
    const [selectedVersion, setSelectedVersion] = useState("v1.0.0")
    const [isCommitting, setIsCommitting] = useState(false)

    // Chat messages
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoadingMessages, setIsLoadingMessages] = useState(true)
    const [projectTitle, setProjectTitle] = useState("Project")
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // View state: 'preview' or 'code'
    const [activeView, setActiveView] = useState<'preview' | 'code'>('preview')

    // Preview device state: 'desktop' or 'mobile'
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')

    // Terminal toggle state
    const [isTerminalOpen, setIsTerminalOpen] = useState(false)

    // Simple toggle states for the mock file explorer
    const [isAppOpen, setIsAppOpen] = useState(true)
    const [isComponentsOpen, setIsComponentsOpen] = useState(true)

    // State for mock open tabs
    const [openFiles, setOpenFiles] = useState([
        { id: 'synthetix-footer.tsx', name: 'synthetix-footer.tsx', type: 'code' },
        { id: 'globals.css', name: 'globals.css', type: 'code' }
    ])
    const [activeFile, setActiveFile] = useState('synthetix-footer.tsx')

    const handleOpenFile = (fileName: string, type: 'code' | 'json' = 'code') => {
        if (!openFiles.find(f => f.id === fileName)) {
            setOpenFiles([...openFiles, { id: fileName, name: fileName, type }])
        }
        setActiveFile(fileName)
    }

    const handleCloseFile = (e: React.MouseEvent, fileName: string) => {
        e.stopPropagation()
        const newFiles = openFiles.filter(f => f.id !== fileName)
        setOpenFiles(newFiles)
        if (activeFile === fileName) {
            setActiveFile(newFiles.length > 0 ? newFiles[newFiles.length - 1].id : '')
        }
    }

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

        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            jsx: monaco.languages.typescript.JsxEmit.React,
            jsxFactory: 'React.createElement',
            reactNamespace: 'React',
            allowNonTsExtensions: true,
            allowJs: true,
            target: monaco.languages.typescript.ScriptTarget.Latest,
        });

        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: false,
        });
    }

    const handleCommitToGithub = async () => {
        setIsCommitting(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsCommitting(false);
        console.log("Committed to GitHub successfully!");
    }

    // Fetch user
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

    // Fetch project and messages
    useEffect(() => {
        if (!chatId) return

        const supabase = createClient()

        const fetchData = async () => {
            setIsLoadingMessages(true)

            // Fetch project title
            const { data: project } = await supabase
                .from("projects")
                .select("title")
                .eq("id", chatId)
                .single()

            if (project) {
                setProjectTitle(project.title)
            }

            // Fetch messages
            const { data: msgs, error } = await supabase
                .from("messages")
                .select("*")
                .eq("project_id", chatId)
                .order("created_at", { ascending: true })

            if (error) {
                console.error("Error fetching messages:", error)
            } else {
                setMessages(msgs || [])
            }

            setIsLoadingMessages(false)
        }

        fetchData()
    }, [chatId])

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Handle sending follow-up messages
    const handleSendMessage = async (message: string) => {
        if (!message.trim() || !chatId) return

        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return

        const { data: newMsg, error } = await supabase
            .from("messages")
            .insert({
                project_id: chatId,
                user_id: authUser.id,
                role: "user",
                content: message.trim(),
            })
            .select()
            .single()

        if (error) {
            console.error("Error sending message:", error)
            return
        }

        if (newMsg) {
            setMessages((prev) => [...prev, newMsg])
        }
    }

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
            <header className="h-14 flex items-center justify-between px-4 bg-[#171717] border-b border-[#262626] shrink-0 relative">
                <div className="flex items-center gap-4">
                    <Breadcrumb>
                        <Breadcrumb.Item className="text-sm text-neutral-400 hover:text-neutral-200 cursor-pointer transition-colors">
                            <a href="/">Projects</a>
                        </Breadcrumb.Item>
                        <Breadcrumb.Divider className="text-neutral-500 w-3.5 h-3.5" />
                        <Breadcrumb.Item active className="text-sm text-neutral-100">{projectTitle}</Breadcrumb.Item>
                    </Breadcrumb>
                </div>

                {/* Middle Area: Version Selector */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 text-neutral-400 hover:text-neutral-200 hover:bg-[#262626] font-medium flex items-center gap-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-[#262626] data-[state=open]:text-neutral-200 transition-colors">
                                {selectedVersion}
                                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="bg-[#171717] border-[#262626] text-neutral-200 min-w-[120px]">
                            <DropdownMenuItem className="hover:bg-[#262626] focus:bg-[#262626] cursor-pointer" onClick={() => setSelectedVersion("v1.0.0")}>
                                v1.0.0
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-[#262626] focus:bg-[#262626] cursor-pointer" onClick={() => setSelectedVersion("v1.0.1")}>
                                v1.0.1
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-[#262626] focus:bg-[#262626] cursor-pointer" onClick={() => setSelectedVersion("v2.0.0")}>
                                v2.0.0
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Right Area */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 text-sm font-medium border-[#262626] text-neutral-300 hover:text-white hover:bg-[#262626]/50 transition-colors bg-transparent">
                        Settings
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCommitToGithub}
                        disabled={isCommitting}
                        className="h-9 text-sm font-medium border-[#262626] text-neutral-300 hover:text-white hover:bg-[#262626]/50 transition-colors bg-transparent flex items-center gap-1.5 px-3"
                    >
                        {isCommitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
                        {isCommitting ? "Committing..." : "Commit"}
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

                {/* Left Sidebar (Chat/Prompt) with Framer Motion Animation */}
                <motion.aside
                    animate={{ width: isSidebarOpen ? sidebarWidth : 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                    className="flex flex-col bg-[#171717] shrink-0 relative overflow-hidden z-10"
                >
                    {/* Inner wrapper with fixed width to prevent content squishing during animation */}
                    <div style={{ width: sidebarWidth }} className="flex flex-col h-full bg-[#171717]">
                        {/* Chat Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#333] hover:[&::-webkit-scrollbar-thumb]:bg-[#555] [&::-webkit-scrollbar-thumb]:rounded-full">
                            {isLoadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
                                    No messages yet. Start a conversation below.
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {msg.role === "assistant" && (
                                            <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-600 flex items-center justify-center mt-0.5">
                                                <Bot className="w-4 h-4 text-neutral-300" />
                                            </div>
                                        )}
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                                                ? "bg-[#333333] text-neutral-100 border border-[#404040] rounded-br-md"
                                                : "bg-[#262626] text-neutral-200 rounded-bl-md"
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input Container */}
                        <div className="p-4 shrink-0 bg-[#171717] border-t border-[#262626]">
                            <div className="relative">
                                <PromptInputBox
                                    placeholder="Ask for a follow up..."
                                    className="border-[#262626] shadow-inner w-full !bg-[#121212] focus-within:ring-1 focus-within:ring-neutral-500/30 text-neutral-100 placeholder:text-neutral-500 rounded-lg"
                                    onSend={(message) => handleSendMessage(message)}
                                />
                            </div>
                        </div>
                    </div>
                </motion.aside>

                {/* Drag Handle Divider (Hidden when sidebar is closed) */}
                {isSidebarOpen && (
                    <div
                        onMouseDown={() => setIsDragging(true)}
                        className={`w-1 cursor-col-resize shrink-0 transition-colors z-20 ${isDragging ? 'bg-neutral-500' : 'bg-[#262626] hover:bg-[#333333]'}`}
                    />
                )}

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

                            {/* Sidebar Toggle Button */}
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className={`p-2 rounded-md transition-colors ml-1 ${!isSidebarOpen
                                    ? 'text-neutral-200 bg-[#262626]/80'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#262626]/50'
                                    }`}
                                title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                            >
                                <PanelLeft className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Terminal Toggle Button (Icon Only) */}
                            <button
                                onClick={() => {
                                    setActiveView('code');
                                    setIsTerminalOpen(!isTerminalOpen);
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

                                    {/* Address Bar */}
                                    <div className="flex-1 bg-[#121212] border border-[#262626] rounded-md h-8 flex items-center justify-between px-3 shadow-inner">
                                        <div className="flex items-center">
                                            <Lock className="w-3 h-3 text-neutral-500 mr-2" />
                                            <span className="text-neutral-400 text-xs font-medium">localhost:3000</span>
                                        </div>
                                        <button className="text-neutral-500 hover:text-neutral-300 transition-colors" title="Open in new tab">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Viewport Toggles */}
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <button
                                            onClick={() => setPreviewMode('mobile')}
                                            className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'text-neutral-200 bg-[#262626]' : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#262626]/50'}`}
                                            title="Mobile view"
                                        >
                                            <Smartphone className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setPreviewMode('desktop')}
                                            className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'text-neutral-200 bg-[#262626]' : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#262626]/50'}`}
                                            title="Desktop view"
                                        >
                                            <Monitor className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Canvas */}
                                <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
                                    <div
                                        className={`bg-[#0A0A0A] rounded-lg shadow-sm  overflow-hidden flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${previewMode === 'mobile'
                                            ? 'w-[375px] h-[812px] flex-none'
                                            : 'w-full h-full'
                                            }`}
                                    >
                                        <div className="text-center">
                                            <div className="flex justify-center items-center">
                                                <TaskWidget data={MOCK_DATA} />
                                            </div>
                                        </div>
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
                                    <div className="flex-1 overflow-y-auto py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#333] hover:[&::-webkit-scrollbar-thumb]:bg-[#555] [&::-webkit-scrollbar-thumb]:rounded-full">
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
                                                    {['globals.css', 'layout.tsx', 'page.tsx'].map(fileName => (
                                                        <div
                                                            key={fileName}
                                                            onClick={() => handleOpenFile(fileName, 'code')}
                                                            className={`flex items-center gap-2 pl-9 pr-3 py-1 text-sm cursor-pointer transition-colors ${activeFile === fileName ? 'text-neutral-100 bg-[#262626]/50 border-l-2 border-l-neutral-400' : 'text-neutral-400 hover:bg-[#262626]/50 border-l-2 border-transparent'}`}
                                                        >
                                                            <FileCode2 className={`w-4 h-4 ${activeFile === fileName ? 'text-neutral-300' : 'text-neutral-400'}`} /> {fileName}
                                                        </div>
                                                    ))}
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
                                                    {['synthetix-footer.tsx', 'synthetix-hero.tsx', 'synthetix-nav.tsx'].map(fileName => (
                                                        <div
                                                            key={fileName}
                                                            onClick={() => handleOpenFile(fileName, 'code')}
                                                            className={`flex items-center gap-2 pl-9 pr-3 py-1 text-sm cursor-pointer transition-colors ${activeFile === fileName ? 'text-neutral-100 bg-[#262626]/50 border-l-2 border-l-neutral-400' : 'text-neutral-400 hover:bg-[#262626]/50 border-l-2 border-transparent'}`}
                                                        >
                                                            <FileCode2 className={`w-4 h-4 ${activeFile === fileName ? 'text-neutral-300' : 'text-neutral-400'}`} /> {fileName}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Root Files */}
                                            <div className="mt-1">
                                                {['package.json', 'tsconfig.json'].map(fileName => (
                                                    <div
                                                        key={fileName}
                                                        onClick={() => handleOpenFile(fileName, 'json')}
                                                        className={`flex items-center gap-2 pl-6 pr-3 py-1 text-sm cursor-pointer transition-colors ${activeFile === fileName ? 'text-neutral-100 bg-[#262626]/50 border-l-2 border-l-neutral-400' : 'text-neutral-400 hover:bg-[#262626]/50 border-l-2 border-transparent'}`}
                                                    >
                                                        <FileJson className={`w-4 h-4 ${activeFile === fileName ? 'text-neutral-300' : 'text-neutral-400'}`} /> {fileName}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Editor + Terminal Wrapper */}
                                <div className="flex-1 flex flex-col bg-[#171717] min-w-0 z-10 relative">

                                    {/* Editor Tabs */}
                                    <div className="h-10 bg-[#121212] border-b border-[#262626] flex items-center shrink-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-700 hover:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [&::-webkit-scrollbar-thumb]:rounded-full">

                                        {openFiles.map(file => (
                                            <div
                                                key={file.id}
                                                onClick={() => setActiveFile(file.id)}
                                                onMouseDown={(e) => {
                                                    if (e.button === 1) {
                                                        e.preventDefault();
                                                        handleCloseFile(e, file.id);
                                                    }
                                                }}
                                                className={`group flex items-center gap-2 px-4 h-full text-sm font-medium cursor-pointer border-r border-[#262626] relative transition-colors ${activeFile === file.id ? 'bg-[#171717] text-neutral-200' : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#171717]/50'}`}
                                            >
                                                {activeFile === file.id && (
                                                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-neutral-400" />
                                                )}
                                                {file.type === 'json' ? (
                                                    <FileJson className={`w-4 h-4 ${activeFile === file.id ? 'text-neutral-300' : 'text-neutral-500'}`} />
                                                ) : (
                                                    <FileCode2 className={`w-4 h-4 ${activeFile === file.id ? 'text-neutral-300' : 'text-neutral-500'}`} />
                                                )}
                                                {file.name}
                                                <button
                                                    onClick={(e) => handleCloseFile(e, file.id)}
                                                    className={`ml-2 p-0.5 rounded transition-colors ${activeFile === file.id ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#333333]' : 'opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-neutral-300 hover:bg-[#333333]'}`}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                                {activeFile === file.id && (
                                                    <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-[#171717]" />
                                                )}
                                            </div>
                                        ))}

                                    </div>

                                    {/* Monaco Editor */}
                                    <div className="flex-1 min-h-0">
                                        {openFiles.length > 0 ? (
                                            <Editor
                                                height="100%"
                                                language={activeFile.endsWith('.json') ? "json" : activeFile.endsWith('.css') ? "css" : "typescript"}
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
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 bg-[#121212]">
                                                <CodeXml className="w-12 h-12 mb-4 opacity-50" />
                                                <p className="font-medium text-sm">Select a file to view its contents</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* TERMINAL PANEL */}
                                    {isTerminalOpen && (
                                        <div className="h-64 border-t border-[#262626] bg-[#121212] flex flex-col shrink-0 z-20 animate-in slide-in-from-bottom-2 duration-200">
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

                                            <div className="p-4 font-mono text-sm text-neutral-300 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#333] hover:[&::-webkit-scrollbar-thumb]:bg-[#555] [&::-webkit-scrollbar-thumb]:rounded-full">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-neutral-200 font-medium">user@panxo</span>
                                                    <span className="text-neutral-500 font-bold">:</span>
                                                    <span className="text-neutral-400 font-medium">~/project</span>
                                                    <span className="text-neutral-500 font-bold">$</span>
                                                    <span className="text-white">npm run dev</span>
                                                </div>
                                                <div className="text-neutral-500 mb-1">&gt; project@0.1.0 dev</div>
                                                <div className="text-neutral-500 mb-4">&gt; next dev</div>
                                                <div className="text-neutral-300 mb-6">ready - started server on 0.0.0.0:3000, url: http://localhost:3000</div>

                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-neutral-200 font-medium">user@panxo</span>
                                                    <span className="text-neutral-500 font-bold">:</span>
                                                    <span className="text-neutral-400 font-medium">~/project</span>
                                                    <span className="text-neutral-500 font-bold">$</span>
                                                    <input
                                                        type="text"
                                                        className="bg-transparent border-none outline-none text-white flex-1 focus:ring-0"
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