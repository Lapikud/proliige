ALTER TABLE "points_ledger" DROP CONSTRAINT "points_ledger_source_check";--> statement-breakpoint
DROP INDEX "points_ledger_recognition_key";--> statement-breakpoint
ALTER TABLE "recognitions" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recognitions" ADD COLUMN "hidden_by" uuid;--> statement-breakpoint
ALTER TABLE "recognitions" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recognitions" ADD COLUMN "revoked_by" uuid;--> statement-breakpoint
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_hidden_by_users_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_recognition_key" ON "points_ledger" USING btree ("recognition_id") WHERE ("points_ledger"."recognition_id" is not null and "points_ledger"."reversal_of" is null);--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_source_check" CHECK ((("points_ledger"."proof_id" is not null and "points_ledger"."recognition_id" is null) or ("points_ledger"."proof_id" is null and "points_ledger"."recognition_id" is not null)));