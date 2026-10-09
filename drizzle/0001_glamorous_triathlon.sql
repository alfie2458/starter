CREATE TABLE `achievement_definitions` (
	`id` varchar(48) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`icon` varchar(48) NOT NULL,
	`condition` varchar(32) NOT NULL,
	`threshold` int NOT NULL DEFAULT 1,
	`rarity` varchar(24) NOT NULL DEFAULT '一般',
	CONSTRAINT `achievement_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `building_definitions` (
	`id` varchar(48) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`icon` varchar(48) NOT NULL,
	`cost` int NOT NULL,
	`unlockRule` varchar(32) NOT NULL,
	`threshold` int NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `building_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `building_logs` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`buildingId` varchar(48) NOT NULL,
	`action` enum('build','upgrade') NOT NULL,
	`level` int NOT NULL,
	`materialsDelta` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `building_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collectible_definitions` (
	`id` varchar(48) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`category` enum('decoration','theme') NOT NULL,
	`icon` varchar(48) NOT NULL,
	`unlockRule` varchar(32) NOT NULL,
	`cost` int NOT NULL DEFAULT 0,
	`rarity` varchar(24) NOT NULL DEFAULT '一般',
	CONSTRAINT `collectible_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`userId` int NOT NULL,
	`displayName` varchar(100),
	`tutorialComplete` boolean NOT NULL DEFAULT false,
	`theme` enum('dark','light') NOT NULL DEFAULT 'dark',
	`animationsEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `reward_definitions` (
	`id` varchar(32) NOT NULL,
	`label` varchar(100) NOT NULL,
	`xp` int NOT NULL,
	`materials` int NOT NULL,
	`minMinutes` int NOT NULL DEFAULT 0,
	`enabled` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reward_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reward_events` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`studyRecordId` varchar(36) NOT NULL,
	`rewardType` varchar(32) NOT NULL,
	`baseXp` int NOT NULL,
	`awardedXp` int NOT NULL,
	`materials` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reward_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `reward_events_studyRecordId_unique` UNIQUE(`studyRecordId`)
);
--> statement-breakpoint
CREATE TABLE `study_records` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(36),
	`taskId` int,
	`kind` enum('micro','review','focus','recall','error_fix','weekly_review','exam_plan','exam_review','semester_review') NOT NULL,
	`minutes` int NOT NULL,
	`summary` text NOT NULL,
	`completed` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `study_records_sessionId_unique` UNIQUE(`sessionId`),
	CONSTRAINT `study_records_taskId_unique` UNIQUE(`taskId`)
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`taskId` int,
	`kind` enum('micro','review','focus','recall','error_fix','weekly_review','exam_plan','exam_review','semester_review') NOT NULL,
	`plannedMinutes` int NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`state` enum('active','completed','partial','abandoned') NOT NULL DEFAULT 'active',
	CONSTRAINT `study_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`subject` varchar(80),
	`kind` enum('micro','review','focus','recall','error_fix','weekly_review','exam_plan','exam_review','semester_review') NOT NULL DEFAULT 'review',
	`dueDate` varchar(10),
	`systemKey` varchar(48),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `tasks_user_system_key_unique` UNIQUE(`userId`,`systemKey`)
);
--> statement-breakpoint
CREATE TABLE `technology_nodes` (
	`id` varchar(48) NOT NULL,
	`branch` enum('focus','memory','analysis','planning') NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`requirement` varchar(32) NOT NULL,
	`threshold` int NOT NULL DEFAULT 1,
	`parentId` varchar(48),
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `technology_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`achievementId` varchar(48) NOT NULL,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_achievement_unique` UNIQUE(`userId`,`achievementId`)
);
--> statement-breakpoint
CREATE TABLE `user_buildings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`buildingId` varchar(48) NOT NULL,
	`unlockedAt` timestamp,
	`builtAt` timestamp,
	`level` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_buildings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_building_unique` UNIQUE(`userId`,`buildingId`)
);
--> statement-breakpoint
CREATE TABLE `user_collectibles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`collectibleId` varchar(48) NOT NULL,
	`acquisitionEventId` varchar(36),
	`acquiredAt` timestamp NOT NULL DEFAULT (now()),
	`equipped` boolean NOT NULL DEFAULT false,
	CONSTRAINT `user_collectibles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_collectibles_acquisitionEventId_unique` UNIQUE(`acquisitionEventId`),
	CONSTRAINT `user_collectible_unique` UNIQUE(`userId`,`collectibleId`)
);
--> statement-breakpoint
CREATE TABLE `user_technology_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nodeId` varchar(48) NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`unlockedAt` timestamp,
	CONSTRAINT `user_technology_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_technology_node_unique` UNIQUE(`userId`,`nodeId`)
);
--> statement-breakpoint
CREATE TABLE `user_wallets` (
	`userId` int NOT NULL,
	`xp` int NOT NULL DEFAULT 0,
	`materials` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_wallets_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`referenceId` varchar(36) NOT NULL,
	`kind` enum('reward','build','upgrade','collectible') NOT NULL,
	`xpDelta` int NOT NULL DEFAULT 0,
	`materialsDelta` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_transactions_referenceId_unique` UNIQUE(`referenceId`)
);
--> statement-breakpoint
ALTER TABLE `building_logs` ADD CONSTRAINT `building_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `building_logs` ADD CONSTRAINT `building_logs_buildingId_building_definitions_id_fk` FOREIGN KEY (`buildingId`) REFERENCES `building_definitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reward_events` ADD CONSTRAINT `reward_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reward_events` ADD CONSTRAINT `reward_events_studyRecordId_study_records_id_fk` FOREIGN KEY (`studyRecordId`) REFERENCES `study_records`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_records` ADD CONSTRAINT `study_records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_records` ADD CONSTRAINT `study_records_sessionId_study_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `study_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_records` ADD CONSTRAINT `study_records_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_sessions` ADD CONSTRAINT `study_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_sessions` ADD CONSTRAINT `study_sessions_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_achievementId_achievement_definitions_id_fk` FOREIGN KEY (`achievementId`) REFERENCES `achievement_definitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_buildings` ADD CONSTRAINT `user_buildings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_buildings` ADD CONSTRAINT `user_buildings_buildingId_building_definitions_id_fk` FOREIGN KEY (`buildingId`) REFERENCES `building_definitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_collectibles` ADD CONSTRAINT `user_collectibles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_collectibles` ADD CONSTRAINT `user_collectibles_collectibleId_collectible_definitions_id_fk` FOREIGN KEY (`collectibleId`) REFERENCES `collectible_definitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_technology_progress` ADD CONSTRAINT `user_technology_progress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_technology_progress` ADD CONSTRAINT `user_technology_progress_nodeId_technology_nodes_id_fk` FOREIGN KEY (`nodeId`) REFERENCES `technology_nodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_wallets` ADD CONSTRAINT `user_wallets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `building_logs_user_created_idx` ON `building_logs` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reward_user_created_idx` ON `reward_events` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `records_user_created_idx` ON `study_records` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sessions_user_started_idx` ON `study_sessions` (`userId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `tasks_user_due_idx` ON `tasks` (`userId`,`dueDate`);--> statement-breakpoint
CREATE INDEX `transactions_user_created_idx` ON `wallet_transactions` (`userId`,`createdAt`);