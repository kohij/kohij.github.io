import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const patchNotes = sqliteTable("patch_notes", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  changes: text("changes").notNull(),
  position: integer("position").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const marketLoginNonces = sqliteTable("market_login_nonces", {
  nonce: text("nonce").primaryKey(),
  playerUuid: text("player_uuid").notNull(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at").notNull(),
});

export const marketSessions = sqliteTable("market_sessions", {
  id: text("id").primaryKey(),
  playerUuid: text("player_uuid").notNull(),
  playerName: text("player_name").notNull(),
  ip: text("ip").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("market_sessions_player_idx").on(table.playerUuid, table.expiresAt),
]);

export const marketPlayers = sqliteTable("market_players", {
  playerUuid: text("player_uuid").primaryKey(),
  playerName: text("player_name").notNull(),
  cashWon: real("cash_won").notNull(),
  online: integer("online").notNull(),
  positions: text("positions").notNull(),
  accounts: text("accounts").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const marketInstruments = sqliteTable("market_instruments", {
  symbol: text("symbol").primaryKey(),
  name: text("name").notNull(),
  market: text("market").notNull(),
  currency: text("currency").notNull(),
  type: text("type").notNull(),
  unit: text("unit").notNull(),
  priceWon: real("price_won").notNull(),
  changePercent: real("change_percent").notNull(),
  candles: text("candles").notNull().default("[]"),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("market_instruments_name_idx").on(table.name),
]);

export const marketCommands = sqliteTable("market_commands", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  playerUuid: text("player_uuid").notNull(),
  action: text("action").notNull(),
  symbol: text("symbol").notNull(),
  quantity: text("quantity").notNull(),
  status: text("status").notNull(),
  message: text("message").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("market_commands_pending_idx").on(table.status, table.createdAt),
  index("market_commands_player_idx").on(table.playerUuid, table.createdAt),
]);
