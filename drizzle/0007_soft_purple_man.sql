ALTER TABLE `products` DROP INDEX `products_sku_unique`;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `sku` varchar(255);--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `variantId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_variantId_unique` UNIQUE(`variantId`);