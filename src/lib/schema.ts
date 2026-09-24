import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.
export const messages = sqliteTable("messages", {
  id: int().primaryKey({ autoIncrement: true }),
  body: text().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Message = typeof messages.$inferSelect;

export const bookings = sqliteTable("bookings", {
  id: int().primaryKey({ autoIncrement: true }),
  owner: text().notNull().default(""),
  email: text().notNull().default(""),
  room: text().notNull(),
  start: text().notNull(),
  end: text().notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  cancelledAt: text("cancelled_at"),
});

export type Booking = typeof bookings.$inferSelect;

// Opaque browser sessions for the deliberately email-only demo login.
// The token itself never goes into the database or a URL.
export const demoSessions = sqliteTable("demo_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  email: text().notNull(),
  expiresAt: int("expires_at").notNull(),
});
