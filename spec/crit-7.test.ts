import { describe, expect, inject, it } from "vitest";

// Turns "the core flow persists across a reload" (crit 7's spec) into a
// concrete check for this app's system: ANU room booking. Create a booking,
// reload, and it's still there. Starts red — there's no /api/bookings yet.
const baseUrl = inject("baseUrl");

describe("room booking", () => {
  const room = `spec room ${process.hrtime.bigint()}`;

  // Astro checks form POSTs carry a same-origin Origin header (CSRF
  // protection); browsers send it automatically, a bare fetch doesn't.
  const post = (path: string, body: URLSearchParams) =>
    fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: { origin: baseUrl },
      body,
      redirect: "manual",
    });

  it("accepts a booking", async () => {
    const res = await post(
      "/api/bookings",
      new URLSearchParams({ room, start: "2026-10-01T09:00", end: "2026-10-01T10:00" }),
    );
    expect([200, 201, 303]).toContain(res.status);
  });

  it("persists the booking: a fresh page load still shows it", async () => {
    const res = await fetch(baseUrl);
    expect(await res.text()).toContain(room);
  });
});
