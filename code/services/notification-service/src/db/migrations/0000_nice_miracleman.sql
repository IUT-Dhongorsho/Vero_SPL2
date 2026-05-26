CREATE TABLE "notification_delivery_log" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" text NOT NULL,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"failure_reason" text,
	"attempted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"group_window_id" text,
	"actor_ids" text[] DEFAULT '{}' NOT NULL,
	"actor_count" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"resource_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_grouped" boolean DEFAULT false NOT NULL,
	"email_sent_at" timestamp,
	"push_sent_at" timestamp,
	"scheduled_for" timestamp,
	"fired_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text,
	"auth_key" text,
	"device_label" text,
	"created_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bullmq_job_id" text NOT NULL,
	"notification_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"target_user_id" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "scheduled_jobs_bullmq_job_id_unique" UNIQUE("bullmq_job_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"email" text NOT NULL,
	"synced_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notification_delivery_log" ADD CONSTRAINT "notification_delivery_log_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_group_lookup" ON "notifications" USING btree ("user_id","type","entity_id","created_at" DESC NULLS LAST) WHERE is_grouped = true;