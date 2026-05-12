export type BoltActionType = "file" | "shell" | "edit" | "read" | "delete";

export type BoltAction = {
  type: BoltActionType;
  filePath?: string;
  content: string;
  // For type="edit" — parsed search/replace pairs
  edits?: SearchReplacePair[];
};

export type SearchReplacePair = {
  search: string;
  replace: string;
};

export type FileMap = Record<string, string>;

/**
 * Parse all <boltAction> tags from an LLM response.
 * Supports type="file", type="shell", and type="edit".
 */
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

    if (type !== "file" && type !== "shell" && type !== "edit" && type !== "read" && type !== "delete") {
      continue;
    }

    const action: BoltAction = {
      type: type as BoltActionType,
      filePath,
      content: content.trim(),
    };

    // Parse search/replace pairs for edit actions
    if (type === "edit") {
      action.edits = parseSearchReplacePairs(content);
    }

    actions.push(action);
  }

  return actions;
}

/**
 * Parse <search>...</search> and <replace>...</replace> block pairs from edit content.
 */
export function parseSearchReplacePairs(content: string): SearchReplacePair[] {
  const pairs: SearchReplacePair[] = [];
  const pairRegex = /<search>([\s\S]*?)<\/search>\s*<replace>([\s\S]*?)<\/replace>/g;

  let match: RegExpExecArray | null;
  while ((match = pairRegex.exec(content)) !== null) {
    pairs.push({
      search: match[1],
      replace: match[2],
    });
  }

  return pairs;
}

/**
 * Apply a single search/replace edit to source code.
 * Tries exact match first, then fuzzy (whitespace-normalized) match.
 */
export function applySearchReplace(
  source: string,
  search: string,
  replace: string
): { result: string; applied: boolean } {
  const searchTrimmed = search.trim();
  const replaceTrimmed = replace.trim();

  if (!searchTrimmed) {
    return { result: source, applied: false };
  }

  // 1. Try exact match (preserving whitespace)
  const exactIndex = source.indexOf(searchTrimmed);
  if (exactIndex !== -1) {
    return {
      result: source.slice(0, exactIndex) + replaceTrimmed + source.slice(exactIndex + searchTrimmed.length),
      applied: true,
    };
  }

  // 2. Fuzzy match: normalize leading whitespace per line
  const fuzzyResult = fuzzySearchReplace(source, searchTrimmed, replaceTrimmed);
  if (fuzzyResult !== null) {
    return { result: fuzzyResult, applied: true };
  }

  // 3. No match found
  console.warn(`[bolt] Search block not found in file. Skipping edit.`);
  console.warn(`[bolt] Search was:\n${searchTrimmed.slice(0, 120)}...`);
  return { result: source, applied: false };
}

/**
 * Fuzzy search/replace — strips leading whitespace from each line before comparing.
 * If a match is found, replaces the original (indented) block.
 */
function fuzzySearchReplace(
  source: string,
  search: string,
  replace: string
): string | null {
  const normalizeLines = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trimStart())
      .join("\n");

  const sourceNormalized = normalizeLines(source);
  const searchNormalized = normalizeLines(search);

  const normalizedIndex = sourceNormalized.indexOf(searchNormalized);
  if (normalizedIndex === -1) {
    return null;
  }

  // Map the normalized index back to the original source position.
  // Count the character position by walking through the original source
  // and the normalized version together.
  let originalCharCount = 0;
  let normalizedCharCount = 0;
  const sourceLines = source.split("\n");
  const normalizedLines = sourceNormalized.split("\n");

  let startLineIdx = -1;
  let endLineIdx = -1;
  let normalizedSoFar = 0;

  for (let i = 0; i < normalizedLines.length; i++) {
    const lineLen = normalizedLines[i].length + 1; // +1 for \n
    if (startLineIdx === -1 && normalizedSoFar + lineLen > normalizedIndex) {
      startLineIdx = i;
    }
    if (startLineIdx !== -1 && normalizedSoFar + lineLen >= normalizedIndex + searchNormalized.length) {
      endLineIdx = i;
      break;
    }
    normalizedSoFar += lineLen;
  }

  if (startLineIdx === -1 || endLineIdx === -1) {
    return null;
  }

  // Detect the indentation of the first matched line
  const firstMatchedLine = sourceLines[startLineIdx];
  const indentMatch = firstMatchedLine.match(/^(\s*)/);
  const baseIndent = indentMatch ? indentMatch[1] : "";

  // Apply the base indentation to each replacement line
  const replaceLines = replace.split("\n");
  const indentedReplace = replaceLines
    .map((line, idx) => {
      if (idx === 0) return baseIndent + line.trimStart();
      // Preserve relative indentation within the replacement
      return baseIndent + line.trimStart();
    })
    .join("\n");

  const before = sourceLines.slice(0, startLineIdx).join("\n");
  const after = sourceLines.slice(endLineIdx + 1).join("\n");

  const parts = [before, indentedReplace, after].filter(Boolean);
  return parts.join("\n");
}

export function normalizeFilePath(filePath: string): string {
  return filePath.replace(/^\/+/, "").replace(/\/+/g, "/");
}

/**
 * Strip residual bolt markup tags that may leak into file content
 * when the AI confuses edit/file syntax or produces malformed output.
 */
function sanitizeFileContent(content: string): string {
  return content
    .replace(/<\/?search>/g, "")
    .replace(/<\/?replace>/g, "")
    .replace(/^\s*\n/, ""); // remove leading blank line left after tag removal
}

/**
 * Apply all bolt actions from a response to the current file map.
 * Handles type="file" (full replacement), type="edit" (surgical search/replace), and type="delete".
 */
export function applyBoltActionsToFiles(currentFiles: FileMap, response: string): FileMap {
  const nextFiles: FileMap = { ...currentFiles };
  const actions = parseBoltActions(response);

  for (const action of actions) {
    if (action.type === "delete" && action.filePath) {
      const normalizedPath = normalizeFilePath(action.filePath);
      delete nextFiles[normalizedPath];
      continue;
    }

    if (!action.filePath) continue;

    const normalizedPath = normalizeFilePath(action.filePath);

    if (action.type === "file") {
      // Full file creation/replacement — sanitize to strip any residual markup
      nextFiles[normalizedPath] = sanitizeFileContent(action.content);
    } else if (action.type === "edit" && action.edits) {
      // Surgical search/replace edits
      let fileContent = nextFiles[normalizedPath] ?? "";

      for (const edit of action.edits) {
        const { result, applied } = applySearchReplace(fileContent, edit.search, edit.replace);
        if (applied) {
          fileContent = result;
        }
      }

      nextFiles[normalizedPath] = sanitizeFileContent(fileContent);
    }
    // type="shell" and type="read" don't affect files
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

/**
 * Extract a human-readable summary of actions from a response.
 * Used by the agent-message UI to show action step cards.
 */
export type ActionSummary = {
  type: BoltActionType;
  filePath?: string;
  label: string;
  editCount?: number;
  content: string;
};

export function extractActionSummaries(response: string): ActionSummary[] {
  const actions = parseBoltActions(response);
  return actions.map((action) => {
    if (action.type === "edit" && action.filePath) {
      const editCount = action.edits?.length ?? 0;
      const fileName = action.filePath.split("/").pop() ?? action.filePath;
      return {
        type: action.type,
        filePath: action.filePath,
        label: `Edited ${fileName} — ${editCount} change${editCount !== 1 ? "s" : ""}`,
        editCount,
        content: action.content,
      };
    }
    if (action.type === "file" && action.filePath) {
      const fileName = action.filePath.split("/").pop() ?? action.filePath;
      return {
        type: action.type,
        filePath: action.filePath,
        label: `Created ${fileName}`,
        content: action.content,
      };
    }
    if (action.type === "delete" && action.filePath) {
      const fileName = action.filePath.split("/").pop() ?? action.filePath;
      return {
        type: action.type,
        filePath: action.filePath,
        label: `Deleted ${fileName}`,
        content: action.content,
      };
    }
    if (action.type === "shell") {
      const cmd = action.content.length > 60 ? action.content.slice(0, 60) + "..." : action.content;
      return {
        type: action.type,
        label: `Ran ${cmd}`,
        content: action.content,
      };
    }
    return {
      type: action.type,
      filePath: action.filePath,
      label: action.type,
      content: action.content,
    };
  });
}
