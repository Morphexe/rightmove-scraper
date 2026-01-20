CREATE TABLE `search_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `locations` json NOT NULL,
  `filters` json NOT NULL,
  `broadband` json NOT NULL,
  `scraping` json NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `is_active_idx` (`is_active`)
);

-- Insert default config from existing config.json structure
INSERT INTO `search_configs` (`name`, `locations`, `filters`, `broadband`, `scraping`, `is_active`) VALUES (
  'Default',
  '[{"name": "Central London", "postcode": "SW1A", "radius": 5}, {"name": "East London", "postcode": "E1", "radius": 3}]',
  '{"minPrice": 200000, "maxPrice": 600000, "minBedrooms": 2, "maxBedrooms": 4, "propertyTypes": ["detached", "semi-detached", "terraced"], "maxDaysSinceAdded": 1}',
  '{"enabled": true, "minDownloadSpeed": 500, "minUploadSpeed": 50}',
  '{"maxPagesPerLocation": 3, "delayBetweenRequests": 2000, "rotateProxyEveryNPages": 5}',
  true
);
