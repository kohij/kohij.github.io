/** Cloudflare Worker: guide, patch notes, secure web market relay. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

const MARKET_PUBLIC_KEY = "MCowBQYDK2VwAyEAXV57KCYmwfNaE9lMk5cnsHB76U8NINEVr6gql714ST0=";
const SESSION_COOKIE = "tbe_market_session";

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

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type PatchNote = { date: string; type: string; title: string; summary: string; changes: string[] };
type MarketSession = { id: string; player_uuid: string; player_name: string; ip: string; expires_at: number };

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers: { "cache-control": "no-store", ...headers } });
}

function base64Bytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "";
}

async function verifySignature(message: string, signature: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "spki", exactBuffer(base64Bytes(MARKET_PUBLIC_KEY)), { name: "Ed25519" }, false, ["verify"],
    );
    return crypto.subtle.verify("Ed25519", key, exactBuffer(base64Bytes(signature)),
      exactBuffer(new TextEncoder().encode(message)));
  } catch {
    return false;
  }
}

function cookieValue(request: Request, name: string): string {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

async function authenticatedSession(request: Request, env: Env): Promise<MarketSession | null> {
  const id = cookieValue(request, SESSION_COOKIE);
  if (!/^[0-9a-f-]{73}$/.test(id)) return null;
  const session = await env.DB.prepare(
    `SELECT id, player_uuid, player_name, ip, expires_at FROM market_sessions WHERE id = ?`,
  ).bind(id).first<MarketSession>();
  const now = Math.floor(Date.now() / 1000);
  if (!session || session.expires_at <= now || session.ip !== clientIp(request)) return null;
  return session;
}

function validNote(value: unknown): value is PatchNote {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<PatchNote>;
  return /^\d{4}-\d{2}-\d{2}$/.test(note.date ?? "") &&
    typeof note.type === "string" && note.type.length >= 1 && note.type.length <= 20 &&
    typeof note.title === "string" && note.title.length >= 1 && note.title.length <= 100 &&
    typeof note.summary === "string" && note.summary.length >= 1 && note.summary.length <= 300 &&
    Array.isArray(note.changes) && note.changes.length <= 20 &&
    note.changes.every((change) => typeof change === "string" && change.length >= 1 && change.length <= 240);
}

async function patchNotesApi(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    const result = await env.DB.prepare(
      `SELECT date, type, title, summary, changes FROM patch_notes ORDER BY position ASC LIMIT 120`,
    ).all<{ date: string; type: string; title: string; summary: string; changes: string }>();
    return json({ notes: result.results.map((row) => ({ ...row, changes: JSON.parse(row.changes) })) });
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const supplied = request.headers.get("authorization");
  if (!env.PATCH_NOTES_TOKEN || supplied !== `Bearer ${env.PATCH_NOTES_TOKEN}`) {
    return json({ error: "unauthorized" }, 401);
  }
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const notes = (body as { notes?: unknown })?.notes;
  if (!Array.isArray(notes) || notes.length < 1 || notes.length > 120 || !notes.every(validNote)) {
    return json({ error: "invalid_notes" }, 400);
  }
  const now = new Date().toISOString();
  const statements = [env.DB.prepare("DELETE FROM patch_notes")];
  notes.forEach((note: PatchNote, position) => statements.push(env.DB.prepare(
    `INSERT INTO patch_notes (id, date, type, title, summary, changes, position, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(`${note.date}|${note.type}|${note.title}`, note.date, note.type, note.title,
    note.summary, JSON.stringify(note.changes), position, now)));
  await env.DB.batch(statements);
  return json({ ok: true, count: notes.length });
}

async function marketLogin(request: Request, env: Env): Promise<Response> {
  if (request.method === "DELETE") {
    const id = cookieValue(request, SESSION_COOKIE);
    if (id) await env.DB.prepare("DELETE FROM market_sessions WHERE id = ?").bind(id).run();
    return json({ ok: true }, 200, { "set-cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let token = "";
  try { token = String((await request.json() as { token?: unknown }).token ?? ""); }
  catch { return json({ error: "invalid_json" }, 400); }
  const parts = token.split(".");
  if (parts.length !== 2 || !(await verifySignature(parts[0], parts[1]))) {
    return json({ error: "invalid_token" }, 401);
  }
  let payload: { aud?: string; sub?: string; name?: string; ip?: string; exp?: number; nonce?: string };
  try { payload = JSON.parse(new TextDecoder().decode(base64Bytes(parts[0]))); }
  catch { return json({ error: "invalid_token" }, 401); }
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== "taekbyeong-market" || !/^[0-9a-f-]{36}$/.test(payload.sub ?? "") ||
      !/^[A-Za-z0-9_]{1,16}$/.test(payload.name ?? "") || !/^[0-9a-f-]{36}$/.test(payload.nonce ?? "") ||
      typeof payload.exp !== "number" || payload.exp <= now || payload.exp > now + 600 ||
      payload.ip !== clientIp(request)) {
    return json({ error: payload.ip !== clientIp(request) ? "ip_mismatch" : "expired_or_invalid" }, 401);
  }
  try {
    await env.DB.prepare(
      `INSERT INTO market_login_nonces (nonce, player_uuid, expires_at, used_at) VALUES (?, ?, ?, ?)`,
    ).bind(payload.nonce, payload.sub, payload.exp, now).run();
  } catch {
    return json({ error: "token_already_used" }, 401);
  }
  const sessionId = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const expiresAt = now + 1800;
  await env.DB.prepare(
    `INSERT INTO market_sessions (id, player_uuid, player_name, ip, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(sessionId, payload.sub, payload.name, payload.ip, expiresAt, now).run();
  return json({ ok: true, playerName: payload.name }, 200, {
    "set-cookie": `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax`,
  });
}

async function marketSnapshot(request: Request, env: Env): Promise<Response> {
  const session = await authenticatedSession(request, env);
  if (!session) return json({ authenticated: false }, 401);
  const player = await env.DB.prepare(
    `SELECT player_name, cash_won, online, positions, accounts, updated_at FROM market_players WHERE player_uuid = ?`,
  ).bind(session.player_uuid).first<{
    player_name: string; cash_won: number; online: number; positions: string; accounts: string; updated_at: number;
  }>();
  const instruments = await env.DB.prepare(
    `SELECT symbol, name, market, currency, type, unit, price_won, change_percent, updated_at
       FROM market_instruments ORDER BY type, symbol LIMIT 500`,
  ).all();
  const commands = await env.DB.prepare(
    `SELECT id, action, symbol, quantity, status, message, created_at
       FROM market_commands WHERE player_uuid = ? ORDER BY created_at DESC LIMIT 12`,
  ).bind(session.player_uuid).all();
  return json({
    authenticated: true,
    player: player ? { ...player, online: Boolean(player.online), positions: JSON.parse(player.positions), accounts: JSON.parse(player.accounts) }
      : { player_name: session.player_name, cash_won: 0, online: false, positions: [], accounts: [], updated_at: 0 },
    instruments: instruments.results,
    commands: commands.results,
  });
}

async function bridgeAuthorized(request: Request): Promise<boolean> {
  const timestamp = request.headers.get("x-tbe-timestamp") ?? "";
  const signature = request.headers.get("x-tbe-signature") ?? "";
  if (!/^\d{10}$/.test(timestamp) || Math.abs(Number(timestamp) - Math.floor(Date.now() / 1000)) > 45) return false;
  return verifySignature(`${timestamp}\nbridge`, signature);
}

async function batch(env: Env, statements: D1PreparedStatement[]) {
  for (let index = 0; index < statements.length; index += 80) {
    await env.DB.batch(statements.slice(index, index + 80));
  }
}

function acceptSocket(request: Request, onMessage: (data: unknown, socket: WebSocket) => Promise<void>): Response {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") return json({ error: "upgrade_required" }, 426);
  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];
  server.accept();
  server.addEventListener("message", (event) => {
    let data: unknown;
    try { data = JSON.parse(String(event.data)); } catch { return; }
    void onMessage(data, server);
  });
  return new Response(null, { status: 101, webSocket: client });
}

async function bridgeSocket(request: Request, env: Env): Promise<Response> {
  if (!(await bridgeAuthorized(request))) return json({ error: "unauthorized" }, 401);
  return acceptSocket(request, async (raw, socket) => {
    const message = raw as Record<string, unknown>;
    if (message.type === "sync") {
      const now = Date.now();
      const instruments = Array.isArray(message.instruments) ? message.instruments.slice(0, 1000) : [];
      const players = Array.isArray(message.players) ? message.players.slice(0, 100) : [];
      const statements: D1PreparedStatement[] = [];
      for (const rawItem of instruments) {
        const item = rawItem as Record<string, unknown>;
        if (!/^[A-Z0-9.^=-]{1,32}$/.test(String(item.symbol ?? ""))) continue;
        statements.push(env.DB.prepare(
          `INSERT INTO market_instruments (symbol, name, market, currency, type, unit, price_won, change_percent, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(symbol) DO UPDATE SET name=excluded.name, market=excluded.market, currency=excluded.currency,
             type=excluded.type, unit=excluded.unit, price_won=excluded.price_won,
             change_percent=excluded.change_percent, updated_at=excluded.updated_at`,
        ).bind(item.symbol, String(item.name ?? "").slice(0, 160), item.market, item.currency, item.type, item.unit,
          Number(item.priceWon ?? 0), Number(item.changePercent ?? 0), now));
      }
      for (const rawPlayer of players) {
        const player = rawPlayer as Record<string, unknown>;
        if (!/^[0-9a-f-]{36}$/.test(String(player.uuid ?? ""))) continue;
        statements.push(env.DB.prepare(
          `INSERT INTO market_players (player_uuid, player_name, cash_won, online, positions, accounts, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(player_uuid) DO UPDATE SET player_name=excluded.player_name, cash_won=excluded.cash_won,
             online=excluded.online, positions=excluded.positions, accounts=excluded.accounts, updated_at=excluded.updated_at`,
        ).bind(player.uuid, String(player.name ?? "").slice(0, 16), Number(player.cashWon ?? 0), player.online ? 1 : 0,
          JSON.stringify(player.positions ?? []), JSON.stringify(player.accounts ?? []), now));
      }
      await batch(env, statements);
      socket.send(JSON.stringify({ type: "sync-ok", updatedAt: now }));
    } else if (message.type === "poll") {
      const pending = await env.DB.prepare(
        `SELECT id, player_uuid AS playerUuid, action, symbol, quantity FROM market_commands
          WHERE status = 'pending' ORDER BY created_at ASC LIMIT 25`,
      ).all<{ id: string; playerUuid: string; action: string; symbol: string; quantity: string }>();
      if (pending.results.length) {
        const now = Date.now();
        await batch(env, pending.results.map((command) => env.DB.prepare(
          `UPDATE market_commands SET status = 'dispatched', updated_at = ? WHERE id = ? AND status = 'pending'`,
        ).bind(now, command.id)));
      }
      socket.send(JSON.stringify({ type: "commands", items: pending.results }));
    } else if (message.type === "result") {
      const id = String(message.id ?? "");
      const status = String(message.status ?? "rejected");
      if (/^[0-9a-f-]{36}$/.test(id) && ["accepted", "rejected", "offline"].includes(status)) {
        await env.DB.prepare(
          `UPDATE market_commands SET status = ?, message = ?, updated_at = ? WHERE id = ?`,
        ).bind(status, String(message.message ?? "").slice(0, 300), Date.now(), id).run();
      }
    }
  });
}

async function browserSocket(request: Request, env: Env): Promise<Response> {
  const session = await authenticatedSession(request, env);
  if (!session) return json({ error: "unauthorized" }, 401);
  return acceptSocket(request, async (raw, socket) => {
    const message = raw as Record<string, unknown>;
    if (message.type === "poll") {
      const snapshot = await marketSnapshot(request, env);
      socket.send(JSON.stringify({ type: "snapshot", ...(await snapshot.json() as object) }));
      return;
    }
    if (message.type !== "trade") return;
    const action = String(message.action ?? "").toLowerCase();
    const symbol = String(message.symbol ?? "").toUpperCase().trim();
    const quantity = String(message.quantity ?? "").toLowerCase().trim();
    if (!["buy", "sell", "search", "option"].includes(action) || !/^[A-Z0-9.^=-]{1,32}$/.test(symbol) ||
        (action !== "search" && action !== "option" && !/^(?:all|[0-9]+(?:\.[0-9]{1,4})?)$/.test(quantity)) ||
        (action === "option" && !/^\d{4}-\d{2}-\d{2}\|[0-9]+(?:\.[0-9]{1,3})?\|(call|put)$/.test(quantity))) {
      socket.send(JSON.stringify({ type: "trade-error", message: "주문 형식을 확인하세요." }));
      return;
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO market_commands (id, session_id, player_uuid, action, symbol, quantity, status, message, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', '게임 서버 전달 대기', ?, ?)`,
    ).bind(id, session.id, session.player_uuid, action, symbol, quantity, now, now).run();
    socket.send(JSON.stringify({ type: "trade-queued", id, message: "주문을 게임 서버에 전달했습니다." }));
  });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/patch-notes") return patchNotesApi(request, env);
    if (url.pathname === "/api/market/login") return marketLogin(request, env);
    if (url.pathname === "/api/market/snapshot") return marketSnapshot(request, env);
    if (url.pathname === "/api/market/bridge") return bridgeSocket(request, env);
    if (url.pathname === "/api/market/ws") return browserSocket(request, env);
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
