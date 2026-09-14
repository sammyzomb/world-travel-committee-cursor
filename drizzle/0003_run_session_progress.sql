ALTER TABLE `run_sessions` ADD `progress_json` text DEFAULT '{}' NOT NULL;
ALTER TABLE `run_sessions` ADD `expires_at` text NOT NULL DEFAULT (datetime('now', '+1 day'));
