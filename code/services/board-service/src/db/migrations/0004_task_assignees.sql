CREATE TABLE IF NOT EXISTS "task_assignees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "task_assignees_task_user_idx" ON "task_assignees" ("task_id", "user_id");
--> statement-breakpoint
-- Backfill any existing single assignees from tasks table into junction table
INSERT INTO "task_assignees" ("task_id", "user_id")
SELECT "id", "assignee_id" FROM "tasks"
WHERE "assignee_id" IS NOT NULL
ON CONFLICT DO NOTHING;
