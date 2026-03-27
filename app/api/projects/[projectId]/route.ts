import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: messagesError } = await supabase
      .from("messages")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    if (messagesError) {
      console.error("Error deleting project messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to delete project" },
        { status: 500 }
      );
    }

    const { error: projectError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (projectError) {
      console.error("Error deleting project:", projectError);
      return NextResponse.json(
        { error: "Failed to delete project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
