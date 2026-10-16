ALTER TABLE "proofs" ADD COLUMN "text_markdown" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recognitions" ADD COLUMN "description_markdown" boolean DEFAULT false NOT NULL;