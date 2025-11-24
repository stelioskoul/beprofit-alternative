CREATE TABLE `shopifyOrderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`shopifyOrderId` varchar(255) NOT NULL,
	`lineItemId` varchar(255) NOT NULL,
	`variantId` varchar(255),
	`productId` varchar(255),
	`sku` varchar(255),
	`title` text,
	`variantTitle` text,
	`quantity` int NOT NULL,
	`price` int NOT NULL,
	`totalDiscount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shopifyOrderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shopifyOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopifyOrderId` varchar(255) NOT NULL,
	`orderNumber` varchar(255),
	`email` varchar(320),
	`financialStatus` varchar(50),
	`fulfillmentStatus` varchar(50),
	`totalPrice` int NOT NULL,
	`subtotalPrice` int,
	`totalTax` int,
	`totalShipping` int,
	`currency` varchar(10),
	`processedAt` timestamp,
	`cancelledAt` timestamp,
	`orderData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shopifyOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `shopifyOrders_shopifyOrderId_unique` UNIQUE(`shopifyOrderId`)
);
--> statement-breakpoint
CREATE TABLE `shopifyRefunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopifyRefundId` varchar(255) NOT NULL,
	`shopifyOrderId` varchar(255) NOT NULL,
	`orderId` int,
	`amount` int NOT NULL,
	`currency` varchar(10),
	`note` text,
	`processedAt` timestamp,
	`refundData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shopifyRefunds_id` PRIMARY KEY(`id`),
	CONSTRAINT `shopifyRefunds_shopifyRefundId_unique` UNIQUE(`shopifyRefundId`)
);
--> statement-breakpoint
CREATE TABLE `webhookLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topic` varchar(100) NOT NULL,
	`shopDomain` varchar(255),
	`payload` text,
	`status` varchar(50) NOT NULL,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhookLogs_id` PRIMARY KEY(`id`)
);
