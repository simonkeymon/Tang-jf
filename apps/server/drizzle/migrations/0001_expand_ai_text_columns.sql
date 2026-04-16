ALTER TABLE "plans" ALTER COLUMN "notes" TYPE text;
--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "ai_summary" TYPE text;
--> statement-breakpoint
ALTER TABLE "summaries" ALTER COLUMN "ai_feedback" TYPE text;
--> statement-breakpoint
ALTER TABLE "summaries" ALTER COLUMN "tomorrow_preview" TYPE text;
--> statement-breakpoint
ALTER TABLE "food_analyses" ALTER COLUMN "note" TYPE text;
