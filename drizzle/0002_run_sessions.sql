CREATE TABLE `run_sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`question_bank_version` text NOT NULL,
	`issued_plan_json` text NOT NULL,
	`stage_starts_json` text NOT NULL,
	`exhausted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
