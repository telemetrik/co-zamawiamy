CREATE TABLE "options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"label" varchar(60) NOT NULL,
	"label_key" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "option_unique_label" UNIQUE("poll_id","label_key"),
	CONSTRAINT "option_unique_position" UNIQUE("poll_id","position"),
	CONSTRAINT "option_position_range" CHECK ("options"."position" >= 0 AND "options"."position" < 5),
	CONSTRAINT "option_label_not_empty" CHECK (length(trim("options"."label")) > 0)
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creation_token" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"question" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "polls_creation_token_unique" UNIQUE("creation_token"),
	CONSTRAINT "poll_question_not_empty" CHECK (length(trim("polls"."question")) > 0)
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_option_id_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vote_option_idx" ON "votes" USING btree ("option_id");