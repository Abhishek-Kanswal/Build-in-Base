import React from "react"
import { X } from "lucide-react"
import { MaterialIcon } from "@/lib/material-icons"

interface EditorTab {
    id: string
    name: string
    type: "code" | "json"
}

interface EditorTabsProps {
    openFiles: EditorTab[]
    activeFile: string
    onSelectFile: (id: string) => void
    onCloseFile: (e: React.MouseEvent, id: string) => void
    isFileDirty: (id: string) => boolean
}

export function EditorTabs({ openFiles, activeFile, onSelectFile, onCloseFile, isFileDirty }: EditorTabsProps) {
    return (
        <div className="h-10 bg-[#121212] border-b border-[#262626] flex items-center shrink-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-700 hover:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [&::-webkit-scrollbar-thumb]:rounded-full">
            {openFiles.map(file => (
                <div
                    key={file.id}
                    onClick={() => onSelectFile(file.id)}
                    onMouseDown={(e) => {
                        if (e.button === 1) {
                            e.preventDefault()
                            onCloseFile(e, file.id)
                        }
                    }}
                    className={`group flex items-center gap-2 px-4 h-full text-sm font-medium cursor-pointer border-r border-[#262626] relative transition-colors ${activeFile === file.id ? 'bg-[#171717] text-neutral-200' : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#171717]/50'}`}
                >
                    {activeFile === file.id && (
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-neutral-400" />
                    )}
                    <MaterialIcon name={file.name} type="file" className={`w-4 h-4 ${activeFile === file.id ? 'text-neutral-300' : 'text-neutral-500'}`} />
                    {file.name}
                    {isFileDirty(file.id) ? (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-neutral-400" title="Unsaved changes" />
                    ) : (
                        <button
                            onClick={(e) => onCloseFile(e, file.id)}
                            className={`ml-2 p-0.5 rounded transition-colors ${activeFile === file.id ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#333333]' : 'opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-neutral-300 hover:bg-[#333333]'}`}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {activeFile === file.id && (
                        <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-[#171717]" />
                    )}
                </div>
            ))}
        </div>
    )
}

export type { EditorTab }
