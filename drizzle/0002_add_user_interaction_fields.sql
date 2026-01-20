ALTER TABLE `properties` 
  ADD COLUMN `is_marked` boolean NOT NULL DEFAULT false AFTER `is_active`,
  ADD COLUMN `user_notes` text AFTER `is_marked`,
  ADD COLUMN `user_rating` int AFTER `user_notes`,
  ADD COLUMN `user_status` varchar(50) AFTER `user_rating`;
--> statement-breakpoint
CREATE INDEX `is_marked_idx` ON `properties` (`is_marked`);
--> statement-breakpoint
CREATE INDEX `user_status_idx` ON `properties` (`user_status`);
