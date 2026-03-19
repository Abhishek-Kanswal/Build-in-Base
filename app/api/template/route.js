import { NextResponse } from "next/server";
import { basePrompt as reactBasePrompt } from "../../../lib/template/react.ts";
import { BASE_PROMPT } from "../../../lib/prompts.ts";

export async function POST(request) {
  try {
    const data = await request.json();
  
    const prompt = data?.prompt;

    if(!prompt){
        return NextResponse.json({error: "Prompt is required"}, {status: 400});
    }
  
    return NextResponse.json({
      prompts: [
        BASE_PROMPT,
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [reactBasePrompt],
    },{ status: 201 });
  } catch (error) {
    return NextResponse.json({error: error.message}, { status: 500 });
  }
}