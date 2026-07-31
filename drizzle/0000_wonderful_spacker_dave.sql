CREATE TABLE `patch_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`changes` text NOT NULL,
	`position` integer NOT NULL,
	`updated_at` text NOT NULL
);
