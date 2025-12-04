CREATE TABLE `product_shipping_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`variantId` varchar(255) NOT NULL,
	`profileId` int NOT NULL,
	`productTitle` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_shipping_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_shipping_profiles_storeId_variantId_unique` UNIQUE(`storeId`,`variantId`)
);
--> statement-breakpoint
CREATE TABLE `shipping_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`configJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipping_profiles_id` PRIMARY KEY(`id`)
);
