CREATE TABLE `client_crash_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`received_at` integer NOT NULL,
	`source` text NOT NULL,
	`event` text NOT NULL,
	`fingerprint` text NOT NULL,
	`app_version` text NOT NULL,
	`pack_release` text NOT NULL,
	`minecraft_version` text NOT NULL,
	`java_runtime` text NOT NULL,
	`os` text NOT NULL,
	`arch` text NOT NULL,
	`phase` text NOT NULL,
	`exit_code` integer,
	`artifact_size` integer NOT NULL,
	`network_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `client_crash_reports_received_idx` ON `client_crash_reports` (`received_at`);
--> statement-breakpoint
CREATE INDEX `client_crash_reports_fingerprint_idx` ON `client_crash_reports` (`fingerprint`,`received_at`);
--> statement-breakpoint
CREATE INDEX `client_crash_reports_network_idx` ON `client_crash_reports` (`network_hash`,`received_at`);
