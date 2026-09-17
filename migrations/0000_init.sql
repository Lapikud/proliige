CREATE TYPE "public"."proof_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('proof_submitted', 'review_requested', 'proof_approved', 'proof_rejected', 'proof_commented');--> statement-breakpoint
CREATE TYPE "public"."task_policy" AS ENUM('single_winner', 'one_per_user', 'repeatable');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proof_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proof_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proof_review_requests" (
	"proof_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proof_review_requests_proof_id_reviewer_id_pk" PRIMARY KEY("proof_id","reviewer_id")
);
--> statement-breakpoint
CREATE TABLE "proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"policy" "task_policy" NOT NULL,
	"status" "proof_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "proof_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proof_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "proof_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proof_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ipa_unique_id" text NOT NULL,
	"uid" text NOT NULL,
	"display_name" text NOT NULL,
	"freeipa_groups" text[] DEFAULT '{}' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"proof_id" uuid,
	"task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "points_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"proof_id" uuid NOT NULL,
	"points" integer NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category_id" uuid NOT NULL,
	"points" integer NOT NULL,
	"policy" "task_policy" NOT NULL,
	"cooldown_seconds" integer,
	"photo_required" boolean DEFAULT false NOT NULL,
	"photo_instructions" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_backups" (
	"object_key" text PRIMARY KEY NOT NULL,
	"backed_up_at" timestamp with time zone NOT NULL,
	"missing" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proof_photos" ADD CONSTRAINT "proof_photos_proof_id_proofs_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proofs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_review_requests" ADD CONSTRAINT "proof_review_requests_proof_id_proofs_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proofs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_review_requests" ADD CONSTRAINT "proof_review_requests_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_comments" ADD CONSTRAINT "proof_comments_proof_id_proofs_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proofs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_comments" ADD CONSTRAINT "proof_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_likes" ADD CONSTRAINT "proof_likes_proof_id_proofs_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proofs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_likes" ADD CONSTRAINT "proof_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_proof_id_proofs_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proofs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_proof_id_proofs_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proofs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_key" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_key" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "proof_photos_object_key_key" ON "proof_photos" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "proof_photos_proof_idx" ON "proof_photos" USING btree ("proof_id");--> statement-breakpoint
CREATE INDEX "proof_review_requests_reviewer_idx" ON "proof_review_requests" USING btree ("reviewer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proofs_one_pending_per_user" ON "proofs" USING btree ("task_id","user_id") WHERE "proofs"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "proofs_single_winner_exclusive" ON "proofs" USING btree ("task_id") WHERE ("proofs"."policy" = 'single_winner' and "proofs"."status" in ('pending', 'approved'));--> statement-breakpoint
CREATE UNIQUE INDEX "proofs_one_approved_per_user" ON "proofs" USING btree ("task_id","user_id") WHERE ("proofs"."policy" = 'one_per_user' and "proofs"."status" = 'approved');--> statement-breakpoint
CREATE INDEX "proofs_status_idx" ON "proofs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "proofs_user_idx" ON "proofs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "proofs_task_user_status_idx" ON "proofs" USING btree ("task_id","user_id","status");--> statement-breakpoint
CREATE INDEX "proofs_feed_idx" ON "proofs" USING btree ("reviewed_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "proofs"."status" = 'approved';--> statement-breakpoint
CREATE INDEX "proof_comments_proof_idx" ON "proof_comments" USING btree ("proof_id","created_at");--> statement-breakpoint
CREATE INDEX "proof_comments_user_recent_idx" ON "proof_comments" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "proof_likes_proof_user_key" ON "proof_likes" USING btree ("proof_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_ipa_unique_id_key" ON "users" USING btree ("ipa_unique_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_uid_key" ON "users" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("recipient_user_id") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_proof_key" ON "points_ledger" USING btree ("proof_id");--> statement-breakpoint
CREATE INDEX "points_ledger_user_idx" ON "points_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_category_idx" ON "tasks" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "tasks_active_idx" ON "tasks" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "tasks_active_category_title_idx" ON "tasks" USING btree ("category_id","title") WHERE "tasks"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");