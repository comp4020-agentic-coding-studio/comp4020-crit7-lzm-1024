CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`cancelled_at` text
);
