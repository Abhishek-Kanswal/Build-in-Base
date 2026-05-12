/**
 * Lockfile injector — detects which template is in use (React/Vite vs Next.js)
 * and injects the pre-generated package-lock.json into the file map.
 *
 * This allows WebContainer's npm to skip the expensive dependency resolution
 * phase and go straight to downloading/extracting.
 */

import type { FileMap } from "@/lib/builder/bolt";

// We lazy-load the lockfiles to avoid bloating the initial bundle.
let reactLockfilePromise: Promise<string> | null = null;
let nextLockfilePromise: Promise<string> | null = null;

function loadReactLockfile(): Promise<string> {
  if (!reactLockfilePromise) {
    reactLockfilePromise = fetch("/api/lockfile?template=react")
      .then((r) => r.text())
      .catch((err) => {
        console.warn("[lockfile] Failed to load React lockfile:", err);
        reactLockfilePromise = null;
        return "";
      });
  }
  return reactLockfilePromise;
}

function loadNextLockfile(): Promise<string> {
  if (!nextLockfilePromise) {
    nextLockfilePromise = fetch("/api/lockfile?template=next")
      .then((r) => r.text())
      .catch((err) => {
        console.warn("[lockfile] Failed to load Next.js lockfile:", err);
        nextLockfilePromise = null;
        return "";
      });
  }
  return nextLockfilePromise;
}

/**
 * Detect template type from the file map.
 * Looks at the package.json content to determine if it's React/Vite or Next.js.
 */
export function detectTemplate(files: FileMap): "react" | "next" | "unknown" {
  const pkgJson = files["package.json"];
  if (!pkgJson) return "unknown";

  try {
    const pkg = JSON.parse(pkgJson);
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if ("next" in deps || pkg.name === "nextjs-app") return "next";
    if ("vite" in deps || pkg.name === "vite-react-typescript-starter") return "react";

    // Fallback heuristics
    if (pkgJson.includes('"next"')) return "next";
    if (pkgJson.includes('"vite"')) return "react";
  } catch {
    // invalid JSON — can't detect
  }

  return "unknown";
}

/**
 * Inject the correct pre-generated package-lock.json into the file map.
 * Returns a new FileMap with the lockfile added.
 *
 * If the file map already contains a package-lock.json, it is NOT overwritten
 * (the user or AI may have customised dependencies).
 */
export async function injectLockfile(files: FileMap): Promise<FileMap> {
  // Don't overwrite existing lockfile
  if (files["package-lock.json"]) {
    return files;
  }

  const template = detectTemplate(files);
  if (template === "unknown") {
    return files;
  }

  let lockContent = "";

  if (template === "react") {
    lockContent = await loadReactLockfile();
  } else if (template === "next") {
    lockContent = await loadNextLockfile();
  }

  if (!lockContent) {
    return files;
  }

  console.log(`[lockfile] Injected ${template} package-lock.json (${(lockContent.length / 1024).toFixed(0)}KB)`);

  return {
    ...files,
    "package-lock.json": lockContent,
  };
}
