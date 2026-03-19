import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { getSystemPrompt } from "../../../lib/prompts";

export async function POST(request) {
  try {
    const data = await request.json();
    const messages = data.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          error: "Messages are required",
        },
        { status: 400 },
      );
    }

    const systemPrompt =
      typeof getSystemPrompt === "function"
        ? await getSystemPrompt()
        : getSystemPrompt;

    const allMessages = [
      ...(systemPrompt
        ? [{ role: "system", content: String(systemPrompt) }]
        : []),
      ...messages,
    ];

    const client = new OpenAI({
      apiKey: process.env.FIREWORKS_API_KEY,
      baseURL: "https://api.fireworks.ai/inference/v1",
    });

    const response = await client.chat.completions.create({
      model: "accounts/fireworks/models/qwen3-vl-30b-a3b-instruct",
      messages: allMessages,
    });

    const content = response.choices[0].message.content;

    if (!content) {
      return NextResponse.json(
        { error: "Something went wrong while generating response" },
        { status: 500 },
      );
    }

    return NextResponse.json({ response: content }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.messages }, { status: 500 });
  }
}