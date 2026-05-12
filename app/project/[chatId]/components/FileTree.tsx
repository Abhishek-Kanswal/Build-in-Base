import React from "react"
import { ChevronDown, MoreHorizontal, FilePlus, FolderPlus } from "lucide-react"
import { MaterialIcon } from "@/lib/material-icons"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { FileTreeNode } from "@/lib/builder/webcontainer"

interface FileTreeProps {
    fileTree: FileTreeNode[]
    activeFile: string
    expandedFolders: Record<string, boolean>
    onToggleFolder: (path: string) => void
    onOpenFile: (path: string, type: "code" | "json") => void
    onCreateFile: (basePath?: string) => void
    onCreateFolder: (basePath?: string) => void
    onDeleteFile: (path: string) => void
    onDeleteFolder: (path: string) => void
    onOpenTerminal: (path?: string) => void
    onGetTargetFolderPath: () => string
}

export function FileTree({
    fileTree,
    activeFile,
    expandedFolders,
    onToggleFolder,
    onOpenFile,
    onCreateFile,
    onCreateFolder,
    onDeleteFile,
    onDeleteFolder,
    onOpenTerminal,
    onGetTargetFolderPath,
}: FileTreeProps) {
    const renderNodes = (nodes: FileTreeNode[], depth = 0) => {
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
                                    onClick={() => onToggleFolder(node.path)}
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
                                        <div className="relative flex flex-col">{renderNodes(node.children, depth + 1)}</div>
                                    </div>
                                )}
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-64 bg-[#171717] border-[#2f2f2f] text-neutral-200">
                            <ContextMenuItem onClick={() => onCreateFile(node.path)}>New File...</ContextMenuItem>
                            <ContextMenuItem onClick={() => onCreateFolder(node.path)}>New Folder...</ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => onOpenTerminal(node.path)}>Open in Integrated Terminal</ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => onDeleteFolder(node.path)} variant="destructive">Delete Folder</ContextMenuItem>
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
                            onClick={() => onOpenFile(node.path, isJson ? "json" : "code")}
                            style={{ paddingLeft: `${26 + depth * 18}px` }}
                            className={`flex items-center gap-3 pr-3 py-1 text-base cursor-pointer transition-colors ${activeFile === node.path ? "text-neutral-100 bg-[#2b2b2b]/70" : "text-neutral-400 hover:bg-[#262626]/50"}`}
                        >
                            <MaterialIcon name={fileName} type="file" className={`w-5 h-5 ${activeFile === node.path ? "text-neutral-300" : "text-neutral-400"}`} />
                            {fileName}
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-64 bg-[#252525] border-[#2f2f2f] text-neutral-200">
                        <ContextMenuItem onClick={() => onOpenFile(node.path, isJson ? "json" : "code")}>Open</ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => navigator.clipboard?.writeText(node.path)}>
                            Copy Path
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => onDeleteFile(node.path)} variant="destructive">Delete</ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            )
        })
    }

    return (
        <div className="w-72 flex flex-col bg-[#171717] border-r border-[#262626] shrink-0">
            <div className="h-9 flex items-center justify-between px-3 shrink-0">
                <span className="text-sm font-semibold text-neutral-400 tracking-wider">EXPLORER</span>
                <div className="flex items-center gap-1">
                    <button onClick={() => onCreateFile()} className="p-1 text-neutral-500 hover:text-neutral-200 hover:bg-[#262626]/50 rounded transition-colors" title="New File"><FilePlus className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onCreateFolder()} className="p-1 text-neutral-500 hover:text-neutral-200 hover:bg-[#262626]/50 rounded transition-colors" title="New Folder"><FolderPlus className="w-3.5 h-3.5" /></button>
                    <button className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-[#262626]/50 rounded"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div className="flex-1 overflow-y-auto pt-0 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#333] hover:[&::-webkit-scrollbar-thumb]:bg-[#555] [&::-webkit-scrollbar-thumb]:rounded-full">
                        <div className="flex flex-col">
                            {fileTree.length > 0 ? renderNodes(fileTree) : (
                                <div className="px-3 py-2 text-xs text-neutral-500">No generated files yet.</div>
                            )}
                        </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-72 bg-[#111111] border-[#2f2f2f] text-neutral-200">
                    <ContextMenuItem onClick={() => onCreateFile()}>New File...</ContextMenuItem>
                    <ContextMenuItem onClick={() => onCreateFolder()}>New Folder...</ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => onOpenTerminal()}>Open in Integrated Terminal</ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => navigator.clipboard?.writeText(onGetTargetFolderPath() || ".")}>Copy Path</ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </div>
    )
}
