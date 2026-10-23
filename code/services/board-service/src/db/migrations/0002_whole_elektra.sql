-- 1. Drop foreign key constraints that connect tables
ALTER TABLE "columns" DROP CONSTRAINT IF EXISTS "columns_project_id_projects_id_fk";
ALTER TABLE "workspace_members" DROP CONSTRAINT IF EXISTS "workspace_members_workspace_id_workspaces_id_fk";
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_workspace_id_workspaces_id_fk";
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_users_id_fk";

-- 2. Alter primary key and foreign key columns to text
ALTER TABLE "projects" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "projects" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "workspace_id" SET DATA TYPE text;
ALTER TABLE "projects" ALTER COLUMN "workspace_id" DROP NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "owner_id" SET DATA TYPE text;

ALTER TABLE "workspaces" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "workspaces" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "workspaces" ALTER COLUMN "owner_id" SET DATA TYPE text;

ALTER TABLE "columns" ALTER COLUMN "project_id" SET DATA TYPE text;

ALTER TABLE "workspace_members" ALTER COLUMN "workspace_id" SET DATA TYPE text;
ALTER TABLE "workspace_members" ALTER COLUMN "user_id" SET DATA TYPE text;

ALTER TABLE "tasks" ALTER COLUMN "assignee_id" SET DATA TYPE text;
ALTER TABLE "tasks" ALTER COLUMN "creator_id" SET DATA TYPE text;

ALTER TABLE "sessions" ALTER COLUMN "user_id" SET DATA TYPE text;
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;

-- 3. Re-add foreign key constraints using the new text columns
ALTER TABLE "columns" ADD CONSTRAINT "columns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;