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
type YahooChartResult = {
  meta?: { regularMarketPrice?: number };
  timestamp?: Array<number | null>;
  indicators?: { quote?: Array<{
    open?: Array<number | null>; high?: Array<number | null>; low?: Array<number | null>;
    close?: Array<number | null>; volume?: Array<number | null>;
  }> };
};

type MarketPlayerRow = {
  player_name: string;
  cash_won: number;
  online: number;
  positions: string;
  accounts: string;
  updated_at: number;
};

type PublicPosition = {
  symbol: string;
  name: string;
  type: string;
  unit: string;
  quantity: string;
  valueWon: number;
  profitWon: number;
};

type PublicAccount = {
  name: string;
  type: string;
  principalWon: number;
  rate: number;
  maturityAt: number;
};

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers: { "cache-control": "no-store", ...headers } });
}

async function marketLogo(request: Request): Promise<Response> {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
  const symbol = new URL(request.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9.^=-]{1,32}$/.test(symbol)) return json({ error: "invalid_symbol" }, 400);

  try {
    const upstream = await fetch(`https://assets.parqet.com/logos/symbol/${encodeURIComponent(symbol)}?format=png`, {
      headers: { accept: "image/png,image/*;q=0.8" }, redirect: "follow",
    });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !contentType.startsWith("image/")) return json({ error: "logo_not_found" }, 404);
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "content-type": contentType,
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return json({ error: "logo_unavailable" }, 502);
  }
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

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
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
  if (!session || session.expires_at <= now) return null;
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
  if (!sameOrigin(request)) return json({ error: "invalid_origin" }, 403);
  if (request.method === "DELETE") {
    const id = cookieValue(request, SESSION_COOKIE);
    if (id) await env.DB.prepare("DELETE FROM market_sessions WHERE id = ?").bind(id).run();
    return json({ ok: true }, 200, { "set-cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let code = "";
  try { code = String((await request.json() as { code?: unknown }).code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  catch { return json({ error: "invalid_json" }, 400); }
  if (!/^[A-Z2-9]{8}$/.test(code)) return json({ error: "invalid_code" }, 401);
  const now = Math.floor(Date.now() / 1000);
  const pending = await env.DB.prepare(
    `SELECT player_uuid FROM market_login_nonces WHERE nonce = ? AND used_at = 0 AND expires_at > ?`,
  ).bind(code, now).first<{ player_uuid: string }>();
  if (!pending || !/^[0-9a-f-]{36}$/.test(pending.player_uuid)) return json({ error: "expired_or_invalid" }, 401);
  const claimed = await env.DB.prepare(
    `UPDATE market_login_nonces SET used_at = ? WHERE nonce = ? AND used_at = 0 AND expires_at > ?`,
  ).bind(now, code, now).run();
  if ((claimed.meta.changes ?? 0) !== 1) return json({ error: "expired_or_invalid" }, 401);
  const player = await env.DB.prepare(
    `SELECT player_name FROM market_players WHERE player_uuid = ?`,
  ).bind(pending.player_uuid).first<{ player_name: string }>();
  if (!player || !/^[A-Za-z0-9_]{1,16}$/.test(player.player_name)) return json({ error: "player_not_ready" }, 409);
  const sessionId = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const expiresAt = now + 43_200;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM market_sessions WHERE expires_at <= ?").bind(now),
    env.DB.prepare("DELETE FROM market_login_nonces WHERE expires_at <= ?").bind(now),
  ]);
  await env.DB.prepare(
    `INSERT INTO market_sessions (id, player_uuid, player_name, ip, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(sessionId, pending.player_uuid, player.player_name, clientIp(request), expiresAt, now).run();
  return json({ ok: true, playerName: player.player_name }, 200, {
    "set-cookie": `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Lax`,
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
    `SELECT symbol, name, market, currency, type, unit, price_won, change_percent, candles, updated_at
       FROM market_instruments ORDER BY type, symbol LIMIT 500`,
  ).all<{ symbol: string; name: string; market: string; currency: string; type: string; unit: string;
    price_won: number; change_percent: number; candles: string; updated_at: number }>();
  const commands = await env.DB.prepare(
    `SELECT id, action, symbol, quantity, status, message, created_at
       FROM market_commands WHERE player_uuid = ? ORDER BY created_at DESC LIMIT 12`,
  ).bind(session.player_uuid).all();
  return json({
    authenticated: true,
    player: player ? { ...player, online: Boolean(player.online), positions: JSON.parse(player.positions), accounts: JSON.parse(player.accounts) }
      : { player_name: session.player_name, cash_won: 0, online: false, positions: [], accounts: [], updated_at: 0 },
    instruments: instruments.results.map((instrument) => ({
      ...instrument,
      candles: JSON.parse(instrument.candles),
    })),
    commands: commands.results,
  });
}

function jsonArray(value: string): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  } catch {
    return [];
  }
}

function publicPosition(item: Record<string, unknown>): PublicPosition | null {
  const symbol = String(item.symbol ?? "").toUpperCase();
  const quantity = String(item.quantity ?? "0");
  const valueWon = Number(item.valueWon ?? 0);
  const profitWon = Number(item.profitWon ?? 0);
  if (!/^[A-Z0-9.^=-]{1,32}$/.test(symbol) || !/^[0-9]+(?:\.[0-9]{1,4})?$/.test(quantity) ||
      !Number.isFinite(valueWon) || valueWon < 0 || !Number.isFinite(profitWon)) return null;
  return {
    symbol,
    name: String(item.name ?? symbol).slice(0, 160),
    type: String(item.type ?? "EQUITY").slice(0, 32),
    unit: String(item.unit ?? "").slice(0, 12),
    quantity,
    valueWon,
    profitWon,
  };
}

function publicAccount(item: Record<string, unknown>): PublicAccount | null {
  const principalWon = Number(item.principalWon ?? 0);
  const rate = Number(item.rate ?? 0);
  const maturityAt = Number(item.maturityAt ?? 0);
  if (!Number.isFinite(principalWon) || principalWon < 0 || !Number.isFinite(rate) || rate < 0 ||
      !Number.isFinite(maturityAt) || maturityAt < 0) return null;
  return {
    name: String(item.name ?? "예금 · 적금").slice(0, 60),
    type: String(item.type ?? "DEPOSIT").slice(0, 16),
    principalWon,
    rate,
    maturityAt,
  };
}

function publicProfile(row: MarketPlayerRow, viewerName: string) {
  const positions = jsonArray(row.positions).map(publicPosition).filter((item): item is PublicPosition => item !== null);
  const accounts = jsonArray(row.accounts).map(publicAccount).filter((item): item is PublicAccount => item !== null);
  const portfolioWon = positions.reduce((sum, item) => sum + item.valueWon, 0);
  const profitWon = positions.reduce((sum, item) => sum + item.profitWon, 0);
  const bankWon = accounts.reduce((sum, item) => sum + item.principalWon, 0);
  return {
    playerName: row.player_name,
    online: Boolean(row.online),
    mine: row.player_name === viewerName,
    totalAssetWon: Math.max(0, Number(row.cash_won) || 0) + portfolioWon + bankWon,
    cashWon: Math.max(0, Number(row.cash_won) || 0),
    portfolioWon,
    bankWon,
    profitWon,
    positionCount: positions.length,
    accountCount: accounts.length,
    updatedAt: row.updated_at,
    positions,
    accounts,
  };
}

async function marketRankings(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  const session = await authenticatedSession(request, env);
  if (!session) return json({ error: "unauthorized" }, 401);
  const players = await env.DB.prepare(
    `SELECT player_name, cash_won, online, positions, accounts, updated_at
       FROM market_players ORDER BY updated_at DESC LIMIT 500`,
  ).all<MarketPlayerRow>();
  const profiles = players.results
    .filter((row) => /^[A-Za-z0-9_]{1,16}$/.test(row.player_name))
    .map((row) => publicProfile(row, session.player_name))
    .sort((left, right) => right.totalAssetWon - left.totalAssetWon || left.playerName.localeCompare(right.playerName, "en"))
    .map((profile, index) => ({ ...profile, rank: index + 1 }));
  const requested = new URL(request.url).searchParams.get("player");
  if (requested !== null) {
    if (!/^[A-Za-z0-9_]{1,16}$/.test(requested)) return json({ error: "invalid_player" }, 400);
    const profile = profiles.find((item) => item.playerName.toLowerCase() === requested.toLowerCase());
    return profile ? json({ profile }) : json({ error: "not_found" }, 404);
  }
  return json({
    rankings: profiles.map((profile) => ({
      rank: profile.rank,
      playerName: profile.playerName,
      online: profile.online,
      mine: profile.mine,
      totalAssetWon: profile.totalAssetWon,
      cashWon: profile.cashWon,
      portfolioWon: profile.portfolioWon,
      bankWon: profile.bankWon,
      profitWon: profile.profitWon,
      positionCount: profile.positionCount,
      accountCount: profile.accountCount,
      updatedAt: profile.updatedAt,
    })),
    updatedAt: profiles.reduce((latest, item) => Math.max(latest, item.updatedAt), 0),
  });
}

async function marketCandles(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  if (!(await authenticatedSession(request, env))) return json({ authenticated: false }, 401);
  const symbol = new URL(request.url).searchParams.get("symbol")?.toUpperCase() ?? "";
  if (!/^[A-Z0-9.^=-]{1,32}$/.test(symbol)) return json({ error: "invalid_symbol" }, 400);
  const instrument = await env.DB.prepare(
    "SELECT price_won FROM market_instruments WHERE symbol = ?",
  ).bind(symbol).first<{ price_won: number }>();
  if (!instrument) return json({ error: "not_found" }, 404);

  const upstream = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`,
    { headers: { "user-agent": "Mozilla/5.0 TaekbyeongSecurities/1.0" } },
  );
  if (!upstream.ok) return json({ error: "quote_unavailable" }, 502);
  let result: YahooChartResult | undefined;
  try {
    const payload = await upstream.json() as { chart?: { result?: YahooChartResult[] | null } };
    result = payload.chart?.result?.[0];
  } catch {
    return json({ error: "quote_unavailable" }, 502);
  }
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const opens = quote?.open ?? [];
  const highs = quote?.high ?? [];
  const lows = quote?.low ?? [];
  const closes = quote?.close ?? [];
  const volumes = quote?.volume ?? [];
  const size = Math.min(timestamps.length, opens.length, highs.length, lows.length, closes.length);
  const latestRaw = Number(result?.meta?.regularMarketPrice) || [...closes].reverse().find((value) => Number(value) > 0) || 0;
  const scale = latestRaw > 0 && instrument.price_won > 0 ? instrument.price_won / latestRaw : 1;
  const candles = [];
  for (let index = Math.max(0, size - 240); index < size; index += 1) {
    const time = Number(timestamps[index]);
    const open = Number(opens[index]);
    const high = Number(highs[index]);
    const low = Number(lows[index]);
    const close = Number(closes[index]);
    const volume = Math.max(0, Number(volumes[index]) || 0);
    if (!Number.isInteger(time) || ![open, high, low, close].every(Number.isFinite) ||
        open <= 0 || high <= 0 || low <= 0 || close <= 0 ||
        low > Math.min(open, close) || high < Math.max(open, close)) continue;
    candles.push({ time, open: open * scale, high: high * scale, low: low * scale, close: close * scale, volume });
  }
  return json({ symbol, candles });
}

type NasdaqOptionRow = {
  expirygroup?: string | null; strike?: string | null;
  c_Last?: string | null; c_Bid?: string | null; c_Ask?: string | null;
  c_Volume?: string | null; c_Openinterest?: string | null;
  p_Last?: string | null; p_Bid?: string | null; p_Ask?: string | null;
  p_Volume?: string | null; p_Openinterest?: string | null;
};

function optionNumber(value: string | null | undefined): number | null {
  if (!value || value === "--") return null;
  const parsed = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

async function marketOptions(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  if (!(await authenticatedSession(request, env))) return json({ authenticated: false }, 401);
  const symbol = new URL(request.url).searchParams.get("symbol")?.toUpperCase() ?? "";
  if (!/^[A-Z]{1,6}(?:-[A-Z])?$/.test(symbol)) return json({ error: "invalid_symbol" }, 400);
  const instrument = await env.DB.prepare(
    "SELECT name, market, type FROM market_instruments WHERE symbol = ?",
  ).bind(symbol).first<{ name: string; market: string; type: string }>();
  if (!instrument || instrument.market !== "US" || !["EQUITY", "ETF", "LEVERAGED_ETF"].includes(instrument.type)) {
    return json({ error: "unsupported_underlying" }, 404);
  }
  const fromDate = new Date();
  const toDate = new Date(fromDate.getTime() + 370 * 24 * 60 * 60 * 1000);
  const upstreamUrl = new URL(`https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/option-chain`);
  upstreamUrl.searchParams.set("assetclass", instrument.type === "EQUITY" ? "stocks" : "etf");
  upstreamUrl.searchParams.set("limit", "5000");
  upstreamUrl.searchParams.set("money", "all");
  upstreamUrl.searchParams.set("fromdate", fromDate.toISOString().slice(0, 10));
  upstreamUrl.searchParams.set("todate", toDate.toISOString().slice(0, 10));
  const upstream = await fetch(upstreamUrl, {
    headers: { "user-agent": "Mozilla/5.0", accept: "application/json, text/plain, */*" },
  });
  if (!upstream.ok) return json({ error: "option_chain_unavailable" }, 502);
  let data: { table?: { rows?: NasdaqOptionRow[] }; lastTrade?: string } | undefined;
  try {
    const payload = await upstream.json() as { data?: typeof data };
    data = payload.data;
  } catch {
    return json({ error: "option_chain_unavailable" }, 502);
  }
  let expiry = "";
  const contracts = [];
  for (const row of data?.table?.rows ?? []) {
    if (row.expirygroup) {
      const parsed = new Date(`${row.expirygroup} 12:00:00 UTC`);
      expiry = Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
      continue;
    }
    const strike = optionNumber(row.strike);
    if (!expiry || strike === null || strike <= 0) continue;
    contracts.push({
      expiry, strike,
      call: { last: optionNumber(row.c_Last), bid: optionNumber(row.c_Bid), ask: optionNumber(row.c_Ask),
        volume: optionNumber(row.c_Volume), openInterest: optionNumber(row.c_Openinterest) },
      put: { last: optionNumber(row.p_Last), bid: optionNumber(row.p_Bid), ask: optionNumber(row.p_Ask),
        volume: optionNumber(row.p_Volume), openInterest: optionNumber(row.p_Openinterest) },
    });
  }
  contracts.sort((a, b) => a.expiry.localeCompare(b.expiry) || a.strike - b.strike);
  const underlyingPrice = optionNumber(data?.lastTrade?.match(/\$[\d,.]+/)?.[0]);
  return json({ symbol, name: instrument.name, lastTrade: data?.lastTrade ?? "", underlyingPrice, contracts });
}

async function marketCommunity(request: Request, env: Env): Promise<Response> {
  const session = await authenticatedSession(request, env);
  if (!session) return json({ error: "unauthorized" }, 401);
  const url = new URL(request.url);
  if (request.method === "GET") {
    const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
    if (!/^[A-Z0-9.^=-]{1,32}$/.test(symbol)) return json({ error: "invalid_symbol" }, 400);
    const posts = await env.DB.prepare(
      `SELECT p.id, p.player_name AS playerName, p.symbol, p.body, p.stance,
        p.holder_verified AS holderVerified, p.created_at AS createdAt,
        COUNT(r.player_uuid) AS reactionCount,
        MAX(CASE WHEN r.player_uuid = ? THEN 1 ELSE 0 END) AS reacted,
        CASE WHEN p.player_uuid = ? THEN 1 ELSE 0 END AS mine
       FROM market_community_posts p
       LEFT JOIN market_community_reactions r ON r.post_id = p.id
       WHERE p.symbol = ?
       GROUP BY p.id ORDER BY p.created_at DESC LIMIT 60`,
    ).bind(session.player_uuid, session.player_uuid, symbol).all<Record<string, unknown>>();
    return json({ symbol, posts: posts.results });
  }
  if (!sameOrigin(request)) return json({ error: "invalid_origin" }, 403);
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return json({ error: "invalid_json" }, 400); }
  if (request.method === "POST") {
    const symbol = String(body.symbol ?? "").toUpperCase().trim();
    const content = String(body.body ?? "").replace(/\s+/g, " ").trim();
    const stance = String(body.stance ?? "watching").toLowerCase();
    if (!/^[A-Z0-9.^=-]{1,32}$/.test(symbol) || content.length < 2 || content.length > 280 ||
        !["watching", "holding", "positive", "cautious"].includes(stance)) {
      return json({ error: "invalid_post", message: "종목과 글 내용을 확인해 주세요." }, 400);
    }
    const instrument = await env.DB.prepare("SELECT symbol FROM market_instruments WHERE symbol = ?").bind(symbol).first();
    if (!instrument) return json({ error: "unknown_symbol", message: "등록된 종목만 이야기할 수 있습니다." }, 404);
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM market_community_posts WHERE player_uuid = ? AND created_at > ?",
    ).bind(session.player_uuid, Date.now() - 300_000).first<{ count: number }>();
    if ((recent?.count ?? 0) >= 5) return json({ error: "rate_limited", message: "잠시 뒤 다시 작성해 주세요." }, 429);
    const player = await env.DB.prepare(
      "SELECT positions FROM market_players WHERE player_uuid = ?",
    ).bind(session.player_uuid).first<{ positions: string }>();
    let holderVerified = 0;
    try {
      const positions = JSON.parse(player?.positions ?? "[]") as Array<{ symbol?: unknown; quantity?: unknown }>;
      holderVerified = positions.some((position) => String(position.symbol ?? "") === symbol && Number(position.quantity ?? 0) > 0) ? 1 : 0;
    } catch { holderVerified = 0; }
    const id = crypto.randomUUID();
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO market_community_posts (id, player_uuid, player_name, symbol, body, stance, holder_verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, session.player_uuid, session.player_name, symbol, content, stance, holderVerified, now).run();
    return json({ ok: true, id, message: "의견을 올렸습니다." }, 201);
  }
  if (request.method === "DELETE") {
    const id = String(body.id ?? "");
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "invalid_post" }, 400);
    const deleted = await env.DB.prepare(
      "DELETE FROM market_community_posts WHERE id = ? AND player_uuid = ?",
    ).bind(id, session.player_uuid).run();
    if ((deleted.meta.changes ?? 0) !== 1) return json({ error: "not_found" }, 404);
    await env.DB.prepare("DELETE FROM market_community_reactions WHERE post_id = ?").bind(id).run();
    return json({ ok: true });
  }
  return json({ error: "method_not_allowed" }, 405);
}

async function marketCommunityReact(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!sameOrigin(request)) return json({ error: "invalid_origin" }, 403);
  const session = await authenticatedSession(request, env);
  if (!session) return json({ error: "unauthorized" }, 401);
  let id = "";
  try { id = String((await request.json() as { id?: unknown }).id ?? ""); } catch { return json({ error: "invalid_json" }, 400); }
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "invalid_post" }, 400);
  const post = await env.DB.prepare("SELECT id FROM market_community_posts WHERE id = ?").bind(id).first();
  if (!post) return json({ error: "not_found" }, 404);
  const existing = await env.DB.prepare(
    "SELECT post_id FROM market_community_reactions WHERE post_id = ? AND player_uuid = ?",
  ).bind(id, session.player_uuid).first();
  if (existing) {
    await env.DB.prepare("DELETE FROM market_community_reactions WHERE post_id = ? AND player_uuid = ?").bind(id, session.player_uuid).run();
    return json({ ok: true, reacted: false });
  }
  await env.DB.prepare(
    "INSERT INTO market_community_reactions (post_id, player_uuid, created_at) VALUES (?, ?, ?)",
  ).bind(id, session.player_uuid, Date.now()).run();
  return json({ ok: true, reacted: true });
}

async function bridgeAuthorized(request: Request): Promise<boolean> {
  const timestamp = request.headers.get("x-tbe-timestamp") ?? "";
  const signature = request.headers.get("x-tbe-signature") ?? "";
  if (!/^\d{10}$/.test(timestamp) || Math.abs(Number(timestamp) - Math.floor(Date.now() / 1000)) > 45) return false;
  const payload = request.method === "POST" ? await request.clone().text() : "bridge";
  return verifySignature(`${timestamp}\n${payload}`, signature);
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
    void onMessage(data, server).catch(() => server.close(1011, "message processing failed"));
  });
  return new Response(null, { status: 101, webSocket: client });
}

async function handleBridgeMessage(raw: unknown, env: Env): Promise<Record<string, unknown>> {
  const message = raw as Record<string, unknown>;
    if (message.type === "sync") {
      const now = Date.now();
      const instruments = Array.isArray(message.instruments) ? message.instruments.slice(0, 1000) : [];
      const players = Array.isArray(message.players) ? message.players.slice(0, 100) : [];
      const statements: D1PreparedStatement[] = [];
      for (const rawItem of instruments) {
        const item = rawItem as Record<string, unknown>;
        const price = Number(item.priceWon ?? 0);
        const change = Number(item.changePercent ?? 0);
        const market = String(item.market ?? "");
        const currency = String(item.currency ?? "");
        const type = String(item.type ?? "");
        const unit = String(item.unit ?? "");
        const sourceUpdatedAt = Number(item.updatedAt ?? now);
        const rawCandles = Array.isArray(item.candles) ? item.candles.slice(-240) : [];
        const candles = rawCandles.flatMap((rawCandle) => {
          const candle = rawCandle as Record<string, unknown>;
          const time = Number(candle.time ?? 0);
          const open = Number(candle.open ?? 0);
          const high = Number(candle.high ?? 0);
          const low = Number(candle.low ?? 0);
          const close = Number(candle.close ?? 0);
          const volume = Number(candle.volume ?? 0);
          if (!Number.isInteger(time) || time < 946684800 || time > Math.floor(Date.now() / 1000) + 86_400 ||
              ![open, high, low, close, volume].every(Number.isFinite) ||
              open <= 0 || high <= 0 || low <= 0 || close <= 0 || volume < 0 ||
              low > Math.min(open, close) || high < Math.max(open, close)) return [];
          return [{ time, open, high, low, close, volume }];
        });
        if (!/^[A-Z0-9.^=-]{1,32}$/.test(String(item.symbol ?? "")) || !Number.isFinite(price) || price < 0 ||
            !Number.isFinite(change) || Math.abs(change) > 10000 || !/^[A-Z]{2,8}$/.test(market) ||
            !/^[A-Z]{3}$/.test(currency) || !/^[A-Z_]{3,32}$/.test(type) || unit.length < 1 || unit.length > 12 ||
            !Number.isFinite(sourceUpdatedAt) || sourceUpdatedAt < 0) continue;
        statements.push(env.DB.prepare(
          `INSERT INTO market_instruments (symbol, name, market, currency, type, unit, price_won, change_percent, candles, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(symbol) DO UPDATE SET name=excluded.name, market=excluded.market, currency=excluded.currency,
             type=excluded.type, unit=excluded.unit, price_won=excluded.price_won,
             change_percent=excluded.change_percent, candles=excluded.candles, updated_at=excluded.updated_at`,
        ).bind(item.symbol, String(item.name ?? "").slice(0, 160), market, currency, type, unit, price, change,
          JSON.stringify(candles), Math.trunc(sourceUpdatedAt)));
      }
      for (const rawPlayer of players) {
        const player = rawPlayer as Record<string, unknown>;
        if (!/^[0-9a-f-]{36}$/.test(String(player.uuid ?? ""))) continue;
        const cash = Number(player.cashWon ?? 0);
        const positions = Array.isArray(player.positions) ? player.positions.slice(0, 500) : [];
        const accounts = Array.isArray(player.accounts) ? player.accounts.slice(0, 100) : [];
        if (!Number.isFinite(cash) || cash < 0) continue;
        statements.push(env.DB.prepare(
          `INSERT INTO market_players (player_uuid, player_name, cash_won, online, positions, accounts, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(player_uuid) DO UPDATE SET player_name=excluded.player_name, cash_won=excluded.cash_won,
             online=excluded.online, positions=excluded.positions, accounts=excluded.accounts, updated_at=excluded.updated_at`,
        ).bind(player.uuid, String(player.name ?? "").slice(0, 16), cash, player.online ? 1 : 0,
          JSON.stringify(positions), JSON.stringify(accounts), now));
      }
      await batch(env, statements);
      return { type: "sync-ok", updatedAt: now };
    } else if (message.type === "poll") {
      const retryBefore = Date.now() - 10_000;
      const pending = await env.DB.prepare(
        `SELECT id, player_uuid AS playerUuid, action, symbol, quantity FROM market_commands
          WHERE status = 'pending' OR (status = 'dispatched' AND updated_at <= ?)
          ORDER BY created_at ASC LIMIT 25`,
      ).bind(retryBefore).all<{ id: string; playerUuid: string; action: string; symbol: string; quantity: string }>();
      if (pending.results.length) {
        const now = Date.now();
        await batch(env, pending.results.map((command) => env.DB.prepare(
          `UPDATE market_commands SET status = 'dispatched', updated_at = ?
            WHERE id = ? AND (status = 'pending' OR (status = 'dispatched' AND updated_at <= ?))`,
        ).bind(now, command.id, retryBefore)));
      }
      return { type: "commands", items: pending.results };
    } else if (message.type === "device-login") {
      const code = String(message.code ?? "").toUpperCase();
      const playerUuid = String(message.playerUuid ?? "");
      const playerName = String(message.playerName ?? "");
      const expiresAt = Number(message.expiresAt ?? 0);
      const now = Math.floor(Date.now() / 1000);
      if (!/^[A-Z2-9]{8}$/.test(code) || !/^[0-9a-f-]{36}$/.test(playerUuid) ||
          !/^[A-Za-z0-9_]{1,16}$/.test(playerName) || !Number.isInteger(expiresAt) ||
          expiresAt <= now || expiresAt > now + 600) return { type: "ignored" };
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO market_players (player_uuid, player_name, cash_won, online, positions, accounts, updated_at)
           VALUES (?, ?, 0, 1, '[]', '[]', ?)
           ON CONFLICT(player_uuid) DO UPDATE SET player_name=excluded.player_name, online=1`,
        ).bind(playerUuid, playerName, Date.now()),
        env.DB.prepare(
          `INSERT INTO market_login_nonces (nonce, player_uuid, expires_at, used_at)
           VALUES (?, ?, ?, 0) ON CONFLICT(nonce) DO NOTHING`,
        ).bind(code, playerUuid, expiresAt),
        env.DB.prepare("DELETE FROM market_login_nonces WHERE expires_at <= ?").bind(now),
      ]);
      return { type: "device-login-ok", code };
    } else if (message.type === "result") {
      const id = String(message.id ?? "");
      const status = String(message.status ?? "rejected");
      if (/^[0-9a-f-]{36}$/.test(id) && ["accepted", "rejected", "offline"].includes(status)) {
        await env.DB.prepare(
          `UPDATE market_commands SET status = ?, message = ?, updated_at = ? WHERE id = ?`,
        ).bind(status, String(message.message ?? "").slice(0, 300), Date.now(), id).run();
      }
      return { type: "result-ok" };
    }
  return { type: "ignored" };
}

async function bridgeSocket(request: Request, env: Env): Promise<Response> {
  if (!(await bridgeAuthorized(request))) return json({ error: "unauthorized" }, 401);
  if (request.method === "POST") {
    let message: unknown;
    try { message = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
    return json(await handleBridgeMessage(message, env));
  }
  return acceptSocket(request, async (raw, socket) => {
    socket.send(JSON.stringify(await handleBridgeMessage(raw, env)));
  });
}

function validOrder(action: string, symbol: string, quantity: string): boolean {
  if (!["buy", "sell", "search", "option", "bank_savings", "bank_deposit", "bank_cancel"].includes(action) ||
      !/^[A-Z0-9.^=-]{1,32}$/.test(symbol)) return false;
  if (action === "buy" || action === "sell") {
    if (quantity === "all") return action === "sell";
    return /^[0-9]+(?:\.[0-9]{1,4})?$/.test(quantity) && Number(quantity) > 0;
  }
  if (action === "search") return quantity === "";
  if (action === "option") return /^\d{4}-\d{2}-\d{2}\|[0-9]+(?:\.[0-9]{1,3})?\|(call|put)$/.test(quantity);
  if (action === "bank_savings") return /^(?:7d|30d)$/.test(symbol.toLowerCase()) && /^[0-9]{4,8}$/.test(quantity);
  if (action === "bank_deposit") return /^(?:30d|90d)$/.test(symbol.toLowerCase()) && /^[0-9]{4,8}$/.test(quantity);
  return /^[a-f0-9]{8}$/i.test(symbol) && quantity === "";
}

async function marketOrder(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!sameOrigin(request)) return json({ error: "invalid_origin" }, 403);
  const session = await authenticatedSession(request, env);
  if (!session) return json({ error: "unauthorized" }, 401);
  let message: Record<string, unknown>;
  try { message = await request.json() as Record<string, unknown>; } catch { return json({ error: "invalid_json" }, 400); }
  const action = String(message.action ?? "").toLowerCase();
  const symbol = String(message.symbol ?? "").toUpperCase().trim();
  const quantity = String(message.quantity ?? "").toLowerCase().trim();
  if (!validOrder(action, symbol, quantity)) {
    return json({ error: "invalid_order", message: "주문 형식을 확인하세요." }, 400);
  }
  const rate = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN status IN ('pending', 'dispatched') THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END) AS recent
     FROM market_commands WHERE session_id = ?`,
  ).bind(Date.now() - 10_000, session.id).first<{ active: number | null; recent: number | null }>();
  if ((rate?.active ?? 0) >= 5 || (rate?.recent ?? 0) >= 12) {
    return json({ error: "rate_limited", message: "주문 처리 중입니다. 잠시 후 다시 시도하세요." }, 429);
  }
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO market_commands (id, session_id, player_uuid, action, symbol, quantity, status, message, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', '게임 서버 전달 대기', ?, ?)`,
  ).bind(id, session.id, session.player_uuid, action, symbol, quantity, now, now).run();
  return json({ type: "trade-queued", id, message: "주문을 게임 서버에 전달했습니다." }, 202);
}

async function browserSocket(request: Request, env: Env): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: "invalid_origin" }, 403);
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
    if (!validOrder(action, symbol, quantity)) {
      socket.send(JSON.stringify({ type: "trade-error", message: "주문 형식을 확인하세요." }));
      return;
    }
    const rate = await env.DB.prepare(
      `SELECT
         SUM(CASE WHEN status IN ('pending', 'dispatched') THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END) AS recent
       FROM market_commands WHERE session_id = ?`,
    ).bind(Date.now() - 10_000, session.id).first<{ active: number | null; recent: number | null }>();
    if ((rate?.active ?? 0) >= 5 || (rate?.recent ?? 0) >= 12) {
      socket.send(JSON.stringify({ type: "trade-error", message: "주문 처리 중입니다. 잠시 후 다시 시도하세요." }));
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
    if (url.pathname === "/api/market/logo") return marketLogo(request);
    if (url.pathname === "/api/market/login") return marketLogin(request, env);
    if (url.pathname === "/api/market/snapshot") return marketSnapshot(request, env);
    if (url.pathname === "/api/market/rankings") return marketRankings(request, env);
    if (url.pathname === "/api/market/candles") return marketCandles(request, env);
    if (url.pathname === "/api/market/options") return marketOptions(request, env);
    if (url.pathname === "/api/market/community") return marketCommunity(request, env);
    if (url.pathname === "/api/market/community/react") return marketCommunityReact(request, env);
    if (url.pathname === "/api/market/order") return marketOrder(request, env);
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
