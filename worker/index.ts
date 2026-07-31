/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  PATCH_NOTES_TOKEN?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

type PatchNote = {
  date: string;
  type: string;
  title: string;
  summary: string;
  changes: string[];
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function validNote(value: unknown): value is PatchNote {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<PatchNote>;
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(note.date ?? "") &&
    typeof note.type === "string" && note.type.length >= 1 && note.type.length <= 20 &&
    typeof note.title === "string" && note.title.length >= 1 && note.title.length <= 100 &&
    typeof note.summary === "string" && note.summary.length >= 1 && note.summary.length <= 300 &&
    Array.isArray(note.changes) &&
    note.changes.length <= 20 &&
    note.changes.every((change) => typeof change === "string" && change.length >= 1 && change.length <= 240)
  );
}

async function patchNotesApi(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    const result = await env.DB.prepare(
      `SELECT date, type, title, summary, changes
         FROM patch_notes
        ORDER BY position ASC
        LIMIT 120`,
    ).all<{ date: string; type: string; title: string; summary: string; changes: string }>();
    return json({
      notes: result.results.map((row) => ({
        ...row,
        changes: JSON.parse(row.changes) as string[],
      })),
    });
  }

  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const expected = env.PATCH_NOTES_TOKEN;
  const supplied = request.headers.get("authorization");
  if (!expected || supplied !== `Bearer ${expected}`) return json({ error: "unauthorized" }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const notes = (body as { notes?: unknown })?.notes;
  if (!Array.isArray(notes) || notes.length < 1 || notes.length > 120 || !notes.every(validNote)) {
    return json({ error: "invalid_notes" }, 400);
  }

  const now = new Date().toISOString();
  const statements = [env.DB.prepare("DELETE FROM patch_notes")];
  notes.forEach((note, position) => {
    const id = `${note.date}|${note.type}|${note.title}`;
    statements.push(
      env.DB.prepare(
        `INSERT INTO patch_notes (id, date, type, title, summary, changes, position, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, note.date, note.type, note.title, note.summary, JSON.stringify(note.changes), position, now),
    );
  });
  await env.DB.batch(statements);
  return json({ ok: true, count: notes.length });
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/patch-notes") {
      return patchNotesApi(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
