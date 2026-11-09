import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  creationToken: uuid("creation_token").notNull().unique(),
  requestHash: varchar("request_hash", { length: 64 }).notNull(),
  question: varchar("question", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("poll_question_not_empty", sql`length(trim(${table.question})) > 0`)]);

export const options = pgTable("options", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 60 }).notNull(),
  labelKey: text("label_key").notNull(),
  position: integer("position").notNull(),
}, (table) => [
  unique("option_unique_label").on(table.pollId, table.labelKey),
  unique("option_unique_position").on(table.pollId, table.position),
  check("option_position_range", sql`${table.position} >= 0 AND ${table.position} < 5`),
  check("option_label_not_empty", sql`length(trim(${table.label})) > 0`),
]);

export const votes = pgTable("votes", {
  // Losowy identyfikator operacji, bez tożsamości uczestnika.
  id: uuid("id").primaryKey(),
  optionId: uuid("option_id").notNull().references(() => options.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("vote_option_idx").on(table.optionId)]);
