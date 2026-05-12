import { useState, useCallback } from "react"
import type { WebContainerProcess } from "@webcontainer/api"

export function useTerminal() {
    const [terminalLogs, setTerminalLogs] = useState<string[]>([])
    const [terminalLoading, setTerminalLoading] = useState(false)
    const [isTerminalOpen, setIsTerminalOpen] = useState(false)

    const appendLog = useCallback((log: string) => {
        setTerminalLogs(prev => [...prev, log])
    }, [])

    const clearLogs = useCallback(() => {
        setTerminalLogs([])
    }, [])

    return {
        terminalLogs,
        setTerminalLogs,
        terminalLoading,
        setTerminalLoading,
        isTerminalOpen,
        setIsTerminalOpen,
        appendLog,
        clearLogs
    }
}
