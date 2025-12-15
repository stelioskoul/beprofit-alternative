CREATE TABLE `cached_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`cacheKey` varchar(255) NOT NULL,
	`dateRange` varchar(50) NOT NULL,
	`metricsData` json NOT NULL,
	`lastRefreshedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cached_metrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `cached_metrics_storeId_cacheKey_unique` UNIQUE(`storeId`,`cacheKey`)
);
