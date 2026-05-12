/**
 * Context management for the agent loop.
 * Handles sliding window, file injection, and token budgeting.
 */

import { estimateTokens } from "./retry";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type FileMap = Record<string, string>;

// ─── Config ──────────────────────────────────────────────────────────
const MAX_CONTEXT_TOKENS = 24000;
const MAX_FILE_INJECT_TOKENS = 6000;
const MAX_SINGLE_FILE_TOKENS = 2000;
const KEEP_RECENT_MESSAGES = 12;
const MAX_ERROR_LENGTH = 3000;

// ─── File Context Builder ────────────────────────────────────────────

/**
 * Build a file context string that fits within a token budget.
 * Prioritizes: active file > recently changed files > smaller files.
 */
export function buildFileContext(
  files: FileMap,
  activeFile?: string,
  maxTokens: number = MAX_FILE_INJECT_TOKENS
): string {
  const filePaths = Object.keys(files);
  if (filePaths.length === 0) return "";

  // Always include the tree outline (cheap)
  const treeOutline = filePaths.map((p) => `- ${p}`).join("\n");
  let context = `\n\n<current_project_structure>\n${treeOutline}\n</current_project_structure>`;
  let tokensUsed = estimateTokens(context);

  // Prioritize active file
  const priorityFiles: string[] = [];
  if (activeFile && files[activeFile]) {
    priorityFiles.push(activeFile);
  }

  // Add remaining files sorted by size (smallest first — more likely to be important config)
  const remaining = filePaths
    .filter((p) => p !== activeFile)
    .sort((a, b) => (files[a]?.length ?? 0) - (files[b]?.length ?? 0));
  priorityFiles.push(...remaining);

  // Inject file contents within budget
  const injectedFiles: string[] = [];
  for (const path of priorityFiles) {
    const content = files[path];
    if (!content) continue;

    const fileTokens = estimateTokens(content);
    const truncatedContent =
      fileTokens > MAX_SINGLE_FILE_TOKENS
        ? content.slice(0, MAX_SINGLE_FILE_TOKENS * 4) + "\n... (truncated)"
        : content;
    const fileBlock = `\n<file path="${path}">\n${truncatedContent}\n</file>`;
    const blockTokens = estimateTokens(fileBlock);

    if (tokensUsed + blockTokens > maxTokens) {
      // If we haven't injected the active file yet and it's the current one, force it
      if (path === activeFile) {
        const shortContent = content.slice(0, MAX_SINGLE_FILE_TOKENS * 2) + "\n... (truncated)";
        context += `\n<active_file path="${path}">\n${shortContent}\n</active_file>`;
      }
      break;
    }

    const tag = path === activeFile ? "active_file" : "file";
    context += `\n<${tag} path="${path}">\n${truncatedContent}\n</${tag}>`;
    tokensUsed += blockTokens;
    injectedFiles.push(path);
  }

  // Add system note about read action
  context += `\n\n<system_note>To read the contents of any file not shown above, use <boltAction type="read" filePath="path/to/file"></boltAction>. You will receive the contents in the next turn. You may request multiple files.</system_note>`;

  return context;
}

// ─── Sliding Window ──────────────────────────────────────────────────

/**
 * Apply sliding window to conversation messages.
 * Keeps the first user message (seed prompt) + last N messages.
 * Summarizes dropped messages to preserve context.
 */
export function applyContextWindow(
  messages: ChatMessage[],
  maxRecentMessages: number = KEEP_RECENT_MESSAGES
): ChatMessage[] {
  if (messages.length <= maxRecentMessages + 1) {
    return messages;
  }

  // Always keep the first user message (the seed prompt)
  const firstUserMessage = messages.find((m) => m.role === "user");
  const recentMessages = messages.slice(-maxRecentMessages);

  // Create a summary of dropped messages
  const droppedCount = messages.length - maxRecentMessages - (firstUserMessage ? 1 : 0);
  if (droppedCount <= 0) {
    return messages;
  }

  const result: ChatMessage[] = [];

  if (firstUserMessage && !recentMessages.includes(firstUserMessage)) {
    result.push(firstUserMessage);
    result.push({
      role: "assistant" as const,
      content: `[Previous conversation of ${droppedCount} messages omitted for brevity. The project has been built incrementally based on those interactions.]`,
    });
  }

  result.push(...recentMessages);
  return result;
}

// ─── Error Formatting ────────────────────────────────────────────────

/**
 * Format a build error with relevant file context for the LLM.
 * Extracts file paths from the error text and includes their contents.
 */
export function formatBuildError(
  errorText: string,
  files: FileMap
): string {
  // Truncate very long errors
  const truncatedError =
    errorText.length > MAX_ERROR_LENGTH
      ? errorText.slice(0, MAX_ERROR_LENGTH) + "\n... (truncated)"
      : errorText;

  // Extract file paths from error
  const filePathRegex =
    /(?:\.\/)?([a-zA-Z0-9_\-\.\/\[\]]+\.(?:tsx|ts|jsx|js|css|json|html|mjs|cjs))/g;
  const matches = [...truncatedError.matchAll(filePathRegex)];
  const uniqueFiles = Array.from(
    new Set(matches.map((m) => m[1].replace(/^\.\//, "")))
  );

  let fileContext = "";
  for (const file of uniqueFiles) {
    // Try exact match first, then try with common prefixes
    const content = files[file] || files[`src/${file}`] || files[`app/${file}`];
    if (content) {
      const truncated =
        content.length > MAX_SINGLE_FILE_TOKENS * 4
          ? content.slice(0, MAX_SINGLE_FILE_TOKENS * 4) + "\n... (truncated)"
          : content;
      fileContext += `\n<file path="${file}">\n${truncated}\n</file>\n`;
    }
  }

  let message = `The build failed with the following error:\n\n\`\`\`\n${truncatedError}\n\`\`\`\n\n`;

  if (fileContext) {
    message += `Here are the contents of the files mentioned in the error:\n${fileContext}\n`;
  }

  message += `Please fix the code so it compiles and runs correctly. Provide ONLY the <boltArtifact> with the necessary <boltAction> tags — no markdown explanations.`;

  return message;
}

// ─── Full Context Builder ────────────────────────────────────────────

/**
 * Build the complete API messages array with:
 * 1. Template prompts (base project setup)
 * 2. Sliding window of conversation
 * 3. File context injected into the last user message
 */
export function buildContextMessages(
  templatePrompts: string[],
  conversation: ChatMessage[],
  files: FileMap,
  activeFile?: string,
  terminalErrors?: string[]
): ChatMessage[] {
  // Apply sliding window
  const windowedConversation = applyContextWindow(conversation);

  // Build file context
  const fileContext = buildFileContext(files, activeFile);

  // Build terminal error context
  let errorContext = "";
  if (terminalErrors && terminalErrors.length > 0) {
    const recentErrors = terminalErrors.slice(-5).join("\n");
    errorContext = `\n\n<recent_terminal_errors>\n${recentErrors}\n</recent_terminal_errors>`;
  }

  // Combine context and inject into last user message
  const contextSuffix = fileContext + errorContext;

  const result: ChatMessage[] = [
    // Template prompts as initial user messages
    ...templatePrompts.map((content) => ({
      role: "user" as const,
      content,
    })),
    // Conversation with context injected into last user message
    ...windowedConversation.map((msg, idx) => ({
      role: msg.role,
      content:
        idx === windowedConversation.length - 1 && msg.role === "user"
          ? msg.content + contextSuffix
          : msg.content,
    })),
  ];

  // Validate total token count and warn
  const totalTokens = result.reduce(
    (sum, m) => sum + estimateTokens(m.content),
    0
  );
  if (totalTokens > MAX_CONTEXT_TOKENS) {
    console.warn(
      `[context] Total tokens (~${totalTokens}) exceeds budget (${MAX_CONTEXT_TOKENS}). Consider reducing file context.`
    );
  }

  return result;
}
