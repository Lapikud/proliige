ALTER TABLE "proof_comments" ALTER COLUMN "proof_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "proof_likes" ALTER COLUMN "proof_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "proof_comments" ADD COLUMN "recognition_id" uuid;--> statement-breakpoint
ALTER TABLE "proof_likes" ADD COLUMN "recognition_id" uuid;--> statement-breakpoint
ALTER TABLE "proof_comments" ADD CONSTRAINT "proof_comments_recognition_id_recognitions_id_fk" FOREIGN KEY ("recognition_id") REFERENCES "public"."recognitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_likes" ADD CONSTRAINT "proof_likes_recognition_id_recognitions_id_fk" FOREIGN KEY ("recognition_id") REFERENCES "public"."recognitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proof_comments_recognition_idx" ON "proof_comments" USING btree ("recognition_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "proof_likes_recognition_user_key" ON "proof_likes" USING btree ("recognition_id","user_id");--> statement-breakpoint
ALTER TABLE "proof_comments" ADD CONSTRAINT "proof_comments_target_check" CHECK (num_nonnulls("proof_comments"."proof_id", "proof_comments"."recognition_id") = 1);--> statement-breakpoint
ALTER TABLE "proof_likes" ADD CONSTRAINT "proof_likes_target_check" CHECK (num_nonnulls("proof_likes"."proof_id", "proof_likes"."recognition_id") = 1);