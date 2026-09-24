import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { bookRoom, cancelBookingForEmail } from "../../lib/db";
import { anuEmail, sendBookingConfirmation } from "../../lib/email";
import { durations, endFor, rooms, slots, sydneyNowTime, sydneyToday, validDate } from "../../lib/rooms";
import { currentDemoEmail } from "../../lib/session";

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const form = await request.formData();
  const action = String(form.get("action") ?? "book");
  const owner = cookies.get("studyspace_id")?.value;
  const demoEmail = currentDemoEmail(cookies);

  if (action === "cancel") {
    if (!demoEmail) return redirect("/login?notice=login-required", 303);
    const id = Number(form.get("id"));
    if (Number.isSafeInteger(id) && id > 0) cancelBookingForEmail(demoEmail, id);
    return redirect("/bookings?notice=cancelled", 303);
  }

  const room = String(form.get("room") ?? "");
  const date = String(form.get("date") ?? "");
  const time = String(form.get("time") ?? "");
  const duration = Number(form.get("duration"));
  const people = Number(form.get("people") ?? "1");
  const selected = rooms.find((candidate) => candidate.id === room);
  const search = new URLSearchParams({ date, time, duration: String(duration), people: String(people), library: selected?.library || 'Chifley' });
  const returnTo = `/?${search.toString()}`;
  const detailReturn = selected ? `/rooms/${encodeURIComponent(selected.id)}?${new URLSearchParams({ date, time, people: String(people), picked: '1', pickDuration: String(duration) })}` : returnTo;

  if (!selected || !validDate(date) || date < sydneyToday() ||
      (date === sydneyToday() && time <= sydneyNowTime()) ||
      !slots().includes(time) || !durations.includes(duration) ||
      !Number.isInteger(people) || people < 1 || people > selected.capacity ||
      endFor(date, time, duration).slice(11) > "22:00") {
    return redirect(`${returnTo}&notice=invalid`, 303);
  }

  const submittedEmail = anuEmail(String(form.get("email") ?? ""));
  if (demoEmail && submittedEmail && submittedEmail !== demoEmail) return redirect(`${detailReturn}&notice=email-mismatch`, 303);
  const email = demoEmail || submittedEmail;
  if (!email) return redirect(`${detailReturn}&notice=email-invalid`, 303);
  if (!demoEmail) {
    const confirmedEmail = anuEmail(String(form.get("confirmEmail") ?? ""));
    if (!confirmedEmail) return redirect(`${detailReturn}&notice=email-invalid`, 303);
    if (email !== confirmedEmail) return redirect(`${detailReturn}&notice=email-mismatch`, 303);
  }

  const start = `${date}T${time}`;
  const end = endFor(date, time, duration);
  const bookingOwner = demoEmail ? "" : owner || randomUUID();
  const result = bookRoom(bookingOwner, email, room, start, end);
  if (result.status === "daily-limit") return redirect(`${detailReturn}&notice=daily-limit`, 303);
  if (result.status === "conflict") {
    return redirect(`${returnTo}&notice=conflict`, 303);
  }
  if (!demoEmail && !owner) cookies.set("studyspace_id", bookingOwner, { path: "/", httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", maxAge: 60 * 60 * 24 * 90 });
  const mail = await sendBookingConfirmation({ bookingId: result.id, email, room: selected.name, library: selected.library, date, start: time, end: end.slice(11) });
  return redirect(`/bookings?notice=${mail === "sent" ? "booked" : mail === "unconfigured" ? "booked-mail-pending" : "booked-mail-failed"}`, 303);
};
