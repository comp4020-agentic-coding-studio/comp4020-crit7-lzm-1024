export function anuEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return /^u[0-9]{7}@anu\.edu\.au$/.test(normalized) ? normalized : null;
}

interface Confirmation {
  bookingId: number;
  email: string;
  room: string;
  library: string;
  date: string;
  start: string;
  end: string;
}

export async function sendBookingConfirmation(booking: Confirmation): Promise<"sent" | "unconfigured" | "failed"> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;
  if (!key || !from) return "unconfigured";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `studyspace-booking-${booking.bookingId}`,
      },
      body: JSON.stringify({
        from,
        to: [booking.email],
        subject: "StudySpace demo booking confirmation",
        text: `Your StudySpace demo booking is confirmed.\n\n${booking.room} · ${booking.library} Library\n${booking.date}, ${booking.start}–${booking.end} (Canberra time)\n\nThis is a student prototype. It does not reserve an ANU Library room.`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) return "sent";
    console.error("Booking confirmation email rejected by Resend", response.status);
    return "failed";
  } catch {
    console.error("Booking confirmation email request failed");
    return "failed";
  }
}
