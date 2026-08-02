export const dynamic = "force-dynamic";

type PatchNote = {
  date: string;
  type: string;
  title: string;
  summary: string;
  changes: string[];
  reason: string;
  evidence: string[];
};

type RuntimeEnv = {
  DB: D1Database;
  PATCH_NOTES_TOKEN?: string;
};

async function runtime(): Promise<RuntimeEnv> {
  const workers = await import("cloudflare:workers");
  return workers.env as unknown as RuntimeEnv;
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

function validNote(value: unknown): value is PatchNote {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<PatchNote>;
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(note.date ?? "") &&
    typeof note.type === "string" && note.type.length >= 1 && note.type.length <= 20 &&
    typeof note.title === "string" && note.title.length >= 1 && note.title.length <= 100 &&
    typeof note.summary === "string" && note.summary.length >= 1 && note.summary.length <= 300 &&
    Array.isArray(note.changes) && note.changes.length <= 20 &&
    note.changes.every((change) => typeof change === "string" && change.length >= 1 && change.length <= 240) &&
    typeof note.reason === "string" && note.reason.length >= 1 && note.reason.length <= 600 &&
    Array.isArray(note.evidence) && note.evidence.length <= 12 &&
    note.evidence.every((item) => typeof item === "string" && item.length >= 1 && item.length <= 360)
  );
}

export async function GET() {
  const env = await runtime();
  const result = await env.DB.prepare(
    "SELECT date, type, title, summary, changes, reason, evidence FROM patch_notes ORDER BY position ASC LIMIT 120",
  ).all<{ date: string; type: string; title: string; summary: string; changes: string; reason: string; evidence: string }>();
  return json({
    notes: result.results.map((row) => ({
      ...row,
      changes: JSON.parse(row.changes) as string[],
      evidence: JSON.parse(row.evidence) as string[],
    })),
  });
}

export async function POST(request: Request) {
  const env = await runtime();
  if (!env.PATCH_NOTES_TOKEN || request.headers.get("authorization") !== `Bearer ${env.PATCH_NOTES_TOKEN}`) {
    return json({ error: "unauthorized" }, 401);
  }

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
    statements.push(
      env.DB.prepare(
        "INSERT INTO patch_notes (id, date, type, title, summary, changes, reason, evidence, position, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        `${note.date}|${note.type}|${note.title}`,
        note.date,
        note.type,
        note.title,
        note.summary,
        JSON.stringify(note.changes),
        note.reason,
        JSON.stringify(note.evidence),
        position,
        now,
      ),
    );
  });
  await env.DB.batch(statements);
  return json({ ok: true, count: notes.length });
}
