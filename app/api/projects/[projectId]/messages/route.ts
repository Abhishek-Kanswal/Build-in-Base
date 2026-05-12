import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { serializeMessage } from "@/lib/data";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await req.json();
  const role =
    body.role === "assistant" ? "assistant" : body.role === "user" ? "user" : null;
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!role || !content) {
    return NextResponse.json(
      { message: "Role and content are required." },
      { status: 400 }
    );
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      projectId,
      userId,
      role,
      content,
    },
  });

  return NextResponse.json({ message: serializeMessage(message) });
}
