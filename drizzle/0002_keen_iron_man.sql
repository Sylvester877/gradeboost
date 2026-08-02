ALTER TABLE "chat_sessions" ADD COLUMN "subject" text DEFAULT 'Mathematics' NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "subject" text DEFAULT 'Mathematics' NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "type" text DEFAULT 'Notes' NOT NULL;