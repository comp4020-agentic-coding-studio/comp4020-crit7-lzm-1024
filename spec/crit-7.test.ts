import { describe, expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");
const room = "Study Room 1.01";
const selection = new URLSearchParams({ room, date: "2030-10-01", time: "09:00", duration: "2", people: "4" });
const email = "u1111111@anu.edu.au";

let cookie = "";
const post = (body: URLSearchParams, withOwner = true) => {
  const requestBody = new URLSearchParams(body);
  if (requestBody.get("action") !== "cancel") {
    requestBody.set("email", email);
    requestBody.set("confirmEmail", email);
  }
  return fetch(new URL("/api/bookings", baseUrl), {
    method: "POST", headers: { origin: baseUrl, ...(withOwner && cookie ? { cookie } : {}) }, body: requestBody, redirect: "manual",
  });
};

describe("library booking journey", () => {
  it("creates a reservation that survives a new page load", async () => {
    const result = await post(selection);
    expect(result.status).toBe(303);
    expect(result.headers.get("location")).toContain("/bookings");
    cookie = result.headers.get("set-cookie")?.split(";")[0] || "";
    expect(cookie).toContain("studyspace_id=");
    const guest = await fetch(new URL("/bookings", baseUrl), { headers: { cookie }, redirect: "manual" });
    expect(guest.headers.get("location")).toBe("/login");
    const loggedIn = await fetch(new URL("/api/session", baseUrl), {
      method: "POST", headers: { origin: baseUrl }, body: new URLSearchParams({ email }), redirect: "manual",
    });
    cookie = loggedIn.headers.getSetCookie().find((value) => value.startsWith("studyspace_demo_session="))?.split(";")[0] || "";
    expect(cookie).toContain("studyspace_demo_session=");

    const page = await fetch(new URL("/bookings", baseUrl), { headers: { cookie } });
    expect(await page.text()).toContain(room);
  });

  it("rejects an overlapping booking and frees the time after cancellation", async () => {
    const conflict = await post(new URLSearchParams({ room, date: "2030-10-01", time: "10:00", duration: "1", people: "4" }), false);
    expect(conflict.headers.get("location")).toContain("notice=conflict");

    const page = await fetch(new URL("/bookings", baseUrl), { headers: { cookie } });
    const html = await page.text();
    const id = html.match(/name="id" value="(\d+)"/)?.[1];
    expect(id).toBeTruthy();
    const cancelled = await post(new URLSearchParams({ action: "cancel", id: id! }));
    expect(cancelled.status).toBe(303);
    const retry = await post(selection);
    expect(retry.headers.get("location")).toContain("/bookings");
  });
});
