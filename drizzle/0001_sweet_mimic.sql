CREATE TABLE `jatra_counts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantId` int NOT NULL,
	`participantUuid` varchar(36) NOT NULL,
	`jatraNumber` int NOT NULL,
	`startScanId` int,
	`endScanId` int,
	`startTime` timestamp,
	`endTime` timestamp,
	`durationMinutes` int,
	`completedAt` timestamp NOT NULL,
	`syncedToSheets` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jatra_counts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`badgeNumber` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`qrToken` varchar(64) NOT NULL,
	`age` int,
	`bloodGroup` varchar(10),
	`emergencyContact` varchar(20),
	`photoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `participants_uuid_unique` UNIQUE(`uuid`),
	CONSTRAINT `participants_badgeNumber_unique` UNIQUE(`badgeNumber`),
	CONSTRAINT `participants_qrToken_unique` UNIQUE(`qrToken`)
);
--> statement-breakpoint
CREATE TABLE `scan_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`participantId` int NOT NULL,
	`participantUuid` varchar(36) NOT NULL,
	`checkpointId` int NOT NULL,
	`deviceId` varchar(64),
	`scannedAt` timestamp NOT NULL,
	`syncedToSheets` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scan_logs_uuid_unique` UNIQUE(`uuid`)
);
