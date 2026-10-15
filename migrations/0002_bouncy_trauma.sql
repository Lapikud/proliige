ALTER TABLE "proofs" ADD COLUMN "text_answer" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "text_required" boolean DEFAULT false NOT NULL;