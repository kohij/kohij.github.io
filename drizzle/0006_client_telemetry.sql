CREATE TABLE `client_telemetry` (
	`id` text PRIMARY KEY NOT NULL,
	`received_at` integer NOT NULL,
	`session_id` text NOT NULL,
	`sample_seconds` real NOT NULL,
	`frame_count` integer NOT NULL,
	`fps_average` real NOT NULL,
	`frame_p50_ms` real NOT NULL,
	`frame_p95_ms` real NOT NULL,
	`frame_p99_ms` real NOT NULL,
	`frame_max_ms` real NOT NULL,
	`stutter_frames` integer NOT NULL,
	`freeze_frames` integer NOT NULL,
	`ping_samples` integer NOT NULL,
	`ping_average_ms` real NOT NULL,
	`ping_p95_ms` real NOT NULL,
	`ping_max_ms` real NOT NULL,
	`heap_used_ratio` real NOT NULL,
	`gc_pause_ms` integer NOT NULL,
	`os` text NOT NULL,
	`arch` text NOT NULL,
	`pack_release` text NOT NULL,
	`client_mod_version` text NOT NULL,
	`ic2_version` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `client_telemetry_received_idx` ON `client_telemetry` (`received_at`);
--> statement-breakpoint
CREATE INDEX `client_telemetry_session_received_idx` ON `client_telemetry` (`session_id`,`received_at`);
--> statement-breakpoint
PRAGMA optimize;
