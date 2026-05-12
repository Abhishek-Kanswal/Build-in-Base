export interface AssistantMessageSections {
    think: string
    answer: string
}

export const parseAssistantSections = (content: string): AssistantMessageSections => {
    const closedThinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i)
    if (closedThinkMatch) {
        return {
            think: closedThinkMatch[1]?.trim() ?? "",
            answer: content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(),
        }
    }

    const openThinkIndex = content.toLowerCase().indexOf("<think>")
    if (openThinkIndex >= 0) {
        const prefix = content.slice(0, openThinkIndex).trim()
        const thinkPartial = content.slice(openThinkIndex + "<think>".length).trim()
        return {
            think: thinkPartial,
            answer: prefix,
        }
    }

    return { think: "", answer: content.trim() }
}
