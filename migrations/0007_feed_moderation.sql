ALTER TYPE "public"."notification_type" ADD VALUE 'proof_reported';--> statement-breakpoint
CREATE TABLE "proof_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proof_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid
);
--> statement-breakpoint
ALTER TABLE "proofs" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proofs" ADD COLUMN "hidden_by" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "show_on_feed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "proof_reports" ADD CONSTRAINT "proof_reports_proof_id_proofs_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proofs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_reports" ADD CONSTRAINT "proof_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_reports" ADD CONSTRAINT "proof_reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "proof_reports_one_per_reporter" ON "proof_reports" USING btree ("proof_id","reporter_id");--> statement-breakpoint
CREATE INDEX "proof_reports_open_idx" ON "proof_reports" USING btree ("created_at") WHERE "proof_reports"."resolved_at" is null;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_hidden_by_users_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;