import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { serializeMessage, serializeProject } from "@/lib/data";
import { prisma } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ projects: projects.map(serializeProject) });
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const chainId = typeof body.chainId === "string" ? body.chainId.trim() : "eth";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!id || !title || !prompt) {
    return NextResponse.json(
      { message: "Missing required fields: id, title, and prompt." },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: {
      id,
      userId,
      title,
      chainId,
      messages: {
        create: {
          userId,
          role: "user",
          content: prompt,
        },
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    project: serializeProject(project),
    message: project.messages[0] ? serializeMessage(project.messages[0]) : null,
  });
}
