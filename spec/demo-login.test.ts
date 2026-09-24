import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");
const emailA = "u6666666@anu.edu.au";
const emailB = "u7777777@anu.edu.au";
const date = "2030-11-04";
const send = (path: string, body: URLSearchParams, cookie = "") => fetch(new URL(path, baseUrl), {
  method: "POST", headers: { origin: baseUrl, cookie }, body, redirect: "manual",
});
const sessionCookie = (response: Response) => response.headers.getSetCookie()
  .find((value) => value.startsWith("studyspace_demo_session="))?.split(";")[0] || "";
const login = (email: string) => send("/api/session", new URLSearchParams({ email }));

describe("email-only demo login", () => {
  it("shows cross-browser reservations for the entered address and no other address", async () => {
    const created = await send("/api/bookings", new URLSearchParams({
      room: "Study Room 1.03", date, time: "09:00", duration: "0.5", people: "1",
      email: emailA, confirmEmail: emailA,
    }));
    expect(created.headers.get("location")).toContain("/bookings");
    const guestCookie = created.headers.getSetCookie().find((value) => value.startsWith("studyspace_id="))?.split(";")[0] || "";
    const guestPage = await fetch(new URL("/bookings?notice=booked-mail-pending", baseUrl), {
      headers: { cookie: guestCookie }, redirect: "manual",
    });
    expect(guestPage.status).toBe(302);
    expect(guestPage.headers.get("location")).toBe("/login?notice=booked-mail-pending");

    const invalid = await login("name@anu.edu.au");
    expect(invalid.headers.get("location")).toBe("/login?notice=email-invalid");
    expect(sessionCookie(invalid)).toBe("");

    const other = await login(emailB);
    const otherCookie = sessionCookie(other);
    expect(otherCookie).toContain("studyspace_demo_session=");
    const otherPage = await fetch(new URL("/bookings", baseUrl), { headers: { cookie: otherCookie } });
    expect(await otherPage.text()).not.toContain("Study Room 1.03");

    const sameEmail = await login(emailA.toUpperCase());
    const cookie = sessionCookie(sameEmail);
    expect(cookie).toContain("studyspace_demo_session=");
    expect(sameEmail.headers.get("location")).toBe("/bookings?notice=logged-in");
    const page = await fetch(new URL("/bookings", baseUrl), { headers: { cookie } });
    const doc = new JSDOM(await page.text()).window.document;
    expect(doc.querySelector(".booking-item")?.textContent).toContain("Study Room 1.03");
    expect(doc.querySelector(".bookings-page .notice")?.textContent).toContain(emailA);
    expect(doc.querySelector(".bookings-page .notice")?.textContent).toContain("does not verify identity");

    const guestCancel = await send("/api/bookings", new URLSearchParams({
      action: "cancel", id: doc.querySelector('input[name="id"]')!.getAttribute("value")!,
    }), guestCookie);
    expect(guestCancel.headers.get("location")).toBe("/login?notice=login-required");

    const differentAccountCancel = await send("/api/bookings", new URLSearchParams({
      action: "cancel", id: doc.querySelector('input[name="id"]')!.getAttribute("value")!,
    }), otherCookie);
    expect(differentAccountCancel.status).toBe(303);
    const afterAttempt = await fetch(new URL("/bookings", baseUrl), { headers: { cookie } });
    expect(await afterAttempt.text()).toContain("Study Room 1.03");

    const cancelled = await send("/api/bookings", new URLSearchParams({
      action: "cancel", id: doc.querySelector('input[name="id"]')!.getAttribute("value")!,
    }), cookie);
    expect(cancelled.status).toBe(303);
    const afterCancel = await fetch(new URL("/bookings", baseUrl), { headers: { cookie } });
    expect(await afterCancel.text()).not.toContain("Study Room 1.03");

    const logout = await send("/api/session", new URLSearchParams({ action: "logout" }), cookie);
    expect(logout.headers.get("location")).toBe("/login?notice=logged-out");
    const oldSession = await fetch(new URL("/login", baseUrl), { headers: { cookie } });
    expect(await oldSession.text()).not.toContain("You're using");
  });

  it("uses the logged-in email for new reservations, even if a different email is submitted", async () => {
    const cookie = sessionCookie(await login(emailA));
    const room = "Law Study Room 2";
    const base = { room, date, time: "14:00", duration: "0.5", people: "1" };
    const mismatch = await send("/api/bookings", new URLSearchParams({ ...base, email: emailB }), cookie);
    expect(mismatch.headers.get("location")).toContain("notice=email-mismatch");
    const booked = await send("/api/bookings", new URLSearchParams(base), cookie);
    expect(booked.headers.get("location")).toBe("/bookings?notice=booked-mail-pending");
    const page = await fetch(new URL("/bookings", baseUrl), { headers: { cookie } });
    expect(await page.text()).toContain(room);
  });
});
