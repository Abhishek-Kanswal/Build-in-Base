import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { BASE_PROMPT } from "@/lib/prompts";
import { basePrompt as nodeBasePrompt } from "@/lib/template/node";
import { basePrompt as reactBasePrompt } from "@/lib/template/react";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(
      `
Return either "node" or "react" based on what the project should be.

User prompt:
${prompt}

Rules:
- Return ONLY one word
- Either "node" or "react"
- No explanation
`
    );

    const answer = result.response.text().trim().toLowerCase();

    if (answer.includes("react")) {
      return NextResponse.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactBasePrompt],
      });
    }

    if (answer.includes("node")) {
      return NextResponse.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodeBasePrompt],
      });
    }

    return NextResponse.json(
      { message: "Invalid response from Gemini" },
      { status: 403 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}