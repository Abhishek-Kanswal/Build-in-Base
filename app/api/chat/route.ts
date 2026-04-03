import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { getSystemPrompt } from "@/lib/prompts";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { message: "Invalid messages format" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: getSystemPrompt(),
    });

    /**
     * Convert OpenAI-style messages → Gemini format
     */
    const history = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history,
    });

    const lastMessage =
      messages[messages.length - 1]?.content ?? "";

    const result = await chat.sendMessage(lastMessage);

    const responseText =
      result.response.text();

    return NextResponse.json({
      response: responseText,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}