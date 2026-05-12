import type { Message, Project } from "@prisma/client";

export type ProjectDto = {
  id: string;
  title: string;
  chain_id: string;
  created_at: string;
  updated_at: string;
};

export type MessageDto = {
  id: string;
  project_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export function serializeProject(project: Project): ProjectDto {
  return {
    id: project.id,
    title: project.title,
    chain_id: project.chainId,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
  };
}

export function serializeMessage(message: Message): MessageDto {
  return {
    id: message.id,
    project_id: message.projectId,
    user_id: message.userId,
    role: message.role,
    content: message.content,
    created_at: message.createdAt.toISOString(),
  };
}
