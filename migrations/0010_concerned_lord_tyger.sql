ALTER TABLE "proof_comments" DROP CONSTRAINT "proof_comments_target_check";--> statement-breakpoint
ALTER TABLE "proof_likes" DROP CONSTRAINT "proof_likes_target_check";--> statement-breakpoint
ALTER TABLE "points_ledger" DROP CONSTRAINT "points_ledger_source_check";--> statement-breakpoint
ALTER TABLE "recognition_badges" DROP CONSTRAINT "recognition_badges_label_nonempty_check";--> statement-breakpoint
DROP INDEX "recognition_badges_label_lower_key";--> statement-breakpoint
DROP INDEX "points_ledger_proof_key";--> statement-breakpoint
DROP INDEX "points_ledger_recognition_key";--> statement-breakpoint
DROP INDEX "points_ledger_reversal_of_key";--> statement-breakpoint
ALTER TABLE "recognition_badges" ADD COLUMN "label_key" text;--> statement-breakpoint
UPDATE "recognition_badges" SET "label_key" = lower("label");--> statement-breakpoint
ALTER TABLE "recognition_badges" ALTER COLUMN "label_key" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "recognition_badges_label_key_key" ON "recognition_badges" USING btree ("label_key");--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_proof_key" ON "points_ledger" USING btree ("proof_id") WHERE ("points_ledger"."proof_id" is not null and "points_ledger"."reversal_of" is null);--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_recognition_key" ON "points_ledger" USING btree ("recognition_id") WHERE "points_ledger"."recognition_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_reversal_of_key" ON "points_ledger" USING btree ("reversal_of") WHERE "points_ledger"."reversal_of" is not null;--> statement-breakpoint
ALTER TABLE "proof_comments" ADD CONSTRAINT "proof_comments_target_check" CHECK ((("proof_comments"."proof_id" is not null and "proof_comments"."recognition_id" is null) or ("proof_comments"."proof_id" is null and "proof_comments"."recognition_id" is not null)));--> statement-breakpoint
ALTER TABLE "proof_likes" ADD CONSTRAINT "proof_likes_target_check" CHECK ((("proof_likes"."proof_id" is not null and "proof_likes"."recognition_id" is null) or ("proof_likes"."proof_id" is null and "proof_likes"."recognition_id" is not null)));--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_source_check" CHECK ((("points_ledger"."proof_id" is not null and "points_ledger"."recognition_id" is null) or ("points_ledger"."proof_id" is null and "points_ledger"."recognition_id" is not null and "points_ledger"."reversal_of" is null)));--> statement-breakpoint
ALTER TABLE "recognition_badges" ADD CONSTRAINT "recognition_badges_label_nonempty_check" CHECK ("recognition_badges"."label" <> '');