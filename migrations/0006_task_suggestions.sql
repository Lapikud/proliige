ALTER TABLE "tasks" ADD COLUMN "suggested_by" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "suggestion_pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_suggested_by_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;