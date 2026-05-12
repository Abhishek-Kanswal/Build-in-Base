import React, { useRef, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { PromptInputBox } from "@/components/ai-prompt-box"
import { AgentMessage } from "@/components/agent-message"
import { extractActionSummaries, type ActionSummary } from "@/lib/builder/bolt"
import { markdownToHtml, parseAssistantSections, MARKDOWN_CLASSES } from "../lib/markdown"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    created_at: string
}

interface ChatPanelProps {
    messages: Message[]
    isLoadingMessages: boolean
    width: number
    streamingMessageId: string | null
    streamingContent: string
    streamingThinking: string
    isThinking: boolean
    streamingActions: ActionSummary[]
    onSend: (message: string, model: "v0 mini" | "v0 pro") => void
    onStopGeneration?: () => void
    isGenerating?: boolean
    initialModel: "v0 mini" | "v0 pro"
}

function RenderMarkdown({ content, isThinking = false }: { content: string; isThinking?: boolean }) {
    return (
        <div
            className={`${MARKDOWN_CLASSES} ${isThinking ? "text-neutral-400" : "text-neutral-200"}`}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
        />
    )
}

export function ChatPanel({
    messages,
    isLoadingMessages,
    width,
    streamingMessageId,
    streamingContent,
    streamingThinking,
    isThinking,
    streamingActions,
    onSend,
    onStopGeneration,
    isGenerating = false,
    initialModel,
}: ChatPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    return (
        <div style={{ width }} className="flex flex-col h-full bg-[#121212]">
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
                        const isCurrentlyStreaming = msg.id === streamingMessageId
                        const messageActions = msg.role === "assistant" && !isCurrentlyStreaming
                            ? extractActionSummaries(msg.content)
                            : []
                        const parsedAssistant = msg.role === "assistant" && !isCurrentlyStreaming
                            ? parseAssistantSections(msg.content)
                            : null

                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${msg.role === "user"
                                        ? "bg-[#181818] text-neutral-100 border border-[#252525] rounded-br-md whitespace-pre-wrap"
                                        : "bg-[#181818] text-neutral-200 rounded-bl-md"
                                        }`}
                                >
                                    {msg.role === "assistant" ? (
                                        isCurrentlyStreaming ? (
                                            <AgentMessage
                                                content={streamingContent}
                                                thinkingContent={streamingThinking}
                                                isThinking={isThinking}
                                                isStreaming={true}
                                                completedActions={streamingActions}
                                                renderMarkdown={(c) => <RenderMarkdown content={c} />}
                                            />
                                        ) : (
                                            <AgentMessage
                                                content={msg.content}
                                                thinkingContent={parsedAssistant?.think || ""}
                                                isThinking={false}
                                                isStreaming={false}
                                                completedActions={messageActions}
                                                renderMarkdown={(c) => <RenderMarkdown content={c} />}
                                            />
                                        )
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 shrink-0 bg-[#121212] border-t border-[#262626]">
                <div className="relative">
                    <PromptInputBox
                        placeholder="Ask for a follow up..."
                        className="border-[#262626] shadow-inner w-full !bg-[#121212] focus-within:ring-1 focus-within:ring-neutral-500/30 text-neutral-100 placeholder:text-neutral-500 rounded-lg"
                        onSend={(message, model) => onSend(message, model)}
                        onStop={onStopGeneration}
                        isLoading={isGenerating}
                        defaultModel={initialModel}
                    />
                </div>
            </div>
        </div>
    )
}

export type { Message }
