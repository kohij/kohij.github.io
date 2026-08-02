ALTER TABLE `patch_notes` ADD `reason` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `patch_notes` ADD `evidence` text NOT NULL DEFAULT '[]';
