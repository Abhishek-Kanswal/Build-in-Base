import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { prompt, chainId } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Generate a short title from the prompt (first 50 chars)
    const title = prompt.trim().length > 50
      ? prompt.trim().substring(0, 50) + "..."
      : prompt.trim();

    // Create project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title,
        chain_id: chainId || "eth",
      })
      .select("id")
      .single();

    if (projectError) {
      console.error("Error creating project:", projectError);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    // Create initial user message
    const { error: messageError } = await supabase
      .from("messages")
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: "user",
        content: prompt.trim(),
      });

    if (messageError) {
      console.error("Error creating message:", messageError);
      // Project was still created, so continue
    }

    return NextResponse.json({ projectId: project.id }, { status: 201 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
