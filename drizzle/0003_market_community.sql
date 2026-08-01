CREATE TABLE `market_community_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`player_uuid` text NOT NULL,
	`player_name` text NOT NULL,
	`symbol` text NOT NULL,
	`body` text NOT NULL,
	`stance` text NOT NULL,
	`holder_verified` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `market_community_symbol_idx` ON `market_community_posts` (`symbol`,`created_at`);
--> statement-breakpoint
CREATE INDEX `market_community_player_idx` ON `market_community_posts` (`player_uuid`,`created_at`);
--> statement-breakpoint
CREATE TABLE `market_community_reactions` (
	`post_id` text NOT NULL,
	`player_uuid` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`post_id`, `player_uuid`)
);
--> statement-breakpoint
CREATE INDEX `market_community_reaction_post_idx` ON `market_community_reactions` (`post_id`);
--> statement-breakpoint
CREATE INDEX `market_community_reaction_player_idx` ON `market_community_reactions` (`player_uuid`);
