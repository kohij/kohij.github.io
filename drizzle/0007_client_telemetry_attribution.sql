ALTER TABLE `client_telemetry` ADD `ping_missing_samples` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `client_tick_p95_ms` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `client_tick_max_ms` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `internet_samples` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `internet_average_ms` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `internet_p95_ms` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `internet_max_ms` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `internet_failures` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `process_cpu_ratio` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `system_cpu_ratio` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `screen_width` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `screen_height` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `render_distance` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `simulation_distance` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `max_fps` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `allocated_memory_mb` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `cause_hint` text DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `network_hash` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_telemetry` ADD `sample_bucket` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX `client_telemetry_cause_received_idx` ON `client_telemetry` (`cause_hint`, `received_at`);
--> statement-breakpoint
CREATE INDEX `client_telemetry_network_received_idx` ON `client_telemetry` (`network_hash`, `received_at`);
--> statement-breakpoint
CREATE INDEX `client_telemetry_bucket_cause_idx` ON `client_telemetry` (`sample_bucket`, `cause_hint`);
--> statement-breakpoint
CREATE TABLE `host_telemetry` (
  `id` text PRIMARY KEY NOT NULL,
  `received_at` integer NOT NULL,
  `sample_bucket` integer NOT NULL,
  `proxy_ok` integer NOT NULL,
  `backend_ok` integer NOT NULL,
  `public_status_ok` integer NOT NULL,
  `external_ok` integer NOT NULL,
  `proxy_tcp_ms` real NOT NULL,
  `backend_tcp_ms` real NOT NULL,
  `public_status_ms` real NOT NULL,
  `external_rtt_ms` real NOT NULL,
  `server_cpu_ratio` real NOT NULL,
  `host_cpu_ratio` real NOT NULL,
  `server_rss_mb` real NOT NULL,
  `load_per_core` real NOT NULL,
  `free_disk_gb` real NOT NULL,
  `tps_5` real NOT NULL,
  `tps_1m` real NOT NULL,
  `tps_age_seconds` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `host_telemetry_received_idx` ON `host_telemetry` (`received_at`);
--> statement-breakpoint
CREATE INDEX `host_telemetry_bucket_idx` ON `host_telemetry` (`sample_bucket`);
