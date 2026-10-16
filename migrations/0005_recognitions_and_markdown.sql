CREATE TABLE "recognitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"description" text NOT NULL,
	"description_markdown" boolean DEFAULT false NOT NULL,
	"points" integer NOT NULL,
	"badges" text[] DEFAULT '{}' NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recognitions_points_positive_check" CHECK ("recognitions"."points" > 0)
);
--> statement-breakpoint
CREATE TABLE "recognition_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"label_key" text NOT NULL,
	"image_url" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recognition_badges_label_nonempty_check" CHECK ("recognition_badges"."label" <> '')
);
--> statement-breakpoint
DROP INDEX "points_ledger_proof_key";--> statement-breakpoint
ALTER TABLE "proof_comments" ALTER COLUMN "proof_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "proof_likes" ALTER COLUMN "proof_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "points_ledger" ALTER COLUMN "proof_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "proofs" ADD COLUMN "text_markdown" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "proof_comments" ADD COLUMN "recognition_id" uuid;--> statement-breakpoint
ALTER TABLE "proof_likes" ADD COLUMN "recognition_id" uuid;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD COLUMN "recognition_id" uuid;--> statement-breakpoint
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_badges" ADD CONSTRAINT "recognition_badges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recognitions_recipient_created_idx" ON "recognitions" USING btree ("recipient_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "recognitions_created_idx" ON "recognitions" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "recognition_badges_label_key_key" ON "recognition_badges" USING btree ("label_key");--> statement-breakpoint
CREATE INDEX "recognition_badges_created_idx" ON "recognition_badges" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "proof_comments" ADD CONSTRAINT "proof_comments_recognition_id_recognitions_id_fk" FOREIGN KEY ("recognition_id") REFERENCES "public"."recognitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_likes" ADD CONSTRAINT "proof_likes_recognition_id_recognitions_id_fk" FOREIGN KEY ("recognition_id") REFERENCES "public"."recognitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_recognition_id_recognitions_id_fk" FOREIGN KEY ("recognition_id") REFERENCES "public"."recognitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proof_comments_recognition_idx" ON "proof_comments" USING btree ("recognition_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "proof_likes_recognition_user_key" ON "proof_likes" USING btree ("recognition_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_recognition_key" ON "points_ledger" USING btree ("recognition_id") WHERE "points_ledger"."recognition_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_proof_key" ON "points_ledger" USING btree ("proof_id") WHERE ("points_ledger"."proof_id" is not null and "points_ledger"."reversal_of" is null);--> statement-breakpoint
ALTER TABLE "proof_comments" ADD CONSTRAINT "proof_comments_target_check" CHECK ((("proof_comments"."proof_id" is not null and "proof_comments"."recognition_id" is null) or ("proof_comments"."proof_id" is null and "proof_comments"."recognition_id" is not null)));--> statement-breakpoint
ALTER TABLE "proof_likes" ADD CONSTRAINT "proof_likes_target_check" CHECK ((("proof_likes"."proof_id" is not null and "proof_likes"."recognition_id" is null) or ("proof_likes"."proof_id" is null and "proof_likes"."recognition_id" is not null)));--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_source_check" CHECK ((("points_ledger"."proof_id" is not null and "points_ledger"."recognition_id" is null) or ("points_ledger"."proof_id" is null and "points_ledger"."recognition_id" is not null and "points_ledger"."reversal_of" is null)));