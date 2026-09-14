ALTER TABLE `leaderboard_entries` ADD `session_token` text;
ALTER TABLE `leaderboard_entries` ADD `correct_count` integer;
CREATE UNIQUE INDEX `leaderboard_entries_session_token_unique` ON `leaderboard_entries` (`session_token`);
