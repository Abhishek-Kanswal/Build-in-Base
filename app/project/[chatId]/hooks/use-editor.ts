import { useState, useRef, useMemo } from "react"
import { type FileMap } from "@/lib/builder/bolt"
import { fileMapToTree } from "@/lib/builder/webcontainer"

export function useEditor() {
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

    const [openFiles, setOpenFiles] = useState<{ id: string; name: string; type: "code" | "json" }[]>([])
    const [activeFile, setActiveFile] = useState("")
    const [editorFontSize, setEditorFontSize] = useState(13)
    const savedFileContentsRef = useRef<Record<string, string>>({})

    const fileTree = useMemo(() => fileMapToTree(filesByPath, virtualFolders), [filesByPath, virtualFolders])

    const handleOpenFile = (path: string, type: "code" | "json") => {
        const fileName = path.split("/").pop() ?? path
        if (!openFiles.find((f) => f.id === path)) {
            setOpenFiles((prev) => [...prev, { id: path, name: fileName, type }])
        }
        setActiveFile(path)
        if (savedFileContentsRef.current[path] === undefined) {
            savedFileContentsRef.current[path] = filesByPath[path] ?? ""
        }
    }

    const handleCloseFile = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setOpenFiles((prev) => prev.filter((f) => f.id !== id))
        if (activeFile === id) {
            const currentIdx = openFiles.findIndex((f) => f.id === id)
            if (currentIdx > 0) setActiveFile(openFiles[currentIdx - 1].id)
            else if (openFiles.length > 1) setActiveFile(openFiles[1].id)
            else setActiveFile("")
        }
    }

    const isFileDirty = (path: string) => {
        const savedContent = savedFileContentsRef.current[path]
        const currentContent = filesByPathRef.current[path]
        if (savedContent === undefined) return false
        return savedContent !== currentContent
    }

    const markFileSaved = (path: string, content: string) => {
        savedFileContentsRef.current[path] = content
    }

    const handleFileChange = (path: string, content: string) => {
        setFilesByPath((prev) => ({
            ...prev,
            [path]: content,
        }))
    }

    const handleCreateFile = (basePath?: string) => {
        const folder = basePath ? basePath + "/" : ""
        const path = prompt("Enter file name (e.g., components/Button.tsx):", folder)
        if (path) {
            setFilesByPath((prev) => ({ ...prev, [path]: "// New file\n" }))
            handleOpenFile(path, path.endsWith(".json") ? "json" : "code")
        }
    }

    const handleCreateFolder = (basePath?: string) => {
        const folder = basePath ? basePath + "/" : ""
        const path = prompt("Enter folder path:", folder)
        if (path) {
            setVirtualFolders(prev => [...prev, path])
            setExpandedFolders(prev => ({ ...prev, [path]: true }))
        }
    }

    const handleDeleteFile = (path: string) => {
        if (confirm(`Are you sure you want to delete ${path}?`)) {
            setFilesByPath((prev) => {
                const next = { ...prev }
                delete next[path]
                return next
            })
            setOpenFiles((prev) => prev.filter(f => f.id !== path))
            if (activeFile === path) setActiveFile("")
        }
    }

    const handleDeleteFolder = (path: string) => {
        if (confirm(`Are you sure you want to delete folder ${path} and all its contents?`)) {
            setFilesByPath((prev) => {
                const next = { ...prev }
                for (const p in next) {
                    if (p.startsWith(path + "/")) delete next[p]
                }
                return next
            })
            setVirtualFolders((prev) => prev.filter(f => !f.startsWith(path)))
            setOpenFiles((prev) => prev.filter(f => !f.id.startsWith(path + "/")))
            if (activeFile.startsWith(path + "/")) setActiveFile("")
        }
    }

    return {
        filesByPath,
        setFilesByPath,
        filesByPathRef,
        virtualFolders,
        setVirtualFolders,
        expandedFolders,
        setExpandedFolders,
        openFiles,
        activeFile,
        setActiveFile,
        editorFontSize,
        setEditorFontSize,
        fileTree,
        handleOpenFile,
        handleCloseFile,
        isFileDirty,
        markFileSaved,
        handleFileChange,
        handleCreateFile,
        handleCreateFolder,
        handleDeleteFile,
        handleDeleteFolder
    }
}
