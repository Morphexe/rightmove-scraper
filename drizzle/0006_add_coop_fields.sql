-- Add COOP supermarket tracking fields
ALTER TABLE `properties` ADD COLUMN `nearest_coop_name` varchar(200);
ALTER TABLE `properties` ADD COLUMN `nearest_coop_distance` int;
ALTER TABLE `properties` ADD COLUMN `nearest_coop_walk_mins` int;
