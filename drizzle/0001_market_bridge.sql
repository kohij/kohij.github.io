CREATE TABLE `market_login_nonces` (
	`nonce` text PRIMARY KEY NOT NULL,
	`player_uuid` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer NOT NULL
);
CREATE TABLE `market_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`player_uuid` text NOT NULL,
	`player_name` text NOT NULL,
	`ip` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
CREATE INDEX `market_sessions_player_idx` ON `market_sessions` (`player_uuid`, `expires_at`);
CREATE TABLE `market_players` (
	`player_uuid` text PRIMARY KEY NOT NULL,
	`player_name` text NOT NULL,
	`cash_won` real NOT NULL,
	`online` integer NOT NULL,
	`positions` text NOT NULL,
	`accounts` text NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE TABLE `market_instruments` (
	`symbol` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`market` text NOT NULL,
	`currency` text NOT NULL,
	`type` text NOT NULL,
	`unit` text NOT NULL,
	`price_won` real NOT NULL,
	`change_percent` real NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE INDEX `market_instruments_name_idx` ON `market_instruments` (`name`);
CREATE TABLE `market_commands` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`player_uuid` text NOT NULL,
	`action` text NOT NULL,
	`symbol` text NOT NULL,
	`quantity` text NOT NULL,
	`status` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE INDEX `market_commands_pending_idx` ON `market_commands` (`status`, `created_at`);
CREATE INDEX `market_commands_player_idx` ON `market_commands` (`player_uuid`, `created_at`);
