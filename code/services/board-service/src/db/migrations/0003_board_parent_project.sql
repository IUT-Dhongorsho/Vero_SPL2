-- Boards are per module; remember which project each module board belongs to.
-- (The 0002 snapshot predated personal_tasks, so the generator also re-emitted
-- objects that 0001/0002 already create — only the new columns belong here.)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "parent_project_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "parent_project_name" varchar(255);
