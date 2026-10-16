DROP INDEX "points_ledger_proof_key";--> statement-breakpoint
ALTER TABLE "points_ledger" ADD COLUMN "reversal_of" uuid;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "points_ledger" SET "created_at" = "awarded_at";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "removed_by" uuid;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_reversal_of_points_ledger_id_fk" FOREIGN KEY ("reversal_of") REFERENCES "public"."points_ledger"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_removed_by_users_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_reversal_of_key" ON "points_ledger" USING btree ("reversal_of") WHERE "points_ledger"."reversal_of" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_proof_key" ON "points_ledger" USING btree ("proof_id") WHERE "points_ledger"."reversal_of" IS NULL;