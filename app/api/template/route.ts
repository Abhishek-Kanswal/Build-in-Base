import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextResponse } from "next/server";

import { BASE_PROMPT } from "@/lib/prompts";
import { basePrompt as nodeBasePrompt } from "@/lib/template/node";
import { basePrompt as reactBasePrompt } from "@/lib/template/react";
import { basePrompt as nextBasePrompt } from "@/lib/template/next";

export const runtime = "nodejs";

const llmProvider = (process.env.LLM_PROVIDER ?? "fireworks").toLowerCase();
const anthropicModel = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20240620";
const fireworksModel = process.env.FIREWORKS_MODEL ?? "accounts/fireworks/models/deepseek-v3";

export async function POST(req: Request) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const fireworks = new OpenAI({
    apiKey: process.env.FIREWORKS_API_KEY,
    baseURL: process.env.FIREWORKS_BASE_URL ?? "https://api.fireworks.ai/inference/v1",
  });

  try {
    const { prompt } = await req.json();
    let answer = "";

    const systemPrompt = "Return either 'node', 'react', or 'next' based on what do you think this project should be. Use 'next' for Next.js full-stack or SSR React apps, 'react' for client-side single page apps, and 'node' for backend projects. Only return a single word either 'node', 'react', or 'next'. Do not return anything extra.";

    if (llmProvider === "fireworks") {
      if (!process.env.FIREWORKS_API_KEY) {
        console.error("Missing FIREWORKS_API_KEY");
        return NextResponse.json(
          { message: "Missing FIREWORKS_API_KEY" },
          { status: 500 }
        );
      }

      console.log("Requesting Template Fireworks AI...");
      const completion = await fireworks.chat.completions.create({
        model: fireworksModel,
        max_tokens: 200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      });

      answer = (completion.choices[0]?.message?.content ?? "").trim().toLowerCase();
      console.log("Template Fireworks AI answer:", answer);
    } else {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
          { message: "Missing ANTHROPIC_API_KEY" },
          { status: 500 }
        );
      }

      const response = await anthropic.messages.create({
        messages: [{ role: "user", content: prompt }],
        model: anthropicModel,
        max_tokens: 200,
        system: systemPrompt,
      });

      answer = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim()
        .toLowerCase();
    }

    answer = answer.replace(/['"`]/g, '').trim().toLowerCase();
    
    // The LLM sometimes outputs paragraphs of reasoning. We extract the LAST occurrence of our keywords.
    const matches = answer.match(/\b(next|react|node)\b/g);
    const finalDecision = matches ? matches[matches.length - 1] : "react";
    console.log(`Parsed final decision from LLM output: ${finalDecision}`);

    if (finalDecision === "next") {
      return NextResponse.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nextBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nextBasePrompt],
      });
    }

    if (finalDecision === "react") {
      return NextResponse.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactBasePrompt],
      });
    }

    if (finalDecision === "node") {
      return NextResponse.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodeBasePrompt],
      });
    }

    // Default fallback to React if the LLM hallucinated something entirely else
    console.warn(`Unexpected AI template response: "${answer}". Defaulting to React.`);
    return NextResponse.json({
      prompts: [
        BASE_PROMPT,
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [reactBasePrompt],
    });
  } catch (error: any) {
    console.error("Template API Error:", error);

    return NextResponse.json(
      { message: "Internal server error", error: error.message || String(error) },
      { status: 500 }
    );
  }
}