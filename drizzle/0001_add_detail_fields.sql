ALTER TABLE `properties` 
  ADD COLUMN `property_sub_type` varchar(100) AFTER `property_type`,
  ADD COLUMN `size_sq_ft` int AFTER `bathrooms`,
  ADD COLUMN `agent_address` varchar(300) AFTER `agent_phone`,
  ADD COLUMN `floorplans` text AFTER `images`,
  ADD COLUMN `epc_url` varchar(500) AFTER `floorplans`,
  ADD COLUMN `key_features` text AFTER `epc_url`,
  ADD COLUMN `has_parking` boolean AFTER `key_features`,
  ADD COLUMN `has_garden` boolean AFTER `has_parking`,
  ADD COLUMN `tenure` varchar(50) AFTER `has_garden`,
  ADD COLUMN `council_tax_band` varchar(10) AFTER `tenure`,
  ADD COLUMN `annual_service_charge` int AFTER `council_tax_band`,
  ADD COLUMN `annual_ground_rent` int AFTER `annual_service_charge`,
  ADD COLUMN `nearest_stations` text AFTER `annual_ground_rent`,
  ADD COLUMN `broadband_provider` varchar(100) AFTER `broadband_upload`,
  ADD COLUMN `detail_scraped_at` datetime AFTER `last_scraped_at`;
--> statement-breakpoint
ALTER TABLE `properties` DROP COLUMN `features`;
--> statement-breakpoint
CREATE INDEX `broadband_idx` ON `properties` (`broadband_download`);
