CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`type` enum('currency','crypto','stock') NOT NULL,
	`name` varchar(100) NOT NULL,
	`baseCurrency` varchar(10) NOT NULL DEFAULT 'CNY',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `holdings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`assetId` int NOT NULL,
	`quantity` decimal(18,8) NOT NULL,
	`costBasis` decimal(18,8),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `holdings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priceHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`price` decimal(18,8) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `priceHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`price` decimal(18,8) NOT NULL,
	`change24h` decimal(10,4),
	`marketCap` decimal(20,2),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prices_id` PRIMARY KEY(`id`)
);
