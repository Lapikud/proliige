CREATE TABLE "recognition_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"image_url" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recognition_badges_label_nonempty_check" CHECK (length(trim("recognition_badges"."label")) > 0)
);
--> statement-breakpoint
ALTER TABLE "recognition_badges" ADD CONSTRAINT "recognition_badges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recognition_badges_label_lower_key" ON "recognition_badges" USING btree (lower("label"));--> statement-breakpoint
CREATE INDEX "recognition_badges_created_idx" ON "recognition_badges" USING btree ("created_at" DESC NULLS LAST);