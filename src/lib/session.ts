import { createHash, randomBytes } from "node:crypto";
import type { AstroCookies } from "astro";
import { createDemoSession, deleteDemoSession, demoSessionEmail } from "./db";

const name = "studyspace_demo_session";
const maxAge = 60 * 60 * 24 * 30;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export function currentDemoEmail(cookies: AstroCookies): string | null {
  const token = cookies.get(name)?.value || "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return demoSessionEmail(hash(token));
}

export function beginDemoSession(cookies: AstroCookies, email: string, request: Request): void {
  const oldToken = cookies.get(name)?.value;
  if (oldToken && /^[A-Za-z0-9_-]{43}$/.test(oldToken)) deleteDemoSession(hash(oldToken));
  const token = randomBytes(32).toString("base64url");
  createDemoSession(hash(token), email, Date.now() + maxAge * 1000);
  cookies.set(name, token, {
    path: "/", httpOnly: true, sameSite: "lax",
    secure: new URL(request.url).protocol === "https:", maxAge,
  });
}

export function endDemoSession(cookies: AstroCookies): void {
  const token = cookies.get(name)?.value;
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) deleteDemoSession(hash(token));
  cookies.delete(name, { path: "/" });
}
