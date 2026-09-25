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
  it("shows the login form without the yellow demo warning", async () => {
    const page = await fetch(new URL("/login", baseUrl));
    const doc = new JSDOM(await page.text()).window.document;
    expect(doc.querySelector(".login-page > .notice[role='note']")).toBeNull();
    expect(doc.querySelector(".login-card .panel-note")?.textContent).toContain("No verification email is sent");
  });

  it("shows cross-browser reservations for the entered address and no other address", async () => {
    const created = await send("/api/bookings", new URLSearchParams({
      room: "Study Room 1.03", date, time: "09:00", duration: "0.5", people: "1",
      email: emailA,
    }));
    const successUrl = new URL(created.headers.get("location")!, baseUrl);
    expect(successUrl.pathname).toBe("/booking-success");
    expect(successUrl.searchParams.get("notice")).toBe("booked-mail-pending");
    const bookedCookie = sessionCookie(created);
    expect(bookedCookie).toContain("studyspace_demo_session=");
    const successPage = await fetch(successUrl, { headers: { cookie: bookedCookie }, redirect: "manual" });
    expect(successPage.status).toBe(200);
    const successDoc = new JSDOM(await successPage.text()).window.document;
    expect(successDoc.querySelector("h1")?.textContent).toContain("Booking successful");
    expect(successDoc.querySelector(".success-details")?.textContent).toContain("Study Room 1.03");
    expect(successDoc.querySelector(".success-details")?.textContent).toContain(emailA);
    const myBookings = await fetch(new URL("/bookings", baseUrl), { headers: { cookie: bookedCookie }, redirect: "manual" });
    expect(myBookings.status).toBe(200);
    expect(await myBookings.text()).toContain("Study Room 1.03");
    const noSession = await fetch(successUrl, { redirect: "manual" });
    expect(noSession.headers.get("location")).toBe("/login?notice=login-required");
    const conflict = await send("/api/bookings", new URLSearchParams({
      room: "Study Room 1.03", date, time: "09:00", duration: "0.5", people: "1", email: emailB,
    }));
    expect(conflict.headers.get("location")).toContain("notice=conflict");
    expect(sessionCookie(conflict)).toBe("");

    const invalid = await login("name@anu.edu.au");
    expect(invalid.headers.get("location")).toBe("/login?notice=email-invalid");
    expect(sessionCookie(invalid)).toBe("");

    const other = await login(emailB);
    const otherCookie = sessionCookie(other);
    expect(otherCookie).toContain("studyspace_demo_session=");
    const accountPage = await fetch(new URL("/login", baseUrl), { headers: { cookie: otherCookie } });
    const accountDoc = new JSDOM(await accountPage.text()).window.document;
    expect(accountDoc.querySelector('form[action="/api/session"] button')?.textContent?.trim()).toBe("Sign out");
    const otherSuccess = await fetch(successUrl, { headers: { cookie: otherCookie }, redirect: "manual" });
    expect(otherSuccess.headers.get("location")).toBe("/bookings");
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
    }));
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
    expect(new URL(booked.headers.get("location")!, baseUrl).pathname).toBe("/booking-success");
    const page = await fetch(new URL("/bookings", baseUrl), { headers: { cookie } });
    expect(await page.text()).toContain(room);
  });
});
