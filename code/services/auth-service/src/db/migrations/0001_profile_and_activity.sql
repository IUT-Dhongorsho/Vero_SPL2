CREATE TABLE "user_activity_days" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"session_count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity_routes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"route" text NOT NULL,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "linkedinUrl" varchar(512);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "githubUsername" varchar(255);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "websiteUrl" varchar(512);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "skills" text;--> statement-breakpoint
ALTER TABLE "user_activity_days" ADD CONSTRAINT "user_activity_days_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_routes" ADD CONSTRAINT "user_activity_routes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_activity_days_user_day_idx" ON "user_activity_days" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "user_activity_days_user_idx" ON "user_activity_days" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_activity_routes_user_route_idx" ON "user_activity_routes" USING btree ("user_id","route");