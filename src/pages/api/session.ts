import type { APIRoute } from "astro";
import { anuEmail } from "../../lib/email";
import { beginDemoSession, endDemoSession } from "../../lib/session";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  if (form.get("action") === "logout") {
    endDemoSession(cookies);
    return redirect("/login?notice=logged-out", 303);
  }
  const email = anuEmail(String(form.get("email") ?? ""));
  if (!email) return redirect("/login?notice=email-invalid", 303);
  cookies.delete("studyspace_id", { path: "/" });
  beginDemoSession(cookies, email, request);
  return redirect("/bookings?notice=logged-in", 303);
};
