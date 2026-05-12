import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { serializeMessage, serializeProject } from "@/lib/data";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    project: serializeProject(project),
    messages: project.messages.map(serializeMessage),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json({ message: "Title is required" }, { status: 400 });
  }

  const existingProject = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });

  if (!existingProject) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { title },
  });

  return NextResponse.json({ project: serializeProject(project) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const existingProject = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });

  if (!existingProject) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  await prisma.project.delete({
    where: { id: projectId },
  });

  return NextResponse.json({ success: true });
}
