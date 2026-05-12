import React, { useRef, useEffect, useCallback } from "react"
import { Loader2, X, Maximize2, Minimize2 } from "lucide-react"

// Lazy-load xterm to avoid SSR issues
let Terminal: any = null
let FitAddon: any = null
let WebLinksAddon: any = null

interface TerminalPanelProps {
    isOpen: boolean
    onClose: () => void
    logs: string[]
    isLoading: boolean
    webcontainer: any | null
}

export function TerminalPanel({ isOpen, onClose, logs, isLoading, webcontainer }: TerminalPanelProps) {
    const terminalContainerRef = useRef<HTMLDivElement>(null)
    const terminalRef = useRef<any>(null)
    const fitAddonRef = useRef<any>(null)
    const shellProcessRef = useRef<any>(null)
    const isInitializedRef = useRef(false)
    const writerRef = useRef<WritableStreamDefaultWriter | null>(null)

    // Initialize xterm + interactive shell
    const initTerminal = useCallback(async () => {
        if (isInitializedRef.current || !terminalContainerRef.current || !webcontainer) return
        isInitializedRef.current = true

        try {
            // Dynamic imports for xterm (avoids SSR issues)
            const [xtermModule, fitModule, linksModule] = await Promise.all([
                import("@xterm/xterm"),
                import("@xterm/addon-fit"),
                import("@xterm/addon-web-links"),
            ])

            Terminal = xtermModule.Terminal
            FitAddon = fitModule.FitAddon
            WebLinksAddon = linksModule.WebLinksAddon

            const fitAddon = new FitAddon()
            fitAddonRef.current = fitAddon

            const term = new Terminal({
                cursorBlink: true,
                cursorStyle: "bar",
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                lineHeight: 1.5,
                theme: {
                    background: "#0a0a0a",
                    foreground: "#e5e5e5",
                    cursor: "#e5e5e5",
                    selectionBackground: "#3a3a3a",
                    black: "#171717",
                    red: "#ef4444",
                    green: "#22c55e",
                    yellow: "#eab308",
                    blue: "#3b82f6",
                    magenta: "#a855f7",
                    cyan: "#06b6d4",
                    white: "#e5e5e5",
                    brightBlack: "#737373",
                    brightRed: "#f87171",
                    brightGreen: "#4ade80",
                    brightYellow: "#facc15",
                    brightBlue: "#60a5fa",
                    brightMagenta: "#c084fc",
                    brightCyan: "#22d3ee",
                    brightWhite: "#fafafa",
                },
                scrollback: 5000,
                convertEol: true,
                allowProposedApi: true,
            })

            terminalRef.current = term

            term.loadAddon(fitAddon)
            term.loadAddon(new WebLinksAddon())

            // Write existing logs before attaching the shell
            if (logs.length > 0) {
                for (const line of logs) {
                    term.writeln(line)
                }
                term.writeln("")
            }

            term.open(terminalContainerRef.current!)
            fitAddon.fit()

            // Spawn jsh (WebContainer's shell) as an interactive process
            const shellProcess = await webcontainer.spawn("jsh", {
                terminal: {
                    cols: term.cols,
                    rows: term.rows,
                },
            })

            shellProcessRef.current = shellProcess

            // Pipe shell output → xterm
            shellProcess.output.pipeTo(
                new WritableStream({
                    write(data: string) {
                        term.write(data)
                    },
                })
            )

            // Pipe xterm input → shell stdin
            const writer = shellProcess.input.getWriter()
            writerRef.current = writer

            term.onData((data: string) => {
                writer.write(data)
            })

            // Resize handler
            term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
                shellProcess.resize?.({ cols, rows })
            })
        } catch (err) {
            console.error("[terminal] Failed to initialize:", err)
            isInitializedRef.current = false
        }
    }, [webcontainer, logs])

    // Init terminal when panel opens
    useEffect(() => {
        if (isOpen && webcontainer && !isInitializedRef.current) {
            // Small delay to ensure the DOM container is rendered
            const timer = setTimeout(() => initTerminal(), 50)
            return () => clearTimeout(timer)
        }
    }, [isOpen, webcontainer, initTerminal])

    // Fit terminal on resize
    useEffect(() => {
        if (!isOpen || !fitAddonRef.current) return

        const handleResize = () => {
            try {
                fitAddonRef.current?.fit()
            } catch { /* ignore */ }
        }

        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [isOpen])

    // Fit terminal when panel opens
    useEffect(() => {
        if (isOpen && fitAddonRef.current) {
            setTimeout(() => {
                try { fitAddonRef.current?.fit() } catch { /* ignore */ }
            }, 100)
        }
    }, [isOpen])

    // Write new log lines to the terminal if it's initialized
    const prevLogsLenRef = useRef(0)
    useEffect(() => {
        if (!terminalRef.current) return
        if (logs.length > prevLogsLenRef.current) {
            const newLines = logs.slice(prevLogsLenRef.current)
            for (const line of newLines) {
                terminalRef.current.writeln(line)
            }
        }
        prevLogsLenRef.current = logs.length
    }, [logs])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            writerRef.current?.close().catch(() => { })
            shellProcessRef.current?.kill?.()
            terminalRef.current?.dispose()
            isInitializedRef.current = false
        }
    }, [])

    if (!isOpen) return null

    return (
        <div className="h-72 border-t border-[#262626] bg-[#0a0a0a] flex flex-col shrink-0 z-20 animate-in slide-in-from-bottom-2 duration-200">
            {/* Terminal Toolbar */}
            <div className="h-9 flex items-center justify-between px-4 bg-[#141414] border-b border-[#262626]">
                <div className="flex items-center gap-6 h-full">
                    <div className="text-[11px] font-semibold text-neutral-200 tracking-wider h-full flex items-center border-b-2 border-neutral-400 cursor-pointer select-none">
                        TERMINAL
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading && (
                        <Loader2 className="w-3.5 h-3.5 text-neutral-500 animate-spin" />
                    )}
                    <button
                        onClick={onClose}
                        className="text-neutral-500 hover:text-neutral-300 p-1 rounded transition-colors"
                        title="Close terminal"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Terminal Container */}
            <div
                ref={terminalContainerRef}
                className="flex-1 overflow-hidden px-2 py-1"
                style={{ backgroundColor: "#0a0a0a" }}
            />
        </div>
    )
}
