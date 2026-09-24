import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { asc, and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Booking, type Message, bookings, messages } from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

export type { Message };

export function listMessages(): Message[] {
  return db.select().from(messages).orderBy(desc(messages.id)).limit(50).all();
}

export function addMessage(body: string): Message {
  return db.insert(messages).values({ body }).returning().get();
}

export type { Booking };

export function dayBookings(date: string, owner: string, email = "") {
  const rows = client.prepare('SELECT room, start, "end", ((? <> \'\' AND email = ?) OR (? <> \'\' AND owner = ?)) AS mine FROM bookings WHERE cancelled_at IS NULL AND start < ? AND "end" > ? ORDER BY start')
    .all(email, email, owner, owner, `${date}T23:59`, `${date}T00:00`) as { room: string; start: string; end: string; mine: number }[];
  return rows.map((row) => ({ ...row, mine: Boolean(row.mine) }));
}

export function listBookings(owner: string): Booking[] {
  if (!owner) return [];
  return db.select().from(bookings).all().filter((booking) => booking.owner === owner && !booking.cancelledAt);
}

export function listBookingsByEmail(email: string): Booking[] {
  return db.select().from(bookings)
    .where(and(eq(bookings.email, email), isNull(bookings.cancelledAt)))
    .orderBy(asc(bookings.start)).all();
}

export function isAvailable(room: string, start: string, end: string): boolean {
  const overlap = client.prepare(`SELECT 1 FROM bookings
    WHERE room = ? AND cancelled_at IS NULL AND start < ? AND "end" > ? LIMIT 1`)
    .get(room, end, start);
  return !overlap;
}

// The availability and daily allowance checks share the insert's write lock.
// This also covers simultaneous bookings from different browsers using one email.
const insertBooking = client.transaction((owner: string, email: string, room: string, start: string, end: string) => {
  if (!isAvailable(room, start, end)) return { status: "conflict" as const };
  const date = start.slice(0, 10);
  const minuteOfDay = (value: string) => Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
  const existing = client.prepare('SELECT start, "end" FROM bookings WHERE email = ? AND cancelled_at IS NULL AND start >= ? AND start < ?')
    .all(email, `${date}T00:00`, `${date}T23:59`) as { start: string; end: string }[];
  const usedMinutes = existing.reduce((sum, booking) => sum + minuteOfDay(booking.end) - minuteOfDay(booking.start), 0);
  if (usedMinutes + minuteOfDay(end) - minuteOfDay(start) > 120) return { status: "daily-limit" as const };
  const inserted = client.prepare('INSERT INTO bookings (owner, email, room, start, "end") VALUES (?, ?, ?, ?, ?)')
    .run(owner, email, room, start, end);
  return { status: "booked" as const, id: Number(inserted.lastInsertRowid) };
});

export function bookRoom(owner: string, email: string, room: string, start: string, end: string) {
  return insertBooking.immediate(owner, email, room, start, end);
}

export function cancelBooking(owner: string, id: number): void {
  client.prepare("UPDATE bookings SET cancelled_at = datetime('now') WHERE id = ? AND owner = ? AND cancelled_at IS NULL")
    .run(id, owner);
}

export function cancelBookingForEmail(email: string, id: number): void {
  client.prepare("UPDATE bookings SET cancelled_at = datetime('now') WHERE id = ? AND email = ? AND cancelled_at IS NULL")
    .run(id, email);
}

export function createDemoSession(tokenHash: string, email: string, expiresAt: number): void {
  client.prepare("DELETE FROM demo_sessions WHERE expires_at <= ?").run(Date.now());
  client.prepare("INSERT INTO demo_sessions (token_hash, email, expires_at) VALUES (?, ?, ?)")
    .run(tokenHash, email, expiresAt);
}

export function demoSessionEmail(tokenHash: string): string | null {
  const row = client.prepare("SELECT email FROM demo_sessions WHERE token_hash = ? AND expires_at > ?")
    .get(tokenHash, Date.now()) as { email: string } | undefined;
  return row?.email ?? null;
}

export function deleteDemoSession(tokenHash: string): void {
  client.prepare("DELETE FROM demo_sessions WHERE token_hash = ?").run(tokenHash);
}
