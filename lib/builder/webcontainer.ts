import type { FileSystemTree } from "@webcontainer/api";

import type { FileMap } from "@/lib/builder/bolt";

export function buildWebContainerTree(files: FileMap): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const [filePath, content] of Object.entries(files)) {
    const segments = filePath.split("/").filter(Boolean);
    if (segments.length === 0) {
      continue;
    }

    let cursor: any = tree;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      const isFile = i === segments.length - 1;

      if (isFile) {
        cursor[segment] = {
          file: {
            contents: content,
          },
        };
        continue;
      }

      if (!cursor[segment]?.directory) {
        cursor[segment] = { directory: {} };
      }

      cursor = cursor[segment].directory;
    }
  }

  return tree;
}

export type FileTreeNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileTreeNode[];
};

export function fileMapToTree(files: FileMap): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  const ensureFolder = (nodes: FileTreeNode[], path: string, name: string): FileTreeNode => {
    const existing = nodes.find((node) => node.path === path && node.type === "folder");
    if (existing) {
      return existing;
    }

    const folder: FileTreeNode = {
      name,
      path,
      type: "folder",
      children: [],
    };
    nodes.push(folder);
    return folder;
  };

  for (const filePath of Object.keys(files)) {
    const segments = filePath.split("/").filter(Boolean);
    if (segments.length === 0) {
      continue;
    }

    let cursor = root;
    let currentPath = "";

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isFile = i === segments.length - 1;

      if (isFile) {
        const existing = cursor.find((node) => node.path === currentPath && node.type === "file");
        if (!existing) {
          cursor.push({
            name: segment,
            path: currentPath,
            type: "file",
          });
        }
      } else {
        const folder = ensureFolder(cursor, currentPath, segment);
        cursor = folder.children ?? [];
        folder.children = cursor;
      }
    }
  }

  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    for (const node of nodes) {
      if (node.children) {
        sortNodes(node.children);
      }
    }
  };

  sortNodes(root);
  return root;
}
