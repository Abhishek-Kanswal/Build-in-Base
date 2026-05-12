"use client"

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { AnsiUp } from 'ansi_up'
import {
    ChevronDown, Lock, Play, Settings, Download, Share,
    ChevronLeft, ChevronRight, RotateCw, Smartphone, Monitor, Maximize2,
    CodeXml, X, Box, Globe,
    Plus, MoreHorizontal, TerminalSquare, ExternalLink, Github, Loader2,
    User, Bot, PanelLeft, Copy, Search, GitBranch, Bug, Blocks, Sparkles, Activity,
    FilePlus, FolderPlus
} from "lucide-react"

import { MaterialIcon } from "@/lib/material-icons"

import { PromptInputBox } from "@/components/ai-prompt-box"
import { AgentMessage } from "@/components/agent-message"
import { Button } from "@/components/ui/button"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useUser } from "@clerk/nextjs"
import Editor from "@monaco-editor/react"
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useParams, useSearchParams } from "next/navigation"
import type { WebContainerProcess } from "@webcontainer/api"

import { useWebContainer } from "@/hooks/use-webcontainer"
import { applyBoltActionsToFiles, buildFilesFromResponses, extractActionSummaries, parseBoltActions, type FileMap, type ActionSummary } from "@/lib/builder/bolt"
import { buildWebContainerTree, fileMapToTree, type FileTreeNode } from "@/lib/builder/webcontainer"
import { buildContextMessages, formatBuildError } from "@/lib/agent/context"
import { withRetry } from "@/lib/agent/retry"
import { toAppUser } from "@/lib/auth"
import { injectLockfile } from "@/lib/builder/lockfile-injector"
import { hashPackageJson, getCachedSnapshot, setCachedSnapshot } from "@/lib/builder/idb-cache"
import { parseAssistantSections } from "@/lib/markdown"
import { ChatPanel } from "./components/ChatPanel"
import { CodePanel } from "./components/CodePanel"
import { PreviewPanel } from "./components/PreviewPanel"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    created_at: string
}

interface AssistantMessageSections {
    think: string
    answer: string
}

export default function ProjectPage() {
    const params = useParams()
    const chatId = params.chatId as string
    const searchParams = useSearchParams()
    const initialModel = searchParams.get("model") === "v0 pro" ? "v0 pro" : "v0 mini"
    const modelRef = useRef<"v0 mini" | "v0 pro">(initialModel)
    const errorRetryCountRef = useRef(0)

    const [sidebarWidth, setSidebarWidth] = useState(550)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isDragging, setIsDragging] = useState(false)
    const { user: clerkUser } = useUser()
    const user = toAppUser(clerkUser)
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

    const { webcontainer, isBooting, resetWebContainer } = useWebContainer()
    const [previewUrl, setPreviewUrl] = useState("")
    const [isGenerating, setIsGeneratingState] = useState(false)
    const isGeneratingRef = useRef(false)
    const setIsGenerating = (val: boolean) => {
        isGeneratingRef.current = val
        setIsGeneratingState(val)
    }
    const [terminalLogs, setTerminalLogs] = useState<string[]>([])
    const [terminalLoading, setTerminalLoading] = useState(false)
    const [filesByPath, setFilesByPathState] = useState<FileMap>({})
    const filesByPathRef = useRef<FileMap>({})
    const setFilesByPath = (val: FileMap | ((prev: FileMap) => FileMap)) => {
        if (typeof val === 'function') {
            setFilesByPathState((prev) => {
                const next = val(prev)
                filesByPathRef.current = next
                return next
            })
        } else {
            filesByPathRef.current = val
            setFilesByPathState(val)
        }
    }
    const [virtualFolders, setVirtualFolders] = useState<string[]>([])
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
        app: true,
        components: true,
        src: true,
    })

    // Streaming agent loop state
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
    const [streamingContent, setStreamingContent] = useState("")
    const [streamingThinking, setStreamingThinking] = useState("")
    const [isThinking, setIsThinking] = useState(false)
    const [streamingActions, setStreamingActions] = useState<ActionSummary[]>([])
    const streamAbortRef = useRef<(() => void) | null>(null)

    const webcontainerProcessRef = useRef<WebContainerProcess | null>(null)
    const isServerRunningRef = useRef(false)
    const templatePromptsRef = useRef<string[]>([])
    const templateUiPromptRef = useRef("")
    const hasHydratedRef = useRef(false)

    const [openFiles, setOpenFiles] = useState<{ id: string; name: string; type: "code" | "json" }[]>([])
    const [activeFile, setActiveFile] = useState("")

    const fileTree = useMemo(() => fileMapToTree(filesByPath, virtualFolders), [filesByPath, virtualFolders])
    const activeFileContent = activeFile ? filesByPath[activeFile] ?? "" : ""
    const ansiUp = useMemo(() => new AnsiUp(), [])
    const shikiMonacoInitRef = useRef<Promise<void> | null>(null)
    const editorRef = useRef<any>(null)
    const monacoSetupDoneRef = useRef(false)
    const savedFileContentsRef = useRef<Record<string, string>>({})
    const [editorFontSize, setEditorFontSize] = useState(13)
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


    /**
     * Generate a response from /api/chat.
     * Tries SSE streaming first for real-time UI updates.
     * Falls back to JSON mode + fast reveal if streaming fails.
     * Returns the full content when done.
     */
    const streamFromAPI = async (
        tempMessageId: string,
        apiMessages: Array<{ role: string; content: string }>,
        currentFiles: FileMap,
        model: "v0 mini" | "v0 pro" = "v0 mini"
    ): Promise<string> => {
        // Reset streaming state
        setStreamingMessageId(tempMessageId)
        setStreamingContent("")
        setStreamingThinking("")
        setIsThinking(false)
        setStreamingActions([])

        const abortController = new AbortController()
        streamAbortRef.current = () => abortController.abort()

        let fullContent = ""

        try {
            // ── Try SSE streaming first ──
            let useSSE = true
            let response: Response

            try {
                response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ messages: apiMessages, stream: true, model }),
                    signal: abortController.signal,
                })

                if (!response.ok) {
                    console.warn("[streamFromAPI] SSE response not ok, falling back to JSON mode")
                    useSSE = false
                } else if (!response.body) {
                    console.warn("[streamFromAPI] No response body for SSE, falling back to JSON mode")
                    useSSE = false
                }
            } catch (fetchErr: any) {
                if (fetchErr.name === "AbortError") throw fetchErr
                console.warn("[streamFromAPI] SSE fetch failed, falling back:", fetchErr)
                useSSE = false
            }

            if (useSSE && response!.body) {
                // ── SSE streaming path ──
                const reader = response!.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ""

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })

                    const lines = buffer.split("\n")
                    buffer = lines.pop() ?? ""

                    for (const line of lines) {
                        if (!line.startsWith("data: ")) continue
                        const jsonStr = line.slice(6).trim()
                        if (!jsonStr) continue

                        try {
                            const event = JSON.parse(jsonStr)

                            if (event.type === "delta" && event.content) {
                                fullContent += event.content
                                setStreamingContent(fullContent)
                                setMessages(prev => prev.map(m =>
                                    m.id === tempMessageId ? { ...m, content: fullContent } : m
                                ))

                                // Parse thinking
                                const closedThink = fullContent.match(/<think>([\s\S]*?)<\/think>/i)
                                if (closedThink) {
                                    setStreamingThinking(closedThink[1]?.trim() ?? "")
                                    setIsThinking(false)
                                } else {
                                    const openIdx = fullContent.toLowerCase().indexOf("<think>")
                                    if (openIdx >= 0) {
                                        setStreamingThinking(fullContent.slice(openIdx + "<think>".length).trim())
                                        setIsThinking(true)
                                    }
                                }

                                // Parse completed actions
                                const actions = extractActionSummaries(fullContent)
                                if (actions.length > 0) {
                                    setStreamingActions(actions)
                                }
                            } else if (event.type === "error") {
                                throw new Error(event.content || "Stream error")
                            }
                        } catch (parseErr) {
                            if (parseErr instanceof SyntaxError) continue
                            throw parseErr
                        }
                    }
                }
            } else {
                // ── JSON fallback path ──
                console.log("[streamFromAPI] Using JSON fallback mode")

                const jsonResponse = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ messages: apiMessages, model }),
                    signal: abortController.signal,
                })

                if (!jsonResponse.ok) {
                    const errText = await jsonResponse.text()
                    throw new Error(`API error: ${jsonResponse.status} — ${errText}`)
                }

                const data = await jsonResponse.json()
                fullContent = data.response as string || ""

                // Fast incremental reveal for agent-loop UI experience
                let revealIndex = 0
                while (revealIndex < fullContent.length) {
                    const chunkSize = Math.min(80, fullContent.length - revealIndex)
                    revealIndex += chunkSize
                    const revealed = fullContent.slice(0, revealIndex)

                    setStreamingContent(revealed)
                    setMessages(prev => prev.map(m =>
                        m.id === tempMessageId ? { ...m, content: revealed } : m
                    ))

                    // Parse thinking
                    const closedThink = revealed.match(/<think>([\s\S]*?)<\/think>/i)
                    if (closedThink) {
                        setStreamingThinking(closedThink[1]?.trim() ?? "")
                        setIsThinking(false)
                    } else {
                        const openIdx = revealed.toLowerCase().indexOf("<think>")
                        if (openIdx >= 0) {
                            setStreamingThinking(revealed.slice(openIdx + "<think>".length).trim())
                            setIsThinking(true)
                        }
                    }

                    // Parse completed actions
                    const actions = extractActionSummaries(revealed)
                    if (actions.length > 0) {
                        setStreamingActions(actions)
                    }

                    await new Promise(r => setTimeout(r, 8))
                }
            }

            // Final update
            setStreamingContent(fullContent)
            setMessages(prev => prev.map(m =>
                m.id === tempMessageId ? { ...m, content: fullContent } : m
            ))

            // Debug: log what we received
            console.log("[streamFromAPI] Response length:", fullContent.length)
            console.log("[streamFromAPI] Has boltArtifact:", fullContent.includes("<boltArtifact"))
            console.log("[streamFromAPI] Has boltAction:", fullContent.includes("<boltAction"))
            console.log("[streamFromAPI] First 500 chars:", fullContent.slice(0, 500))

            // Apply files from completed response
            const finalFiles = applyBoltActionsToFiles(currentFiles, fullContent)
            console.log("[streamFromAPI] Files extracted:", Object.keys(finalFiles))
            setFilesByPath(finalFiles)
            Object.entries(finalFiles).forEach(([path, content]) => markFileAsSaved(path, content))

            // Open first file if none is open
            const filePaths = Object.keys(finalFiles)
            if (filePaths.length > 0 && !activeFile) {
                const firstFile = filePaths[0]
                setOpenFiles([{ id: firstFile, name: firstFile.split("/").pop() ?? firstFile, type: firstFile.endsWith(".json") ? "json" : "code" }])
                setActiveFile(firstFile)
            }

            // Phase 3: Agentic Tool Use - Process "read" actions
            const parsedActions = parseBoltActions(fullContent)
            const readActions = parsedActions.filter(a => a.type === "read" && a.filePath)
            if (readActions.length > 0) {
                let readFeedback = ""
                for (const action of readActions) {
                    const reqPath = action.filePath!
                    if (finalFiles[reqPath]) {
                        readFeedback += `\n<file path="${reqPath}">\n${finalFiles[reqPath]}\n</file>\n`
                    } else {
                        readFeedback += `\n<error>\nFile ${reqPath} not found.\n</error>\n`
                    }
                }
                const readMessage = `I have read the requested files. Here are their contents:\n${readFeedback}\nPlease proceed with your next steps.`
                // Schedule the hidden follow-up message on the next tick
                setTimeout(() => {
                    handleSendMessage(readMessage, "v0 pro")
                }, 100)
            }

            // Phase 3a: Handle "delete" actions — remove files from WebContainer FS silently
            const deleteActions = parsedActions.filter(a => a.type === "delete" && a.filePath)
            if (deleteActions.length > 0 && webcontainer) {
                for (const action of deleteActions) {
                    const filePath = action.filePath!
                    try {
                        await webcontainer.fs.rm(filePath, { force: true }).catch(() => { })
                    } catch { /* ignore */ }
                    // Also remove from open files/tabs
                    setOpenFiles(prev => prev.filter(f => f.id !== filePath))
                    if (activeFile === filePath) {
                        setActiveFile("")
                    }
                }
            }

            // Phase 3b: Environment Probing - Process "shell" actions
            const shellActions = parsedActions.filter(a => a.type === "shell" && a.content)
            const newShellActions = shellActions.filter(a => !['npm install', 'npm run dev'].includes(a.content.trim()))
            if (newShellActions.length > 0 && webcontainer) {
                // Separate rm/delete commands (silent) from other commands (need feedback)
                const rmActions: typeof newShellActions = []
                const otherActions: typeof newShellActions = []
                for (const action of newShellActions) {
                    const cmd = action.content.trim()
                    if (/^rm\s/.test(cmd)) {
                        rmActions.push(action)
                    } else {
                        otherActions.push(action)
                    }
                }

                // Execute rm commands silently — no follow-up message
                if (rmActions.length > 0) {
                    for (const action of rmActions) {
                        try {
                            const cmdLine = action.content.trim()
                            const args = cmdLine.split(" ").filter(Boolean)
                            args.shift() // remove "rm"
                            for (const filePath of args) {
                                if (filePath.startsWith("-")) continue // skip flags like -rf
                                try {
                                    await webcontainer.fs.rm(filePath, { force: true, recursive: true }).catch(() => { })
                                } catch { /* ignore */ }
                                // Remove from filesByPath and UI
                                setFilesByPath(prev => {
                                    const next = { ...prev }
                                    delete next[filePath]
                                    return next
                                })
                                setOpenFiles(prev => prev.filter(f => f.id !== filePath))
                                if (activeFile === filePath) {
                                    setActiveFile("")
                                }
                            }
                        } catch { /* ignore rm failures */ }
                    }
                }

                // Execute non-rm commands with feedback (agentic tool use)
                if (otherActions.length > 0) {
                    setTimeout(async () => {
                        let shellFeedback = ""
                        for (const action of otherActions) {
                            try {
                                const cmdLine = action.content.trim()
                                const args = cmdLine.split(" ").filter(Boolean)
                                const cmd = args.shift()
                                if (!cmd) continue

                                const proc = await webcontainer.spawn(cmd, args)
                                let output = ""
                                proc.output.pipeTo(new WritableStream({
                                    write(data) { output += String(data) }
                                }))

                                const timeoutPromise = new Promise<number>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
                                try {
                                    await Promise.race([proc.exit, timeoutPromise])
                                } catch (e) {
                                    proc.kill()
                                    output += "\n[Command timed out after 10s]"
                                }

                                shellFeedback += `\n<command>\n$ ${cmdLine}\n${output.slice(-2000)}\n</command>\n`
                            } catch (e: any) {
                                shellFeedback += `\n<command>\n$ ${action.content}\nError: ${e.message || String(e)}\n</command>\n`
                            }
                        }
                        if (shellFeedback) {
                            const shellMessage = `I have executed the requested shell commands. Here is the output:\n${shellFeedback}\nPlease proceed with your next steps.`
                            handleSendMessage(shellMessage, "v0 pro")
                        }
                    }, 100)
                }
            }

            return fullContent
        } catch (error: any) {
            if (error.name === "AbortError") return fullContent
            throw error
        } finally {
            setStreamingMessageId(null)
            streamAbortRef.current = null
        }
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

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (activeView !== "code") return
            if (!(event.ctrlKey || event.metaKey)) return

            const key = event.key.toLowerCase()
            const isZoomIn = key === "+" || key === "="
            const isZoomOut = key === "-" || key === "_"
            const isReset = key === "0"

            if (!isZoomIn && !isZoomOut && !isReset) return

            event.preventDefault()
            setEditorFontSize((currentSize) => {
                if (isReset) return 13
                const nextSize = isZoomIn ? currentSize + 1 : currentSize - 1
                return Math.min(24, Math.max(10, nextSize))
            })
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [activeView])

    const getTargetFolderPath = () => {
        if (!activeFile) return ""
        return activeFile.includes("/") ? activeFile.split("/").slice(0, -1).join("/") : ""
    }

    const buildDefaultFileContent = (fileName: string) => {
        if (fileName.endsWith(".tsx") || fileName.endsWith(".jsx")) {
            const componentName = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_$]/g, "_")
            return `export default function ${componentName}() {
  return <div />
}
`
        }

        if (fileName.endsWith(".ts") || fileName.endsWith(".js")) {
            const functionName = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_$]/g, "_")
            return `export default function ${functionName}() {
  return null
}
`
        }

        if (fileName.endsWith(".json")) {
            return "{}\n"
        }

        return ""
    }

    const markFileAsSaved = (filePath: string, content: string) => {
        savedFileContentsRef.current[filePath] = content
    }

    const isFileDirty = (filePath: string) => {
        if (!(filePath in filesByPath)) return false
        return filesByPath[filePath] !== savedFileContentsRef.current[filePath]
    }

    const createFolder = (basePath?: string) => {
        const folderInput = window.prompt("Folder name", basePath ?? getTargetFolderPath())
        if (!folderInput) return

        const nextFolderPath = folderInput.trim().replace(/^\/+|\/+$/g, "")
        if (!nextFolderPath) return

        setVirtualFolders((prev) => {
            const next = new Set(prev)
            const segments = nextFolderPath.split("/").filter(Boolean)
            let currentPath = ""

            for (const segment of segments) {
                currentPath = currentPath ? `${currentPath}/${segment}` : segment
                next.add(currentPath)
            }

            return Array.from(next)
        })

        setExpandedFolders((prev) => {
            const next = { ...prev }
            const segments = nextFolderPath.split("/").filter(Boolean)
            let currentPath = ""

            for (const segment of segments) {
                currentPath = currentPath ? `${currentPath}/${segment}` : segment
                next[currentPath] = true
            }

            return next
        })
    }

    const createFile = (basePath?: string) => {
        const parentFolder = basePath ?? getTargetFolderPath()
        const defaultName = parentFolder ? `${parentFolder}/new-file.tsx` : "new-file.tsx"
        const fileInput = window.prompt("File name", defaultName)
        if (!fileInput) return

        const nextFilePath = fileInput.trim().replace(/^\/+|\/+$/g, "")
        if (!nextFilePath) return

        setFilesByPath((prev) => {
            if (prev[nextFilePath] !== undefined) {
                return prev
            }

            const nextFiles = {
                ...prev,
                [nextFilePath]: buildDefaultFileContent(nextFilePath.split("/").pop() ?? nextFilePath),
            }

            markFileAsSaved(nextFilePath, nextFiles[nextFilePath])
            return nextFiles
        })

        const parentPath = nextFilePath.includes("/") ? nextFilePath.split("/").slice(0, -1).join("/") : ""
        if (parentPath) {
            setVirtualFolders((prev) => {
                const next = new Set(prev)
                const segments = parentPath.split("/").filter(Boolean)
                let currentPath = ""

                for (const segment of segments) {
                    currentPath = currentPath ? `${currentPath}/${segment}` : segment
                    next.add(currentPath)
                }

                return Array.from(next)
            })

            setExpandedFolders((prev) => ({
                ...prev,
                [parentPath]: true,
            }))
        }

        const fileName = nextFilePath.split("/").pop() ?? nextFilePath
        setOpenFiles((prev) => prev.some((file) => file.id === nextFilePath) ? prev : [...prev, {
            id: nextFilePath,
            name: fileName,
            type: nextFilePath.endsWith(".json") ? "json" : "code",
        }])
        setActiveFile(nextFilePath)
    }

    const deleteFileByPath = (filePath: string) => {
        if (!window.confirm(`Delete file \"${filePath}\"?`)) return

        setFilesByPath((prev) => {
            if (!(filePath in prev)) return prev

            const next = { ...prev }
            delete next[filePath]
            return next
        })

        delete savedFileContentsRef.current[filePath]

        setOpenFiles((prev) => {
            const next = prev.filter((file) => file.id !== filePath)
            if (activeFile === filePath) {
                setActiveFile(next.length > 0 ? next[next.length - 1].id : "")
            }
            return next
        })
    }

    const deleteFolderByPath = (folderPath: string) => {
        if (!window.confirm(`Delete folder \"${folderPath}\" and all files inside it?`)) return

        const startsInsideFolder = (path: string) => path === folderPath || path.startsWith(`${folderPath}/`)

        setFilesByPath((prev) => {
            const next: FileMap = {}
            for (const [path, content] of Object.entries(prev)) {
                if (!startsInsideFolder(path)) {
                    next[path] = content
                } else {
                    delete savedFileContentsRef.current[path]
                }
            }
            return next
        })

        setVirtualFolders((prev) => prev.filter((path) => !startsInsideFolder(path)))

        setExpandedFolders((prev) => {
            const next: Record<string, boolean> = {}
            for (const [path, isOpen] of Object.entries(prev)) {
                if (!startsInsideFolder(path)) {
                    next[path] = isOpen
                }
            }
            return next
        })

        setOpenFiles((prev) => {
            const next = prev.filter((file) => !startsInsideFolder(file.id))
            if (activeFile && startsInsideFolder(activeFile)) {
                setActiveFile(next.length > 0 ? next[next.length - 1].id : "")
            }
            return next
        })
    }

    const openIntegratedTerminal = (path?: string) => {
        setIsTerminalOpen(true)
        setActiveView("code")

        const label = path ? `$ cd ${path}` : "$"
        setTerminalLogs((prev) => [...prev, label])
    }

    const zoomEditor = (delta: number) => {
        setEditorFontSize((currentSize) => Math.min(24, Math.max(10, currentSize + delta)))
    }

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
            markFileAsSaved(activeFile, formatted)
            if (activeFile) {
                setFilesByPath((prev) => ({ ...prev, [activeFile]: formatted }))
            }
        } catch (error) {
            console.error("Failed to format with Prettier", error)
        }
    }

    // Setup Monaco TypeScript compiler options and Shiki syntax highlighting.
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

        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            ...compilerOptions,
        });

        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            ...compilerOptions,
        })

        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        });

        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        })

        monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
        monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)

        if (!monacoSetupDoneRef.current) {
            monacoSetupDoneRef.current = true
            const reactAndNextLib = `
declare module "react" {
  export = React;
}

declare module "next/link" {
  const Link: any;
  export default Link;
}

declare module "next/image" {
  const Image: any;
  export default Image;
}
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

    // Reset state when navigating to a new project
    const prevChatIdRef = useRef(chatId)
    useEffect(() => {
        if (chatId !== prevChatIdRef.current) {
            prevChatIdRef.current = chatId
            setPreviewUrl("")
            setTerminalLogs([])
            setFilesByPath({})
            setVirtualFolders([])
            setOpenFiles([])
            setActiveFile("")
            hasHydratedRef.current = false
            isServerRunningRef.current = false
            prevFilesRef.current = {}
            depsInstalledRef.current = false
            installPromiseRef.current = null
            if (webcontainerProcessRef.current) {
                webcontainerProcessRef.current.kill()
                webcontainerProcessRef.current = null
            }
            if (webcontainer) {
                resetWebContainer()
            }
        }
    }, [chatId, webcontainer, resetWebContainer])

    // Fetch project and messages
    useEffect(() => {
        if (!chatId) return

        const fetchData = async () => {
            setIsLoadingMessages(true)

            try {
                const res = await fetch(`/api/projects/${chatId}`, {
                    cache: "no-store",
                })
                const payload = await res.json()

                if (!res.ok) {
                    throw new Error(payload?.message || "Failed to load project")
                }

                if (payload.project?.title) {
                    setProjectTitle(payload.project.title)
                }

                setMessages(payload.messages || [])
            } catch (error) {
                console.error("Error fetching project data:", error)
            } finally {
                setIsLoadingMessages(false)
            }
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
    const depsInstalledRef = useRef(false)
    const installPromiseRef = useRef<Promise<void> | null>(null)

    // ── Phase A: Pre-install dependencies while AI is still generating ──
    // This runs as soon as we have a package.json + webcontainer, WITHOUT waiting for isGenerating
    useEffect(() => {
        if (!webcontainer || depsInstalledRef.current || installPromiseRef.current) return

        const pkgJson = filesByPath["package.json"]
        if (!pkgJson) return

        const preInstall = async () => {
            try {
                console.log("[wc-boot] Phase A: Pre-installing dependencies...")

                // Inject lockfile into a minimal file set (just package.json + lockfile + config files)
                const minimalFiles: FileMap = {}
                for (const [path, content] of Object.entries(filesByPath)) {
                    // Include package.json, lockfiles, and config files only (not source files)
                    if (
                        path === "package.json" ||
                        path === "package-lock.json" ||
                        path.endsWith(".config.js") ||
                        path.endsWith(".config.ts") ||
                        path.endsWith(".config.mjs") ||
                        path === "tsconfig.json" ||
                        path === "tsconfig.app.json" ||
                        path === "tsconfig.node.json" ||
                        path === "postcss.config.js" ||
                        path === "next.config.mjs" ||
                        path === "tailwind.config.js" ||
                        path === "tailwind.config.ts"
                    ) {
                        minimalFiles[path] = content
                    }
                }

                const filesWithLock = await injectLockfile(minimalFiles)
                await webcontainer.mount(buildWebContainerTree(filesWithLock, virtualFolders))

                // Listen for server-ready
                webcontainer.on("server-ready", (_port, url) => {
                    setPreviewUrl((prev) => prev !== url ? url : prev)
                    setTerminalLoading(false)
                })

                // Check IndexedDB cache
                const pkgHash = await hashPackageJson(pkgJson)
                let cacheHit = false

                if (pkgHash) {
                    try {
                        const cachedSnapshot = await getCachedSnapshot(pkgHash)
                        if (cachedSnapshot && Object.keys(cachedSnapshot).length > 0) {
                            setTerminalLogs(["$ [cache] Restoring node_modules from browser cache..."])
                            setTerminalLoading(true)

                            await webcontainer.mount(cachedSnapshot)

                            try {
                                const chmodProcess = await webcontainer.spawn("chmod", ["+x", "node_modules/.bin/vite", "node_modules/.bin/next"])
                                await chmodProcess.exit
                            } catch (e) {
                                console.warn("[wc-boot] chmod failed:", e)
                            }

                            appendTerminalOutput("\n✓ Restored from cache\n")
                            cacheHit = true
                            console.log(`[wc-boot] Cache HIT for hash ${pkgHash}`)
                        }
                    } catch (cacheErr) {
                        console.warn("[wc-boot] Cache restore failed:", cacheErr)
                    }
                }

                // npm install (if cache miss)
                if (!cacheHit) {
                    setTerminalLogs(["$ npm install --prefer-offline --no-audit --no-fund --no-progress --loglevel=error"])
                    setTerminalLoading(true)

                    const installProcess = await webcontainer.spawn("npm", ["install", "--prefer-offline", "--no-audit", "--no-fund", "--no-progress", "--loglevel=error", "--legacy-peer-deps"], {
                        env: {
                            NPM_CONFIG_PROGRESS: "false",
                            npm_config_progress: "false",
                        },
                    })
                    let installErrorText = ""
                    installProcess.output.pipeTo(
                        new WritableStream({
                            write(data) {
                                const text = String(data)
                                appendTerminalOutput(text)
                                installErrorText += text
                            },
                        })
                    )
                    const exitCode = await installProcess.exit
                    if (exitCode !== 0) {
                        handleBuildError(installErrorText)
                        return
                    }

                    // Cache the snapshot
                    if (pkgHash) {
                        try {
                            const snapshot = await webcontainer.export(".", { format: "json" })
                            if (snapshot && Object.keys(snapshot).length > 0) {
                                await setCachedSnapshot(pkgHash, snapshot)
                                console.log(`[wc-boot] Cached snapshot for hash ${pkgHash}`)
                            }
                        } catch (exportErr) {
                            console.warn("[wc-boot] Failed to cache snapshot:", exportErr)
                        }
                    }
                }

                depsInstalledRef.current = true
                console.log("[wc-boot] Phase A complete: Dependencies ready")
            } catch (error) {
                console.error("[wc-boot] Phase A failed:", error)
            }
        }

        installPromiseRef.current = preInstall()
    }, [webcontainer, filesByPath, virtualFolders])

    // ── Phase B: Sync source files and start dev server after AI finishes ──
    useEffect(() => {
        if (!webcontainer || Object.keys(filesByPath).length === 0) return
        if (filesByPath === prevFilesRef.current) return

        // If server is already running, hot-sync changed files instantly
        if (isServerRunningRef.current) {
            const prevFiles = prevFilesRef.current
            prevFilesRef.current = filesByPath // Update ref immediately to prevent re-triggers

            // Collect changed files and deleted files
            const changedFiles: [string, string][] = []
            for (const [path, content] of Object.entries(filesByPath)) {
                if (prevFiles[path] !== content) {
                    changedFiles.push([path, content])
                }
            }
            const deletedFiles = Object.keys(prevFiles).filter(p => !(p in filesByPath))

            if (changedFiles.length === 0 && deletedFiles.length === 0) return

            // Phase 1: Pre-create all unique directories (deduped, parallel)
            const dirs = new Set<string>()
            for (const [path] of changedFiles) {
                const dir = path.split('/').slice(0, -1).join('/')
                if (dir) dirs.add(dir)
            }
            if (dirs.size > 0) {
                Promise.all(
                    Array.from(dirs).map(d => webcontainer.fs.mkdir(d, { recursive: true }).catch(() => { }))
                ).then(() => {
                    // Phase 2: Write all files simultaneously (fire-and-forget)
                    for (const [path, content] of changedFiles) {
                        webcontainer.fs.writeFile(path, content).catch(() => { })
                    }
                })
            } else {
                // No dirs needed — write immediately
                for (const [path, content] of changedFiles) {
                    webcontainer.fs.writeFile(path, content).catch(() => { })
                }
            }

            // Delete removed files (fire-and-forget)
            for (const path of deletedFiles) {
                webcontainer.fs.rm(path, { force: true }).catch(() => { })
            }

            return
        }

        // For initial boot: wait for AI to finish generating
        if (isGenerating) return

        const startServer = async () => {
            try {
                // Wait for Phase A (npm install) to complete
                if (installPromiseRef.current) {
                    await installPromiseRef.current
                }

                if (!depsInstalledRef.current) {
                    console.warn("[wc-boot] Dependencies not installed, cannot start server")
                    return
                }

                // Mount all source files (overwrite the minimal set from Phase A)
                const filesWithLock = await injectLockfile(filesByPath)
                await webcontainer.mount(buildWebContainerTree(filesWithLock, virtualFolders))
                prevFilesRef.current = filesByPath
                isServerRunningRef.current = true

                // Determine start command
                const pkgJsonContent = filesByPath["package.json"] ?? ""
                let startCommand = ["npm", "run", "dev"]
                let startLog = "$ npm run dev"

                if (pkgJsonContent) {
                    try {
                        const parsedPkg = JSON.parse(pkgJsonContent)
                        if (parsedPkg.scripts) {
                            if (!parsedPkg.scripts.dev && parsedPkg.scripts.start) {
                                startCommand = ["npm", "start"]
                                startLog = "$ npm start"
                            } else if (!parsedPkg.scripts.dev && !parsedPkg.scripts.start) {
                                startCommand = ["node", "index.js"]
                                startLog = "$ node index.js"
                            }
                        }
                    } catch { /* ignore */ }
                }

                setTerminalLogs((prev) => [...prev, "", startLog])
                const devProcess = await webcontainer.spawn(startCommand[0], startCommand.slice(1))
                webcontainerProcessRef.current = devProcess
                let devErrorBuffer = ""
                let devErrorTimeout: NodeJS.Timeout | null = null

                devProcess.output.pipeTo(
                    new WritableStream({
                        write(data) {
                            const text = String(data)
                            appendTerminalOutput(text)

                            if (text.includes("⨯ Error:") || text.includes("Build failed") || text.includes("Failed to compile")) {
                                devErrorBuffer += text
                                if (devErrorTimeout) clearTimeout(devErrorTimeout)
                                devErrorTimeout = setTimeout(() => {
                                    handleBuildError(devErrorBuffer)
                                    devErrorBuffer = ""
                                }, 2000)
                            } else if (devErrorBuffer) {
                                devErrorBuffer += text
                                if (devErrorTimeout) clearTimeout(devErrorTimeout)
                                devErrorTimeout = setTimeout(() => {
                                    handleBuildError(devErrorBuffer)
                                    devErrorBuffer = ""
                                }, 2000)
                            }
                        },
                    })
                )

                console.log("[wc-boot] Phase B complete: Dev server started")
            } catch (error) {
                console.error("[wc-boot] Phase B failed:", error)
                isServerRunningRef.current = false
            }
        }

        startServer()
    }, [webcontainer, filesByPath, virtualFolders, isGenerating])

    useEffect(() => {
        if (!webcontainer || !isServerRunningRef.current || virtualFolders.length === 0) {
            return
        }

        const syncFolders = async () => {
            for (const folderPath of virtualFolders) {
                await webcontainer.fs.mkdir(folderPath, { recursive: true }).catch(() => { })
            }
        }

        void syncFolders()
    }, [webcontainer, virtualFolders])

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

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

    /**
     * Build the API messages array including template context, file context, and sliding window.
     */
    const buildAPIMessages = (conversation: Message[]) => {
        const chatMessages = conversation.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        }))

        return buildContextMessages(
            templatePromptsRef.current,
            chatMessages,
            filesByPath,
            activeFile,
            terminalErrors
        )
    }

    // Track recent terminal errors for context injection
    const [terminalErrors, setTerminalErrors] = useState<string[]>([])

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
            savedFileContentsRef.current = { ...bootFiles }

            const filePaths = Object.keys(bootFiles)
            if (filePaths.length > 0 && !activeFile) {
                const firstFile = filePaths[0]
                setOpenFiles([{ id: firstFile, name: firstFile.split("/").pop() ?? firstFile, type: firstFile.endsWith(".json") ? "json" : "code" }])
                setActiveFile(firstFile)
            }
            return
        }

        // No assistant messages yet — stream from API
        setIsGenerating(true)

        const tempAssistantId = `streaming-hydrate-${Date.now()}`
        setMessages((prev) => [...prev, {
            id: tempAssistantId,
            role: "assistant",
            content: "",
            created_at: new Date().toISOString(),
        }])

        try {
            // First, apply the template base files (package.json, vite.config, etc.)
            const templateBaseFiles = templateUiPromptRef.current
            // Apply template files FIRST before streaming LLM edits
            const initialFiles = buildFilesFromResponses([templateUiPromptRef.current])
            setFilesByPath(initialFiles)
            savedFileContentsRef.current = { ...initialFiles }

            const apiMessages = buildAPIMessages(conversation)
            const assistantContent = await withRetry(
                () => streamFromAPI(tempAssistantId, apiMessages, initialFiles, modelRef.current),
                {
                    maxRetries: 2,
                    baseDelay: 2000,
                    onRetry: (attempt) => console.warn(`[agent] Retrying initial generation (attempt ${attempt})...`),
                }
            )

            setIsGenerating(false)

            if (!assistantContent) return

            const saveRes = await fetch(`/api/projects/${chatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: "assistant",
                    content: assistantContent,
                }),
            })
            const savePayload = await saveRes.json()

            if (!saveRes.ok) {
                throw new Error(savePayload?.message || "Failed to save assistant message")
            }

            const assistantMsg = savePayload.message

            if (assistantMsg) {
                setMessages((prev) => prev.map((message) => (
                    message.id === tempAssistantId ? assistantMsg : message
                )))
            }
        } catch (error: any) {
            setIsGenerating(false)
            throw error
        }
    }

    const handleBuildError = async (errorText: string) => {
        if (modelRef.current !== "v0 pro" || isGeneratingRef.current) return
        if (errorRetryCountRef.current >= 3) {
            console.error("[agent] Max auto-fix retries (3) reached. Stopping.")
            setTerminalErrors(prev => [...prev.slice(-4), errorText.slice(0, 500)])
            return
        }
        errorRetryCountRef.current += 1
        console.log(`[agent] Auto-fix attempt ${errorRetryCountRef.current}/3...`)

        // Track error for future context
        setTerminalErrors(prev => [...prev.slice(-4), errorText.slice(0, 500)])

        const errorMessage = formatBuildError(errorText, filesByPathRef.current)
        await handleSendMessage(errorMessage, "v0 pro")
    }

    // Handle sending follow-up messages
    const handleSendMessage = async (message: string, model: "v0 mini" | "v0 pro" = "v0 mini") => {
        modelRef.current = model
        if (!message.trim() || !chatId) return

        const messageRes = await fetch(`/api/projects/${chatId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                role: "user",
                content: message.trim(),
            }),
        })
        const messagePayload = await messageRes.json()
        const newMsg = messagePayload.message

        if (!messageRes.ok || !newMsg) {
            console.error("Error sending message:", messagePayload?.message)
            return
        }

        const nextConversation = [...messages, newMsg]
        setMessages(nextConversation)

        await ensureTemplateContext(nextConversation.filter(m => m.role === "user")[0]?.content ?? message)

        const tempAssistantId = `streaming-${Date.now()}`
        setMessages((prev) => [...prev, {
            id: tempAssistantId,
            role: "assistant",
            content: "",
            created_at: new Date().toISOString(),
        }])

        setIsGenerating(true)

        try {
            const apiMessages = buildAPIMessages(nextConversation)
            const assistantContent = await withRetry(
                () => streamFromAPI(tempAssistantId, apiMessages, filesByPath, model),
                {
                    maxRetries: 2,
                    baseDelay: 2000,
                    onRetry: (attempt) => console.warn(`[agent] Retrying LLM call (attempt ${attempt})...`),
                }
            )

            setIsGenerating(false)

            if (!assistantContent) return

            const saveRes = await fetch(`/api/projects/${chatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: "assistant",
                    content: assistantContent,
                }),
            })
            const savePayload = await saveRes.json()

            if (!saveRes.ok) {
                throw new Error(savePayload?.message || "Failed to save assistant message")
            }

            const assistantMsg = savePayload.message

            if (assistantMsg) {
                setMessages((prev) => prev.map((message) => (
                    message.id === tempAssistantId ? assistantMsg : message
                )))
            }
        } catch (generationError: any) {
            console.error("Error generating follow-up:", generationError)
            setIsGenerating(false)
            setMessages((prev) => [...prev, {
                id: "error-" + Date.now(),
                role: "assistant",
                content: `An error occurred generating a response. Details: ${generationError?.message || String(generationError)}`,
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
                    <ContextMenu key={node.path}>
                        <ContextMenuTrigger asChild>
                            <div>
                                <div
                                    className="flex items-center gap-2 px-3 py-1 text-base text-neutral-300 hover:bg-[#262626]/50 cursor-pointer transition-colors"
                                    style={{ paddingLeft: `${14 + depth * 18}px` }}
                                    onClick={() => {
                                        setExpandedFolders((prev) => ({
                                            ...prev,
                                            [node.path]: !isExpanded,
                                        }))
                                    }}
                                >
                                    <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${!isExpanded ? "-rotate-90" : ""}`} />
                                    <MaterialIcon name={node.name} type="folder" isOpen={isExpanded} className="w-5 h-5 text-neutral-400" />
                                    <span>{node.name}</span>
                                </div>
                                {isExpanded && node.children && (
                                    <div className="relative flex flex-col">
                                        <div
                                            className="absolute top-0 bottom-0 w-px bg-neutral-700/70"
                                            style={{ left: `${22 + depth * 18}px` }}
                                        />
                                        <div className="relative flex flex-col">{renderFileTree(node.children, depth + 1)}</div>
                                    </div>
                                )}
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-64 bg-[#111111] border-[#2f2f2f] text-neutral-200">
                            <ContextMenuItem onClick={() => createFile(node.path)}>New File...</ContextMenuItem>
                            <ContextMenuItem onClick={() => createFolder(node.path)}>New Folder...</ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => openIntegratedTerminal(node.path)}>Open in Integrated Terminal</ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => deleteFolderByPath(node.path)} variant="destructive">Delete Folder</ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                )
            }

            const fileName = node.path.split("/").pop() ?? node.path
            const isJson = fileName.endsWith(".json")
            return (
                <ContextMenu key={node.path}>
                    <ContextMenuTrigger asChild>
                        <div
                            onClick={() => handleOpenFile(node.path, isJson ? "json" : "code")}
                            style={{ paddingLeft: `${26 + depth * 18}px` }}
                            className={`flex items-center gap-3 pr-3 py-1 text-base cursor-pointer transition-colors ${activeFile === node.path ? "text-neutral-100 bg-[#2b2b2b]/70" : "text-neutral-400 hover:bg-[#262626]/50"}`}
                        >
                            <MaterialIcon name={fileName} type="file" className={`w-5 h-5 ${activeFile === node.path ? "text-neutral-300" : "text-neutral-400"}`} />
                            {fileName}
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-64 bg-[#111111] border-[#2f2f2f] text-neutral-200">
                        <ContextMenuItem onClick={() => handleOpenFile(node.path, isJson ? "json" : "code")}>Open</ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => navigator.clipboard?.writeText(node.path)}>
                            Copy Path
                            <ContextMenuShortcut>Shift+Alt+C</ContextMenuShortcut>
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => deleteFileByPath(node.path)} variant="destructive">Delete File</ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
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
                    <button
                        onClick={() => {
                            const inTokens = Math.round(messages.filter(m => m.role === 'user').reduce((acc, m) => acc + m.content.length, 0) / 4);
                            const outTokens = Math.round(messages.filter(m => m.role === 'assistant').reduce((acc, m) => acc + m.content.length, 0) / 4);
                            alert(`Approximate Token Usage:\nModel: ${modelRef.current}\nInput Tokens: ~${inTokens}\nOutput Tokens: ~${outTokens}\nTotal Tokens: ~${inTokens + outTokens}`);
                        }}
                        className="text-neutral-500 hover:text-neutral-300 transition-colors relative group w-full flex justify-center focus:outline-none"
                    >
                        <Activity className="w-6 h-6 stroke-[1.5]" />
                    </button>
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
                <main className="flex-1 flex overflow-hidden relative">
                    {isSidebarOpen && (
                        <>
                            <ChatPanel
                                messages={messages}
                                isLoadingMessages={isLoadingMessages}
                                width={sidebarWidth}
                                streamingMessageId={streamingMessageId}
                                streamingContent={streamingContent}
                                streamingThinking={streamingThinking}
                                isThinking={isThinking}
                                streamingActions={streamingActions}
                                onSend={handleSendMessage}
                                onStopGeneration={() => { streamAbortRef.current?.(); setIsGenerating(false) }}
                                isGenerating={isGenerating}
                                initialModel="v0 mini"
                            />

                            <div 
                                className="w-1 cursor-col-resize bg-transparent hover:bg-[#007acc] transition-colors z-10" 
                                onMouseDown={() => setIsDragging(true)}
                            />
                        </>
                    )}

                    {/* Right Hand Split (Preview / Code) */}
                    <div className="flex-1 flex flex-col min-w-0 bg-[#121212]">
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
                                <PreviewPanel 
                                    previewUrl={previewUrl}
                                    previewMode={previewMode}
                                    setPreviewMode={setPreviewMode}
                                    isBooting={isBooting}
                                    isGenerating={isGenerating}
                                />
                            </div>

                            {/* --- CODE VIEW --- */}
                            <div className={`flex flex-1 w-full h-full animate-in fade-in duration-200 ${activeView === 'code' ? '' : 'hidden'}`}>
                                <CodePanel
                                    fileTree={fileTree}
                                    filesByPath={filesByPath}
                                    activeFile={activeFile}
                                    openFiles={openFiles}
                                    expandedFolders={expandedFolders}
                                    isTerminalOpen={isTerminalOpen}
                                    terminalLogs={terminalLogs}
                                    terminalLoading={terminalLoading}
                                    editorFontSize={editorFontSize}
                                    webcontainer={webcontainer}
                                    onSetActiveFile={setActiveFile}
                                    onOpenFile={handleOpenFile}
                                    onCloseFile={(e, id) => {
                                        e.stopPropagation()
                                        setOpenFiles((prev) => prev.filter((f) => f.id !== id))
                                        if (activeFile === id) setActiveFile("")
                                    }}
                                    onToggleFolder={(path) => setExpandedFolders(prev => ({...prev, [path]: !prev[path]}))}
                                    onSetTerminalOpen={setIsTerminalOpen}
                                    onFileChange={(path, content) => setFilesByPath(prev => ({...prev, [path]: content}))}
                                    onCreateFile={createFile}
                                    onCreateFolder={createFolder}
                                    onDeleteFile={deleteFileByPath}
                                    onDeleteFolder={deleteFolderByPath}
                                    onOpenTerminal={openIntegratedTerminal}
                                    onGetTargetFolderPath={() => ""}
                                    isFileDirty={(path) => savedFileContentsRef.current[path] !== filesByPathRef.current[path]}
                                    onMarkSaved={(path, content) => { savedFileContentsRef.current[path] = content }}
                                />
                            </div>
                        </div>
                    </div>
                </main>

            </div>
        </div>
    )
}
