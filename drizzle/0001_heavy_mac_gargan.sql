CREATE TABLE `cogs_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`variantId` varchar(255) NOT NULL,
	`productTitle` text,
	`cogsValue` decimal(10,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cogs_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `cogs_config_storeId_variantId_unique` UNIQUE(`storeId`,`variantId`)
);
--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromCurrency` varchar(3) NOT NULL,
	`toCurrency` varchar(3) NOT NULL,
	`rate` decimal(10,6) NOT NULL,
	`effectiveDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exchange_rates_id` PRIMARY KEY(`id`),
	CONSTRAINT `exchange_rates_fromCurrency_toCurrency_effectiveDate_unique` UNIQUE(`fromCurrency`,`toCurrency`,`effectiveDate`)
);
--> statement-breakpoint
CREATE TABLE `facebook_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`adAccountId` varchar(255) NOT NULL,
	`accessToken` text NOT NULL,
	`tokenExpiresAt` timestamp,
	`apiVersion` varchar(20) DEFAULT 'v21.0',
	`timezoneOffset` int DEFAULT -300,
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSyncAt` timestamp,
	CONSTRAINT `facebook_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `facebook_connections_storeId_adAccountId_unique` UNIQUE(`storeId`,`adAccountId`)
);
--> statement-breakpoint
CREATE TABLE `operational_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`type` enum('one_time','monthly','yearly') NOT NULL,
	`title` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`date` date,
	`startDate` date,
	`endDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processing_fees_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`percentFee` decimal(5,4) DEFAULT '0.0280',
	`fixedFee` decimal(10,2) DEFAULT '0.29',
	`currency` varchar(3) DEFAULT 'USD',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processing_fees_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `processing_fees_config_storeId_unique` UNIQUE(`storeId`)
);
--> statement-breakpoint
CREATE TABLE `shipping_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`variantId` varchar(255) NOT NULL,
	`productTitle` text,
	`configJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipping_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `shipping_config_storeId_variantId_unique` UNIQUE(`storeId`,`variantId`)
);
--> statement-breakpoint
CREATE TABLE `shopify_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`shopDomain` varchar(255) NOT NULL,
	`accessToken` text NOT NULL,
	`scopes` text,
	`apiVersion` varchar(20) DEFAULT '2025-10',
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSyncAt` timestamp,
	CONSTRAINT `shopify_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `shopify_connections_storeId_unique` UNIQUE(`storeId`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`platform` varchar(50) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`timezoneOffset` int DEFAULT -300,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`)
);
