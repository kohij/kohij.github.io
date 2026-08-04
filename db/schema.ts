import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const patchNotes = sqliteTable("patch_notes", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  changes: text("changes").notNull(),
  reason: text("reason").notNull().default(""),
  evidence: text("evidence").notNull().default("[]"),
  position: integer("position").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const clientTelemetry = sqliteTable("client_telemetry", {
  id: text("id").primaryKey(),
  receivedAt: integer("received_at").notNull(),
  sessionId: text("session_id").notNull(),
  sampleSeconds: real("sample_seconds").notNull(),
  frameCount: integer("frame_count").notNull(),
  fpsAverage: real("fps_average").notNull(),
  frameP50Ms: real("frame_p50_ms").notNull(),
  frameP95Ms: real("frame_p95_ms").notNull(),
  frameP99Ms: real("frame_p99_ms").notNull(),
  frameMaxMs: real("frame_max_ms").notNull(),
  stutterFrames: integer("stutter_frames").notNull(),
  freezeFrames: integer("freeze_frames").notNull(),
  pingSamples: integer("ping_samples").notNull(),
  pingAverageMs: real("ping_average_ms").notNull(),
  pingP95Ms: real("ping_p95_ms").notNull(),
  pingMaxMs: real("ping_max_ms").notNull(),
  pingMissingSamples: integer("ping_missing_samples").notNull().default(0),
  clientTickP95Ms: real("client_tick_p95_ms").notNull().default(0),
  clientTickMaxMs: real("client_tick_max_ms").notNull().default(0),
  internetSamples: integer("internet_samples").notNull().default(0),
  internetAverageMs: real("internet_average_ms").notNull().default(0),
  internetP95Ms: real("internet_p95_ms").notNull().default(0),
  internetMaxMs: real("internet_max_ms").notNull().default(0),
  internetFailures: integer("internet_failures").notNull().default(0),
  heapUsedRatio: real("heap_used_ratio").notNull(),
  gcPauseMs: integer("gc_pause_ms").notNull(),
  processCpuRatio: real("process_cpu_ratio").notNull().default(0),
  systemCpuRatio: real("system_cpu_ratio").notNull().default(0),
  screenWidth: integer("screen_width").notNull().default(0),
  screenHeight: integer("screen_height").notNull().default(0),
  renderDistance: integer("render_distance").notNull().default(0),
  simulationDistance: integer("simulation_distance").notNull().default(0),
  maxFps: integer("max_fps").notNull().default(0),
  allocatedMemoryMb: integer("allocated_memory_mb").notNull().default(0),
  os: text("os").notNull(),
  arch: text("arch").notNull(),
  packRelease: text("pack_release").notNull(),
  clientModVersion: text("client_mod_version").notNull(),
  ic2Version: text("ic2_version").notNull(),
  causeHint: text("cause_hint").notNull().default("unknown"),
  networkHash: text("network_hash").notNull().default(""),
  sampleBucket: integer("sample_bucket").notNull().default(0),
}, (table) => [
  index("client_telemetry_received_idx").on(table.receivedAt),
  index("client_telemetry_session_received_idx").on(table.sessionId, table.receivedAt),
  index("client_telemetry_cause_received_idx").on(table.causeHint, table.receivedAt),
  index("client_telemetry_network_received_idx").on(table.networkHash, table.receivedAt),
  index("client_telemetry_bucket_cause_idx").on(table.sampleBucket, table.causeHint),
]);

export const hostTelemetry = sqliteTable("host_telemetry", {
  id: text("id").primaryKey(),
  receivedAt: integer("received_at").notNull(),
  sampleBucket: integer("sample_bucket").notNull(),
  proxyOk: integer("proxy_ok").notNull(),
  backendOk: integer("backend_ok").notNull(),
  publicStatusOk: integer("public_status_ok").notNull(),
  externalOk: integer("external_ok").notNull(),
  proxyTcpMs: real("proxy_tcp_ms").notNull(),
  backendTcpMs: real("backend_tcp_ms").notNull(),
  publicStatusMs: real("public_status_ms").notNull(),
  externalRttMs: real("external_rtt_ms").notNull(),
  serverCpuRatio: real("server_cpu_ratio").notNull(),
  hostCpuRatio: real("host_cpu_ratio").notNull(),
  serverRssMb: real("server_rss_mb").notNull(),
  loadPerCore: real("load_per_core").notNull(),
  freeDiskGb: real("free_disk_gb").notNull(),
  tps5: real("tps_5").notNull(),
  tps1m: real("tps_1m").notNull(),
  tpsAgeSeconds: integer("tps_age_seconds").notNull(),
}, (table) => [
  index("host_telemetry_received_idx").on(table.receivedAt),
  index("host_telemetry_bucket_idx").on(table.sampleBucket),
]);

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

export const marketCommunityPosts = sqliteTable("market_community_posts", {
  id: text("id").primaryKey(),
  playerUuid: text("player_uuid").notNull(),
  playerName: text("player_name").notNull(),
  symbol: text("symbol").notNull(),
  body: text("body").notNull(),
  stance: text("stance").notNull(),
  holderVerified: integer("holder_verified").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("market_community_created_idx").on(table.createdAt),
  index("market_community_symbol_idx").on(table.symbol, table.createdAt),
  index("market_community_player_idx").on(table.playerUuid, table.createdAt),
]);

export const marketCommunityReactions = sqliteTable("market_community_reactions", {
  postId: text("post_id").notNull(),
  playerUuid: text("player_uuid").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.postId, table.playerUuid] }),
  index("market_community_reaction_post_idx").on(table.postId),
  index("market_community_reaction_player_idx").on(table.playerUuid),
]);
