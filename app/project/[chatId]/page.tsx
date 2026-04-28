"use client"

import React, { useMemo, useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { AnsiUp } from 'ansi_up'
import {
    ChevronDown, Lock, Play, Settings, Download, Share,
    ChevronLeft, ChevronRight, RotateCw, Smartphone, Monitor, Maximize2,
    CodeXml, X, Box, Globe,
    Plus, MoreHorizontal, TerminalSquare, ExternalLink, Github, Loader2,
    User, Bot, PanelLeft, Copy, Search, GitBranch, Bug, Blocks, Sparkles
} from "lucide-react"

import { MaterialIcon } from "@/lib/material-icons"

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
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useParams } from "next/navigation"
import type { WebContainerProcess } from "@webcontainer/api"

import { useWebContainer } from "@/hooks/use-webcontainer"
import { applyBoltActionsToFiles, buildFilesFromResponses, type FileMap } from "@/lib/builder/bolt"
import { buildWebContainerTree, fileMapToTree, type FileTreeNode } from "@/lib/builder/webcontainer"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    created_at: string
}

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

    const { webcontainer, isBooting } = useWebContainer()
    const [previewUrl, setPreviewUrl] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [terminalLogs, setTerminalLogs] = useState<string[]>([])
    const [filesByPath, setFilesByPath] = useState<FileMap>({})
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
        app: true,
        components: true,
        src: true,
    })

    const webcontainerProcessRef = useRef<WebContainerProcess | null>(null)
    const isServerRunningRef = useRef(false)
    const templatePromptsRef = useRef<string[]>([])
    const templateUiPromptRef = useRef("")
    const hasHydratedRef = useRef(false)

    const [openFiles, setOpenFiles] = useState<{ id: string; name: string; type: "code" | "json" }[]>([])
    const [activeFile, setActiveFile] = useState("")

    const fileTree = useMemo(() => fileMapToTree(filesByPath), [filesByPath])
    const activeFileContent = activeFile ? filesByPath[activeFile] ?? "" : ""
    const ansiUp = useMemo(() => new AnsiUp(), [])
    const shikiMonacoInitRef = useRef<Promise<void> | null>(null)
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

    const renderAssistantMessage = (content: string) => {
        const paragraphs = content.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 0)

        return paragraphs.map((paragraph, paragraphIndex) => {
            const lines = paragraph.split("\n")

            return (
                <p key={`paragraph-${paragraphIndex}`} className={paragraphIndex > 0 ? "mt-3" : ""}>
                    {lines.map((line, lineIndex) => (
                        <React.Fragment key={`line-${paragraphIndex}-${lineIndex}`}>
                            {line}
                            {lineIndex < lines.length - 1 && <br />}
                        </React.Fragment>
                    ))}
                </p>
            )
        })
    }

    const appendTerminalOutput = (chunk: string) => {
        const lines = chunk.split(/\r?\n|\r/)
        const visibleLines = lines.filter((line) => {
            const trimmed = line.trim()
            if (!trimmed) return false
            if (/^[\\|/\-]+$/.test(trimmed)) return false
            return true
        })

        if (visibleLines.length === 0) return

        setTerminalLogs((prev) => [...prev, ...visibleLines])
    }

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

    const defaultCode = "// Generated files will appear here"

    // Setup Monaco TypeScript compiler options and Shiki syntax highlighting.
    const handleEditorWillMount = (monaco: any) => {
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

    const initializeShikiMonaco = async (monaco: any) => {
        if (!shikiMonacoInitRef.current) {
            shikiMonacoInitRef.current = (async () => {
                const [{ createHighlighter }, { shikiToMonaco }] = await Promise.all([
                    import("shiki"),
                    import("@shikijs/monaco"),
                ])

                const languages = ["typescript", "javascript", "json", "css", "html", "tsx", "jsx"]
                const highlighter = await createHighlighter({
                    themes: ["vitesse-dark"],
                    langs: languages,
                })

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

    useEffect(() => {
        if (isLoadingMessages || hasHydratedRef.current || messages.length === 0) {
            return
        }

        hasHydratedRef.current = true
        hydrateProjectFiles(messages).catch((error) => {
            console.error("Failed to hydrate project files:", error)
            setIsGenerating(false)
            setMessages((prev) => [...prev, {
                id: "error-" + Date.now(),
                role: "assistant",
                content: `An error occurred during generation. Please check your API keys and provider models. Details: ${error.message || String(error)}`,
                created_at: new Date().toISOString()
            }])
        })
    }, [isLoadingMessages, messages])

    const prevFilesRef = useRef<FileMap>({})

    useEffect(() => {
        if (!webcontainer || Object.keys(filesByPath).length === 0) {
            return
        }

        if (filesByPath === prevFilesRef.current) {
            return
        }

        const run = async () => {
            try {
                if (isServerRunningRef.current) {
                    const prevFiles = prevFilesRef.current;
                    for (const [path, content] of Object.entries(filesByPath)) {
                        if (prevFiles[path] !== content) {
                            const dir = path.split('/').slice(0, -1).join('/');
                            if (dir) {
                                await webcontainer.fs.mkdir(dir, { recursive: true }).catch(() => {});
                            }
                            await webcontainer.fs.writeFile(path, content);
                        }
                    }
                    for (const path of Object.keys(prevFiles)) {
                        if (!(path in filesByPath)) {
                            await webcontainer.fs.rm(path, { force: true }).catch(() => {});
                        }
                    }
                    prevFilesRef.current = filesByPath;
                    return;
                }

                // Mount new files to WebContainer. Hot reloading handles changes via Vite/Next.
                await webcontainer.mount(buildWebContainerTree(filesByPath))
                prevFilesRef.current = filesByPath;

                isServerRunningRef.current = true

                webcontainer.on("server-ready", (_port, url) => {
                    setPreviewUrl((prev) => prev !== url ? url : prev)
                })

                setTerminalLogs(["$ npm install --no-progress --loglevel=error"])

                const installProcess = await webcontainer.spawn("npm", ["install", "--no-progress", "--loglevel=error"], {
                    env: {
                        NPM_CONFIG_PROGRESS: "false",
                        npm_config_progress: "false",
                    },
                })
                installProcess.output.pipeTo(
                    new WritableStream({
                        write(data) {
                            appendTerminalOutput(String(data))
                        },
                    })
                )
                await installProcess.exit

                setTerminalLogs((prev) => [...prev, "$ npm run dev"])
                const devProcess = await webcontainer.spawn("npm", ["run", "dev"])
                webcontainerProcessRef.current = devProcess
                devProcess.output.pipeTo(
                    new WritableStream({
                        write(data) {
                            appendTerminalOutput(String(data))
                        },
                    })
                )
            } catch (error) {
                console.error("Failed to run project in WebContainer", error)
                isServerRunningRef.current = false
            }
        }

        run()
    }, [webcontainer, filesByPath])

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const appendGeneratedFiles = (response: string) => {
        setFilesByPath((prev) => {
            const next = applyBoltActionsToFiles(prev, response)
            const filePaths = Object.keys(next)
            if (filePaths.length > 0 && !activeFile) {
                const firstFile = filePaths[0]
                setOpenFiles([{ id: firstFile, name: firstFile.split("/").pop() ?? firstFile, type: firstFile.endsWith(".json") ? "json" : "code" }])
                setActiveFile(firstFile)
            }
            return next
        })
    }

    const ensureTemplateContext = async (seedPrompt: string) => {
        if (templatePromptsRef.current.length > 0 && templateUiPromptRef.current) {
            return
        }

        const response = await fetch("/api/template", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: seedPrompt }),
        })

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Failed to get template: ${response.status} ${response.statusText} - ${errBody}`)
        }

        const data = await response.json()
        templatePromptsRef.current = Array.isArray(data.prompts) ? data.prompts : []
        templateUiPromptRef.current = Array.isArray(data.uiPrompts) ? data.uiPrompts[0] ?? "" : ""
    }

    const generateAssistantFromConversation = async (conversation: Message[]) => {
        const userMessages = conversation.filter((msg) => msg.role === "user")
        if (userMessages.length === 0) {
            return null
        }

        await ensureTemplateContext(userMessages[0].content)

        setIsGenerating(true)
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    ...templatePromptsRef.current.map((content) => ({ role: "user", content })),
                    ...conversation.map((msg) => ({
                        role: msg.role,
                        content: msg.content,
                    }))
                ],
            }),
        })

        setIsGenerating(false)

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Failed to generate response: ${response.status} ${response.statusText} - ${errBody}`)
        }

        const data = await response.json()
        const assistantContent = data.response as string
        appendGeneratedFiles(assistantContent)
        return assistantContent
    }

    const hydrateProjectFiles = async (conversation: Message[]) => {
        const userMessages = conversation.filter((msg) => msg.role === "user")
        const assistantMessages = conversation.filter((msg) => msg.role === "assistant")

        if (userMessages.length === 0) {
            return
        }

        await ensureTemplateContext(userMessages[0].content)

        if (assistantMessages.length > 0) {
            const bootFiles = buildFilesFromResponses([
                templateUiPromptRef.current,
                ...assistantMessages.map((msg) => msg.content),
            ])
            setFilesByPath(bootFiles)

            const filePaths = Object.keys(bootFiles)
            if (filePaths.length > 0 && !activeFile) {
                const firstFile = filePaths[0]
                setOpenFiles([{ id: firstFile, name: firstFile.split("/").pop() ?? firstFile, type: firstFile.endsWith(".json") ? "json" : "code" }])
                setActiveFile(firstFile)
            }
            return
        }

        const assistantContent = await generateAssistantFromConversation(conversation)
        if (!assistantContent) {
            return
        }

        const bootFiles = buildFilesFromResponses([
            templateUiPromptRef.current,
            assistantContent,
        ])
        setFilesByPath(bootFiles)

        const filePaths = Object.keys(bootFiles)
        if (filePaths.length > 0 && !activeFile) {
            const firstFile = filePaths[0]
            setOpenFiles([{ id: firstFile, name: firstFile.split("/").pop() ?? firstFile, type: firstFile.endsWith(".json") ? "json" : "code" }])
            setActiveFile(firstFile)
        }

        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
            return
        }

        const { data: assistantMsg } = await supabase
            .from("messages")
            .insert({
                project_id: chatId,
                user_id: authUser.id,
                role: "assistant",
                content: assistantContent,
            })
            .select()
            .single()

        if (assistantMsg) {
            setMessages((prev) => [...prev, assistantMsg])
        }
    }

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

        if (error || !newMsg) {
            console.error("Error sending message:", error)
            return
        }

        const nextConversation = [...messages, newMsg]
        setMessages(nextConversation)

        try {
            const assistantContent = await generateAssistantFromConversation(nextConversation)
            if (!assistantContent) {
                return
            }

            const { data: assistantMsg } = await supabase
                .from("messages")
                .insert({
                    project_id: chatId,
                    user_id: authUser.id,
                    role: "assistant",
                    content: assistantContent,
                })
                .select()
                .single()

            if (assistantMsg) {
                setMessages((prev) => [...prev, assistantMsg])
            }
        } catch (generationError: any) {
            console.error("Error generating follow-up:", generationError)
            setIsGenerating(false)
            setMessages((prev) => [...prev, {
                id: "error-" + Date.now(),
                role: "assistant",
                content: `An error occurred generating a response constraint. Details: ${generationError?.message || String(generationError)}`,
                created_at: new Date().toISOString()
            }])
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

    const renderFileTree = (nodes: FileTreeNode[], depth = 0) => {
        return nodes.map((node) => {
            if (node.type === "folder") {
                const isExpanded = expandedFolders[node.path] ?? depth < 1
                return (
                    <div key={node.path}>
                        <div
                            className="flex items-center gap-1.5 px-3 py-1 text-sm text-neutral-300 hover:bg-[#262626]/50 cursor-pointer transition-colors"
                            style={{ paddingLeft: `${12 + depth * 16}px` }}
                            onClick={() => {
                                setExpandedFolders((prev) => ({
                                    ...prev,
                                    [node.path]: !isExpanded,
                                }))
                            }}
                        >
                            <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${!isExpanded ? "-rotate-90" : ""}`} />
                            <MaterialIcon name={node.name} type="folder" isOpen={isExpanded} className="w-4 h-4 text-neutral-400" />
                            <span>{node.name}</span>
                        </div>
                        {isExpanded && node.children && (
                            <div className="relative flex flex-col">
                                <div
                                    className="absolute top-0 bottom-0 w-px bg-neutral-700/70"
                                    style={{ left: `${32 + depth * 16}px` }}
                                />
                                <div className="relative flex flex-col">{renderFileTree(node.children, depth + 1)}</div>
                            </div>
                        )}
                    </div>
                )
            }

            const fileName = node.path.split("/").pop() ?? node.path
            const isJson = fileName.endsWith(".json")
            return (
                <div
                    key={node.path}
                    onClick={() => handleOpenFile(node.path, isJson ? "json" : "code")}
                    style={{ paddingLeft: `${24 + depth * 16}px` }}
                    className={`flex items-center gap-2 pr-3 py-1 text-sm cursor-pointer transition-colors ${activeFile === node.path ? "text-neutral-100 bg-[#262626]/50 border-l-2 border-l-neutral-400" : "text-neutral-400 hover:bg-[#262626]/50 border-l-2 border-transparent"}`}
                >
                    <MaterialIcon name={fileName} type="file" className={`w-4 h-4 ${activeFile === node.path ? "text-neutral-300" : "text-neutral-400"}`} />
                    {fileName}
                </div>
            )
        })
    }

    return (
        <div className={`flex h-screen w-full bg-[#121212] text-neutral-100 font-sans antialiased tracking-tight selection:bg-neutral-500/30 overflow-hidden ${isDragging ? 'select-none cursor-col-resize' : ''}`}>

            {/* Activity Bar (Project Sidebar - Top to Bottom) */}
            <div className="w-14 flex-shrink-0 bg-[#0A0A0A] border-r border-[#2E2F2F] flex flex-col items-center z-20">
                {/* Logo Area */}
                <div className="h-14 w-full flex items-center justify-center border-b border-[#2E2F2F] shrink-0">
                    <a href="/" className="flex items-center justify-center">
                        <img src="/logo.png" alt="Build in Base" className="w-8 h-8 object-contain" />
                    </a>
                </div>

                <div className="flex flex-col gap-6 w-full items-center pt-4">
                    <button className="text-neutral-300 relative group w-full flex justify-center focus:outline-none">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-8 bg-[#007acc] rounded-r-md"></div>
                        <Copy className="w-6 h-6 stroke-[1.5]" />
                    </button>
                    <button className="text-neutral-500 hover:text-neutral-300 transition-colors relative group w-full flex justify-center focus:outline-none">
                        <Search className="w-6 h-6 stroke-[1.5]" />
                    </button>
                    <button className="text-neutral-500 hover:text-neutral-300 transition-colors relative group w-full flex justify-center focus:outline-none">
                        <GitBranch className="w-6 h-6 stroke-[1.5]" />
                        <div className="absolute -top-1.5 right-1.5 bg-[#007acc] text-white text-[10px] rounded-full w-[18px] h-[18px] flex items-center justify-center font-medium border-2 border-[#0A0A0A]">
                            10
                        </div>
                    </button>
                    <button className="text-neutral-500 hover:text-neutral-300 transition-colors relative group w-full flex justify-center focus:outline-none">
                        <Bug className="w-6 h-6 stroke-[1.5]" />
                    </button>
                    <button className="text-neutral-500 hover:text-neutral-300 transition-colors relative group w-full flex justify-center focus:outline-none">
                        <Blocks className="w-6 h-6 stroke-[1.5]" />
                    </button>
                </div>

                <div className="mt-auto flex flex-col gap-6 w-full items-center mb-4">
                    <button className="text-neutral-500 hover:text-neutral-300 transition-colors relative group w-full flex justify-center focus:outline-none">
                        <Sparkles className="w-6 h-6 stroke-[1.5]" />
                    </button>
                </div>
            </div>

            {/* Right Side Wrap (Header + Workspace) */}
            <div className="flex flex-col flex-1 min-w-0">

                {/* Top Global Header */}
                <header className="h-14 flex items-center justify-between px-4 bg-[#0A0A0A] border-b border-[#262626] shrink-0 relative">
                    <div className="flex items-center gap-4">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/" className="text-sm text-neutral-400 hover:text-neutral-200 cursor-pointer transition-colors">Projects</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="text-neutral-500" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="text-sm text-neutral-100">{projectTitle}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
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
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {isLoadingMessages ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
                                        No messages yet. Start a conversation below.
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        let displayContent = msg.content;
                                        if (msg.role === "assistant") {
                                            displayContent = msg.content.replace(/<boltArtifact[^>]*>[\s\S]*?<\/boltArtifact>/g, (match) => {
                                                const actionMatch = match.match(/<boltAction[^>]*>/g);
                                                const count = actionMatch ? actionMatch.length : 0;
                                                return `\n\n*Generated ${count} steps/files...*\n\n`;
                                            }).trim();
                                        }

                                        return (
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
                                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${msg.role === "user"
                                                    ? "bg-[#333333] text-neutral-100 border border-[#404040] rounded-br-md whitespace-pre-wrap"
                                                    : "bg-[#262626] text-neutral-200 rounded-bl-md"
                                                    }`}
                                            >
                                                {msg.role === "assistant" ? (
                                                    <div className="space-y-3">
                                                        {renderAssistantMessage(displayContent)}
                                                    </div>
                                                ) : (
                                                    displayContent
                                                )}
                                            </div>
                                        </div>
                                    )})
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
                            <div className={`flex-1 flex flex-col bg-[#121212] relative z-0 w-full h-full animate-in fade-in duration-200 ${activeView === 'preview' ? '' : 'hidden'}`}>
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
                                                <span className="text-neutral-400 text-xs font-medium">{previewUrl || "localhost:3000"}</span>
                                            </div>
                                            <button
                                                className="text-neutral-500 hover:text-neutral-300 transition-colors"
                                                title="Open in new tab"
                                                onClick={() => {
                                                    if (previewUrl) {
                                                        window.open(previewUrl, "_blank", "noopener,noreferrer")
                                                    }
                                                }}
                                            >
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
                                            {previewUrl ? (
                                                <iframe title="Live preview" src={previewUrl} className="w-full h-full border-0" />
                                            ) : (
                                                <div className="text-center text-neutral-400 px-4">
                                                    {(isBooting || isGenerating) ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            <p>Generating and booting preview...</p>
                                                        </div>
                                                    ) : (
                                                        <p>Send a prompt to generate files and start preview.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                            </div>

                            {/* --- CODE VIEW --- */}
                            <div className={`flex flex-1 w-full h-full animate-in fade-in duration-200 ${activeView === 'code' ? '' : 'hidden'}`}>
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
                                                {fileTree.length > 0 ? renderFileTree(fileTree) : (
                                                    <div className="px-3 py-2 text-xs text-neutral-500">No generated files yet.</div>
                                                )}
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
                                                        <MaterialIcon name={file.name} type="file" className={`w-4 h-4 ${activeFile === file.id ? 'text-neutral-300' : 'text-neutral-500'}`} />
                                                    ) : (
                                                        <MaterialIcon name={file.name} type="file" className={`w-4 h-4 ${activeFile === file.id ? 'text-neutral-300' : 'text-neutral-500'}`} />
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
                                                    language={activeEditorLanguage}
                                                    theme="vitesse-dark"
                                                    value={activeFileContent || defaultCode}
                                                    onChange={(value) => {
                                                        if (value !== undefined) {
                                                            setFilesByPath(prev => ({
                                                                ...prev,
                                                                [activeFile]: value
                                                            }))
                                                        }
                                                    }}
                                                    beforeMount={handleEditorWillMount}
                                                    onMount={(_, monaco) => {
                                                        void initializeShikiMonaco(monaco)
                                                    }}
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
                                                    {terminalLogs.length > 0 ? terminalLogs.map((line, index) => (
                                                        <div 
                                                            key={`${index}-${line.slice(0, 20)}`} 
                                                            className="whitespace-pre-wrap break-words"
                                                            dangerouslySetInnerHTML={{ __html: ansiUp.ansi_to_html(line) }}
                                                        />
                                                    )) : (
                                                        <div className="text-neutral-500">Terminal is idle.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                            </div>

                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}