import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextResponse } from "next/server";

import { getSystemPrompt } from "@/lib/prompts";

export const runtime = "nodejs";

const llmProvider = (process.env.LLM_PROVIDER ?? "fireworks").toLowerCase();
const anthropicModel = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20240620";
const fireworksModel =
  process.env.FIREWORKS_MODEL ?? "accounts/fireworks/models/deepseek-v3p2";
const maxTokens = Number(process.env.LLM_MAX_TOKENS ?? "8000");

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

export async function POST(req: Request) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const fireworks = new OpenAI({
    apiKey: process.env.FIREWORKS_API_KEY,
    baseURL: process.env.FIREWORKS_BASE_URL ?? "https://api.fireworks.ai/inference/v1",
  });

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { message: "Invalid messages format" },
        { status: 400 }
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

    if (llmProvider === "fireworks") {
      if (!process.env.FIREWORKS_API_KEY) {
        console.error("Missing FIREWORKS_API_KEY");
        return NextResponse.json(
          { message: "Missing FIREWORKS_API_KEY" },
          { status: 500 }
        );
      }

      console.log("Requesting Fireworks AI...");
      const completion = await fireworks.chat.completions.create({
        model: fireworksModel,
        max_tokens: Math.min(maxTokens, 4096),
        messages: [
          { role: "system", content: getSystemPrompt() },
          ...mergedMessages,
        ],
      });

      console.log("Fireworks AI response received.");
      return NextResponse.json({
        response: completion.choices[0]?.message?.content ?? "",
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { message: "Missing ANTHROPIC_API_KEY" },
        { status: 500 }
      );
    }

    const response = await anthropic.messages.create({
      messages: mergedMessages,
      model: anthropicModel,
      max_tokens: maxTokens,
      system: getSystemPrompt(),
    });

    const textOutput = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return NextResponse.json({
      response: textOutput,
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);

    return NextResponse.json(
      { message: "Internal Server Error", error: error.message || String(error) },
      { status: 500 }
    );
  }
}