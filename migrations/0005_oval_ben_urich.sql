CREATE TABLE "recognitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"description" text NOT NULL,
	"points" integer NOT NULL,
	"badges" text[] DEFAULT '{}' NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "points_ledger_proof_key";--> statement-breakpoint
ALTER TABLE "points_ledger" ALTER COLUMN "proof_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD COLUMN "recognition_id" uuid;--> statement-breakpoint
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recognitions_recipient_created_idx" ON "recognitions" USING btree ("recipient_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "recognitions_created_idx" ON "recognitions" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_recognition_id_recognitions_id_fk" FOREIGN KEY ("recognition_id") REFERENCES "public"."recognitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_recognition_key" ON "points_ledger" USING btree ("recognition_id") WHERE "points_ledger"."recognition_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_proof_key" ON "points_ledger" USING btree ("proof_id") WHERE "points_ledger"."proof_id" IS NOT NULL AND "points_ledger"."reversal_of" IS NULL;