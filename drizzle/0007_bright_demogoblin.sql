ALTER TABLE `cached_metrics` DROP INDEX `cached_metrics_storeId_cacheKey_unique`;--> statement-breakpoint
ALTER TABLE `cached_metrics` ADD `date` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `cached_metrics` ADD CONSTRAINT `cached_metrics_storeId_date_unique` UNIQUE(`storeId`,`date`);--> statement-breakpoint
ALTER TABLE `cached_metrics` DROP COLUMN `cacheKey`;--> statement-breakpoint
ALTER TABLE `cached_metrics` DROP COLUMN `dateRange`;