import React from "react"
import {
    ChevronLeft, ChevronRight, RotateCw, Smartphone, Monitor,
    Lock, ExternalLink, Loader2
} from "lucide-react"

interface PreviewPanelProps {
    previewUrl: string
    previewMode: "desktop" | "mobile"
    setPreviewMode: (mode: "desktop" | "mobile") => void
    isBooting: boolean
    isGenerating: boolean
}

export function PreviewPanel({
    previewUrl,
    previewMode,
    setPreviewMode,
    isBooting,
    isGenerating,
}: PreviewPanelProps) {
    return (
        <div className="flex-1 flex flex-col bg-[#121212] relative z-0 w-full h-full animate-in fade-in duration-200">
            {/* Browser Toolbar */}
            <div className="h-12 flex items-center px-4 border-b border-[#262626] bg-[#171717] gap-4 shrink-0">
                <div className="flex items-center gap-1.5">
                    <button className="text-neutral-500 hover:text-neutral-300 p-1.5 rounded-md hover:bg-[#262626]/50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <button className="text-neutral-500 hover:text-neutral-300 p-1.5 rounded-md hover:bg-[#262626]/50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    <button className="text-neutral-500 hover:text-neutral-300 p-1.5 rounded-md hover:bg-[#262626]/50 transition-colors"><RotateCw className="w-4 h-4" /></button>
                </div>

                {/* Address Bar */}
                <div className="flex-1 bg-[#151515] border border-[#262626] rounded-md h-8 flex items-center justify-between px-3 shadow-inner">
                    <div className="flex items-center">
                        <Lock className="w-3 h-3 text-neutral-500 mr-2" />
                        <span className="text-neutral-400 text-xs font-medium">{previewUrl || "localhost:3000"}</span>
                    </div>
                    <button
                        className="text-neutral-500 hover:text-neutral-300 transition-colors"
                        title="Open in new tab"
                        onClick={() => { if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer") }}
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
                    className={`bg-[#0A0A0A] rounded-lg shadow-sm overflow-hidden flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${previewMode === 'mobile' ? 'w-[375px] h-[812px] flex-none' : 'w-full h-full'}`}
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
    )
}
