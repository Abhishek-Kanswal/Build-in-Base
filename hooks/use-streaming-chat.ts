"use client";

import { useRef, useCallback } from "react";
import {
  parseBoltActions,
  applyBoltActionsToFiles,
  extractActionSummaries,
  type FileMap,
  type ActionSummary,
} from "@/lib/builder/bolt";

export interface StreamingState {
  /** Full accumulated content from the LLM */
  content: string;
  /** Extracted thinking content from <think> tags */
  thinkingContent: string;
  /** Whether we're still inside an open <think> tag */
  isThinking: boolean;
  /** Whether the stream is active */
  isStreaming: boolean;
  /** Completed action summaries parsed so far */
  completedActions: ActionSummary[];
  /** Any error message */
  error: string | null;
}

interface UseStreamingChatOptions {
  onFilesUpdate?: (files: FileMap) => void;
  onContentUpdate?: (content: string) => void;
  onThinkingUpdate?: (thinking: string, isThinking: boolean) => void;
  onActionsUpdate?: (actions: ActionSummary[]) => void;
  onStreamStart?: () => void;
  onStreamEnd?: (fullContent: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook that consumes an SSE stream from /api/chat and incrementally
 * parses <think>, <boltArtifact>, and <boltAction> tags.
 *
 * Returns a `startStream` function and an `abort` function.
 */
export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const contentRef = useRef("");
  const lastParsedIndexRef = useRef(0);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  /**
   * Parse <think>...</think> from accumulated content.
   * Returns { thinkingContent, isThinking, answerContent }
   */
  const parseThinking = useCallback((content: string) => {
    // Check for closed think tag
    const closedMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
    if (closedMatch) {
      return {
        thinkingContent: closedMatch[1]?.trim() ?? "",
        isThinking: false,
        answerContent: content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(),
      };
    }

    // Check for open (still streaming) think tag
    const openIndex = content.toLowerCase().indexOf("<think>");
    if (openIndex >= 0) {
      const thinkPartial = content.slice(openIndex + "<think>".length).trim();
      const prefix = content.slice(0, openIndex).trim();
      return {
        thinkingContent: thinkPartial,
        isThinking: true,
        answerContent: prefix,
      };
    }

    return {
      thinkingContent: "",
      isThinking: false,
      answerContent: content,
    };
  }, []);

  /**
   * Incrementally extract completed boltAction tags and generate summaries.
   * Only parses new content since the last check.
   */
  const parseCompletedActions = useCallback((content: string): ActionSummary[] => {
    // Only try to parse complete actions (closed tags)
    return extractActionSummaries(content);
  }, []);

  /**
   * Start streaming from the /api/chat endpoint.
   * @param messages - The conversation messages to send
   * @param currentFiles - Current file map (for applying edits)
   */
  const startStream = useCallback(
    async (
      messages: Array<{ role: string; content: string }>,
      currentFiles: FileMap = {}
    ): Promise<{ content: string; files: FileMap }> => {
      // Abort any existing stream
      abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      contentRef.current = "";
      lastParsedIndexRef.current = 0;

      options.onStreamStart?.();

      let fullContent = "";
      let resultFiles = { ...currentFiles };

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API error: ${response.status} — ${errText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "delta" && event.content) {
                fullContent += event.content;
                contentRef.current = fullContent;

                // Update content callback
                options.onContentUpdate?.(fullContent);

                // Parse thinking
                const { thinkingContent, isThinking } = parseThinking(fullContent);
                options.onThinkingUpdate?.(thinkingContent, isThinking);

                // Parse completed actions
                const actions = parseCompletedActions(fullContent);
                if (actions.length > 0) {
                  options.onActionsUpdate?.(actions);

                  // Apply file changes incrementally
                  const newFiles = applyBoltActionsToFiles(currentFiles, fullContent);
                  if (JSON.stringify(newFiles) !== JSON.stringify(resultFiles)) {
                    resultFiles = newFiles;
                    options.onFilesUpdate?.(resultFiles);
                  }
                }
              } else if (event.type === "error") {
                throw new Error(event.content || "Stream error");
              } else if (event.type === "done") {
                // Final parse
                const finalFiles = applyBoltActionsToFiles(currentFiles, fullContent);
                resultFiles = finalFiles;
                options.onFilesUpdate?.(resultFiles);
              }
            } catch (parseErr) {
              // Skip malformed SSE lines
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }

        options.onStreamEnd?.(fullContent);
        return { content: fullContent, files: resultFiles };
      } catch (error: any) {
        if (error.name === "AbortError") {
          // User cancelled — not an error
          options.onStreamEnd?.(fullContent);
          return { content: fullContent, files: resultFiles };
        }

        const errMsg = error.message || String(error);
        options.onError?.(errMsg);
        throw error;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [abort, options, parseThinking, parseCompletedActions]
  );

  return { startStream, abort };
}
