import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

/**
 * Serves pre-generated package-lock.json files for templates.
 * These are served as raw text so the client can inject them
 * into the WebContainer file tree before npm install.
 *
 * GET /api/lockfile?template=react   → React/Vite lockfile
 * GET /api/lockfile?template=next    → Next.js lockfile
 */
export async function GET(request: NextRequest) {
  const template = request.nextUrl.searchParams.get("template");

  if (!template || !["react", "next"].includes(template)) {
    return NextResponse.json(
      { error: 'Missing or invalid "template" query parameter. Use "react" or "next".' },
      { status: 400 }
    );
  }

  const fileName = template === "react" ? "react-lock.json" : "next-lock.json";
  const filePath = join(process.cwd(), "lib", "template", fileName);

  try {
    const content = await readFile(filePath, "utf-8");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache for 1 hour on CDN, 24h in browser
        "Cache-Control": "public, s-maxage=3600, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: any) {
    console.error(`[lockfile] Failed to read ${fileName}:`, err.message);
    return NextResponse.json(
      { error: `Lockfile not found for template: ${template}` },
      { status: 404 }
    );
  }
}
