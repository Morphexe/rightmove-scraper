ALTER TABLE `properties`
  ADD COLUMN `search_zone` varchar(100) AFTER `postcode`,
  ADD COLUMN `enriched_at` datetime AFTER `detail_scraped_at`,
  
  ADD COLUMN `nearest_station_name` varchar(200) AFTER `nearest_stations`,
  ADD COLUMN `nearest_station_distance` int AFTER `nearest_station_name`,
  ADD COLUMN `nearest_station_walk_mins` int AFTER `nearest_station_distance`,
  
  ADD COLUMN `nearest_aldi_name` varchar(200) AFTER `nearest_station_walk_mins`,
  ADD COLUMN `nearest_aldi_distance` int AFTER `nearest_aldi_name`,
  ADD COLUMN `nearest_aldi_walk_mins` int AFTER `nearest_aldi_distance`,
  ADD COLUMN `nearest_lidl_name` varchar(200) AFTER `nearest_aldi_walk_mins`,
  ADD COLUMN `nearest_lidl_distance` int AFTER `nearest_lidl_name`,
  ADD COLUMN `nearest_lidl_walk_mins` int AFTER `nearest_lidl_distance`,
  
  ADD COLUMN `nearest_post_office_distance` int AFTER `nearest_lidl_walk_mins`,
  ADD COLUMN `nearest_post_office_walk_mins` int AFTER `nearest_post_office_distance`,
  ADD COLUMN `nearest_dentist_distance` int AFTER `nearest_post_office_walk_mins`,
  ADD COLUMN `nearest_dentist_walk_mins` int AFTER `nearest_dentist_distance`,
  ADD COLUMN `nearest_hospital_distance` int AFTER `nearest_dentist_walk_mins`,
  ADD COLUMN `nearest_hospital_walk_mins` int AFTER `nearest_hospital_distance`,
  ADD COLUMN `nearest_gp_distance` int AFTER `nearest_hospital_walk_mins`,
  ADD COLUMN `nearest_gp_walk_mins` int AFTER `nearest_gp_distance`,
  
  ADD COLUMN `commute_times` json AFTER `nearest_gp_walk_mins`;

CREATE INDEX `search_zone_idx` ON `properties` (`search_zone`);
CREATE INDEX `enriched_at_idx` ON `properties` (`enriched_at`);

ALTER TABLE `search_configs`
  ADD COLUMN `commute_points` json AFTER `scraping`;

UPDATE `search_configs` 
SET `commute_points` = '[{"name": "Manchester Airport", "lat": 53.3588, "lng": -2.2727}]'
WHERE `name` = 'Default';
