/**
 * Markdown rendering utilities for the chat panel.
 * Converts markdown text to sanitized HTML for display.
 */

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")

const applyInlineMarkdown = (value: string) => {
    let html = escapeHtml(value)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    return html
}

export function markdownToHtml(content: string): string {
    const lines = content.split("\n")
    const out: string[] = []
    let inUl = false
    let inOl = false
    let inCodeBlock = false
    const codeBuffer: string[] = []

    const closeLists = () => {
        if (inUl) { out.push("</ul>"); inUl = false }
        if (inOl) { out.push("</ol>"); inOl = false }
    }

    for (const rawLine of lines) {
        const line = rawLine.trimEnd()

        if (line.startsWith("```")) {
            if (inCodeBlock) {
                out.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`)
                codeBuffer.length = 0
                inCodeBlock = false
            } else {
                closeLists()
                inCodeBlock = true
            }
            continue
        }

        if (inCodeBlock) { codeBuffer.push(rawLine); continue }
        if (line.length === 0) { closeLists(); continue }

        const h3 = line.match(/^###\s+(.+)/)
        const h2 = line.match(/^##\s+(.+)/)
        const h1 = line.match(/^#\s+(.+)/)
        const ul = line.match(/^[-*]\s+(.+)/)
        const ol = line.match(/^\d+\.\s+(.+)/)
        const quote = line.match(/^>\s+(.+)/)

        if (h1) { closeLists(); out.push(`<h1>${applyInlineMarkdown(h1[1])}</h1>`); continue }
        if (h2) { closeLists(); out.push(`<h2>${applyInlineMarkdown(h2[1])}</h2>`); continue }
        if (h3) { closeLists(); out.push(`<h3>${applyInlineMarkdown(h3[1])}</h3>`); continue }
        if (quote) { closeLists(); out.push(`<blockquote>${applyInlineMarkdown(quote[1])}</blockquote>`); continue }

        if (ul) {
            if (inOl) { out.push("</ol>"); inOl = false }
            if (!inUl) { out.push("<ul>"); inUl = true }
            out.push(`<li>${applyInlineMarkdown(ul[1])}</li>`)
            continue
        }
        if (ol) {
            if (inUl) { out.push("</ul>"); inUl = false }
            if (!inOl) { out.push("<ol>"); inOl = true }
            out.push(`<li>${applyInlineMarkdown(ol[1])}</li>`)
            continue
        }

        closeLists()
        out.push(`<p>${applyInlineMarkdown(line)}</p>`)
    }

    if (inCodeBlock) {
        out.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`)
    }

    closeLists()
    return out.join("\n")
}

export interface AssistantMessageSections {
    think: string
    answer: string
}

export function parseAssistantSections(content: string): AssistantMessageSections {
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
        return { think: thinkPartial, answer: prefix }
    }

    return { think: "", answer: content.trim() }
}

/** CSS classes for rendered markdown container */
export const MARKDOWN_CLASSES = `space-y-2 [&_h1]:mt-2 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-2 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:leading-7 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-600 [&_blockquote]:pl-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-[#333] [&_pre]:bg-[#111] [&_pre]:p-3 [&_pre]:text-[13px] [&_code]:rounded [&_code]:bg-[#1b1b1b] [&_code]:px-1.5 [&_code]:py-0.5 [&_strong]:font-semibold`

export function renderMarkdown(content: string, isThinking = false) {
    return {
        className: `${MARKDOWN_CLASSES} ${isThinking ? "text-neutral-400" : "text-neutral-200"}`,
        dangerouslySetInnerHTML: { __html: markdownToHtml(content) },
    }
}
