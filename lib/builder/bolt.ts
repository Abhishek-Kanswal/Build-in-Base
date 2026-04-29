export type BoltAction = {
  type: "file" | "shell";
  filePath?: string;
  content: string;
};

export type FileMap = Record<string, string>;

export function parseBoltActions(response: string): BoltAction[] {
  const actions: BoltAction[] = [];
  const actionRegex = /<boltAction([^>]*)>([\s\S]*?)<\/boltAction>/g;

  let match: RegExpExecArray | null;
  while ((match = actionRegex.exec(response)) !== null) {
    const [, attributes, content] = match;
    
    const typeMatch = /type=["']([^"']*)["']/.exec(attributes);
    const filePathMatch = /filePath=["']([^"']*)["']/.exec(attributes);
    
    const type = typeMatch ? typeMatch[1] : undefined;
    const filePath = filePathMatch ? filePathMatch[1] : undefined;

    if (type !== "file" && type !== "shell") {
      continue;
    }

    actions.push({
      type,
      filePath,
      content: content.trim(),
    });
  }

  return actions;
}

export function normalizeFilePath(filePath: string): string {
  return filePath.replace(/^\/+/, "").replace(/\/+/g, "/");
}

export function applyBoltActionsToFiles(currentFiles: FileMap, response: string): FileMap {
  const nextFiles: FileMap = { ...currentFiles };
  const actions = parseBoltActions(response);

  for (const action of actions) {
    if (action.type !== "file" || !action.filePath) {
      continue;
    }

    const normalizedPath = normalizeFilePath(action.filePath);
    nextFiles[normalizedPath] = action.content;
  }

  return nextFiles;
}

export function buildFilesFromResponses(responses: string[]): FileMap {
  let files: FileMap = {};
  for (const response of responses) {
    files = applyBoltActionsToFiles(files, response);
  }
  return files;
}
