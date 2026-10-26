CREATE TABLE "personal_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text DEFAULT '',
	"status" varchar(20) DEFAULT 'backlog' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"due_date" timestamp,
	"labels" text DEFAULT '',
	"order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "workspace_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "assignee_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "creator_id" SET DATA TYPE text;--> statement-breakpoint
-- sessions.user_id and users.id are converted in 0002, which first drops the
-- foreign key between them; changing one side here breaks fresh databases.
ALTER TABLE "workspaces" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
CREATE INDEX "personal_tasks_user_idx" ON "personal_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "personal_tasks_due_idx" ON "personal_tasks" USING btree ("user_id","due_date");