import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { getSystemPrompt } from "@/lib/prompts";

export const runtime = "nodejs";

const llmProvider = (process.env.LLM_PROVIDER ?? "fireworks").toLowerCase();
const anthropicModel = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20240620";
const fireworksModel = process.env.FIREWORKS_MODEL ?? "accounts/fireworks/models/deepseek-v3";
const maxTokens = Number(process.env.LLM_MAX_TOKENS ?? "16384");

function normalizeContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "object" && part !== null && "type" in part && "text" in part) {
        const typedPart = part as { type?: string; text?: string };
        return typedPart.type === "text" ? typedPart.text ?? "" : "";
      }
      return "";
    })
    .join("\n")
    .trim();
}

/**
 * Collect full response from Fireworks using streaming internally.
 * Fireworks requires stream=true for max_tokens > 4096.
 */
async function collectFireworksResponse(
  fireworks: OpenAI,
  mergedMessages: Array<{ role: "user" | "assistant"; content: string }>,
  modelToUse: string
): Promise<string> {
  const completion = await fireworks.chat.completions.create({
    model: modelToUse,
    max_tokens: Math.min(maxTokens, 32768),
    stream: true,
    messages: [
      { role: "system", content: getSystemPrompt() },
      ...mergedMessages,
    ],
  });

  let fullResponse = "";
  for await (const chunk of completion) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      fullResponse += delta;
    }
  }
  return fullResponse;
}

/**
 * Collect full response from Anthropic (non-streaming).
 */
async function collectAnthropicResponse(
  anthropic: Anthropic,
  mergedMessages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const result = await anthropic.messages.create({
    messages: mergedMessages,
    model: anthropicModel,
    max_tokens: maxTokens,
    system: getSystemPrompt(),
  });

  return result.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export async function POST(req: Request) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const fireworks = new OpenAI({
    apiKey: process.env.FIREWORKS_API_KEY,
    baseURL: process.env.FIREWORKS_BASE_URL ?? "https://api.fireworks.ai/inference/v1",
  });

  try {
    const body = await req.json();
    const { messages, stream: useStreaming = false, model: requestModel } = body;

    let currentFireworksModel = fireworksModel;
    if (requestModel === "v0 mini") {
      currentFireworksModel = process.env.FIREWORKS_FAST_MODEL ?? "accounts/fireworks/models/deepseek-v3";
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ message: "Invalid messages format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const normalizedMessages = messages as Array<{
      role: "user" | "assistant";
      content: unknown;
    }>;

    // Merge consecutive messages of the same role
    const mergedMessages: Array<{ role: "user" | "assistant", content: string }> = [];
    for (const msg of normalizedMessages) {
      if (msg.role !== "user" && msg.role !== "assistant") continue;

      const content = normalizeContent(msg.content);
      const last = mergedMessages[mergedMessages.length - 1];

      if (last && last.role === msg.role) {
        last.content += "\n\n" + content;
      } else {
        mergedMessages.push({ role: msg.role, content });
      }
    }

    // ────────────────────────────────────────────────
    // MODE 1: SSE Streaming (when stream=true)
    // ────────────────────────────────────────────────
    if (useStreaming) {
      const encoder = new TextEncoder();
      let controllerClosed = false;

      const readableStream = new ReadableStream({
        async start(controller) {
          const sendEvent = (data: { type: string; content?: string }) => {
            if (controllerClosed) return;
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            } catch {
              controllerClosed = true;
            }
          };

          try {
            if (llmProvider === "fireworks") {
              if (!process.env.FIREWORKS_API_KEY) {
                sendEvent({ type: "error", content: "Missing FIREWORKS_API_KEY" });
                if (!controllerClosed) controller.close();
                return;
              }

              const completion = await fireworks.chat.completions.create({
                model: currentFireworksModel,
                max_tokens: Math.min(maxTokens, 32768),
                stream: true,
                messages: [
                  { role: "system", content: getSystemPrompt() },
                  ...mergedMessages,
                ],
              });

              let totalChars = 0;
              for await (const chunk of completion) {
                const delta = chunk.choices?.[0]?.delta?.content;
                if (delta) {
                  totalChars += delta.length;
                  sendEvent({ type: "delta", content: delta });
                }
              }
              // Send token usage estimate
              sendEvent({ type: "usage", content: JSON.stringify({ estimatedTokens: Math.ceil(totalChars / 4) }) });
            } else {
              if (!process.env.ANTHROPIC_API_KEY) {
                sendEvent({ type: "error", content: "Missing ANTHROPIC_API_KEY" });
                if (!controllerClosed) controller.close();
                return;
              }

              const response = anthropic.messages.stream({
                messages: mergedMessages,
                model: anthropicModel,
                max_tokens: maxTokens,
                system: getSystemPrompt(),
              });

              for await (const event of response) {
                if (
                  event.type === "content_block_delta" &&
                  event.delta.type === "text_delta"
                ) {
                  sendEvent({ type: "delta", content: event.delta.text });
                }
              }
            }

            sendEvent({ type: "done" });
          } catch (error: any) {
            console.error("Streaming error:", error);
            sendEvent({
              type: "error",
              content: error.message || String(error),
            });
          } finally {
            if (!controllerClosed) {
              controllerClosed = true;
              controller.close();
            }
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ────────────────────────────────────────────────
    // MODE 2: Regular JSON response (default)
    // Fireworks always uses streaming internally (required for >4096 tokens)
    // ────────────────────────────────────────────────
    let responseText = "";

    if (llmProvider === "fireworks") {
      if (!process.env.FIREWORKS_API_KEY) {
        return new Response(
          JSON.stringify({ message: "Missing FIREWORKS_API_KEY" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(`Requesting Fireworks AI (JSON mode, internal streaming) using model: ${currentFireworksModel}...`);
      responseText = await collectFireworksResponse(fireworks, mergedMessages, currentFireworksModel);
    } else {
      if (!process.env.ANTHROPIC_API_KEY) {
        return new Response(
          JSON.stringify({ message: "Missing ANTHROPIC_API_KEY" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      responseText = await collectAnthropicResponse(anthropic, mergedMessages);
    }

    return new Response(
      JSON.stringify({ response: responseText }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Chat API Error:", error);

    return new Response(
      JSON.stringify({ message: "Internal Server Error", error: error.message || String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}