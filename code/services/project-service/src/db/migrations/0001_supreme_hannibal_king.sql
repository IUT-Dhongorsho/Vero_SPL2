CREATE TABLE "module_members" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" text NOT NULL,
	"user_id" text NOT NULL,
	"project_member_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "status" varchar(50) DEFAULT 'on-track' NOT NULL;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "chat_resource_id" text;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "board_resource_id" text;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "notes_resource_id" text;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "signaling_resource_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status" varchar(50) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "module_members" ADD CONSTRAINT "module_members_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_members" ADD CONSTRAINT "module_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_members" ADD CONSTRAINT "module_members_project_member_id_project_members_id_fk" FOREIGN KEY ("project_member_id") REFERENCES "public"."project_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "workspace_id";