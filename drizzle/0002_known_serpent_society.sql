CREATE TABLE `portfolioValueHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalValue` decimal(18,2) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolioValueHistory_id` PRIMARY KEY(`id`)
);
