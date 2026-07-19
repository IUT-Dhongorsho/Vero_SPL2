-- Drop the foreign key constraint on creator_id (users are managed by auth-service, not notes-service)
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_creator_id_users_id_fk";
--> statement-breakpoint
-- Change module_id from uuid to text (project-service may use non-UUID module IDs)
ALTER TABLE "documents" ALTER COLUMN "module_id" SET DATA TYPE text USING "module_id"::text;
