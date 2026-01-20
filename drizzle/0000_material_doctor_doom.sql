CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rightmove_id` varchar(50) NOT NULL,
	`url` varchar(500) NOT NULL,
	`title` varchar(500),
	`property_type` varchar(100),
	`address` varchar(500),
	`postcode` varchar(20),
	`price` int,
	`price_qualifier` varchar(50),
	`bedrooms` int,
	`bathrooms` int,
	`description` text,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`agent_name` varchar(200),
	`agent_phone` varchar(50),
	`images` text,
	`features` text,
	`broadband_download` int,
	`broadband_upload` int,
	`listed_date` datetime,
	`first_scraped_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`last_scraped_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`),
	CONSTRAINT `rightmove_id_idx` UNIQUE(`rightmove_id`)
);
--> statement-breakpoint
CREATE TABLE `scrape_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`search_location` varchar(200) NOT NULL,
	`search_radius` varchar(50),
	`search_criteria` text,
	`started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`completed_at` datetime,
	`status` varchar(50) NOT NULL DEFAULT 'running',
	`pages_scraped` int NOT NULL DEFAULT 0,
	`properties_found` int NOT NULL DEFAULT 0,
	`new_properties` int NOT NULL DEFAULT 0,
	`updated_properties` int NOT NULL DEFAULT 0,
	`last_page_url` varchar(500),
	`last_page_number` int,
	`error_message` text,
	CONSTRAINT `scrape_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `postcode_idx` ON `properties` (`postcode`);--> statement-breakpoint
CREATE INDEX `price_idx` ON `properties` (`price`);--> statement-breakpoint
CREATE INDEX `bedrooms_idx` ON `properties` (`bedrooms`);--> statement-breakpoint
CREATE INDEX `listed_date_idx` ON `properties` (`listed_date`);--> statement-breakpoint
CREATE INDEX `location_idx` ON `scrape_runs` (`search_location`);--> statement-breakpoint
CREATE INDEX `started_at_idx` ON `scrape_runs` (`started_at`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `scrape_runs` (`status`);