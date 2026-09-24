# StudySpace

StudySpace is a student concept for a clearer ANU Library booking experience across Chifley, Hancock, Menzies and Law. Students choose a library, date, start and end time, space type and group size. The search lists rooms free for that whole range; the room page lets them select each 30-minute booking block. It is a **demo**: it does not connect to ANU LibCal or create real library reservations.

## What good looks like here

When no room fits the exact range, the search says so and recommends nearby available ranges, including shorter ones. Recommendations lead back to a fresh result list with the suggested time and its actual duration. Search ranges use 30-minute increments and may be up to two hours. The timetable remains below the results and keeps occupied rooms visible. Available slots use a pale gold background and plus sign, booked slots use grey stripes and a cross, and the current visitor's bookings use dark blue. Exact booked intervals appear beside each room. On a room page, each selected block adds 30 minutes, up to two hours. Mobile uses expandable room schedules with explicit time labels. Demo booking hours are 08:00–22:00, not verified library opening hours.

The core journey is timetable → room details → confirmation → email-only demo login → my bookings. SQLite stores reservations on Fly's persistent volume. A database transaction checks conflicts and the two-hour daily allowance for the ANU email across all rooms. Cancelled times free that allowance. Students enter the address twice when booking without a demo session; the server accepts only `u` followed by seven digits at `anu.edu.au`. This checks the format and matching entries, not ownership of the inbox. Opening My bookings without a demo session redirects to the login page, including after a guest booking; cancellation also requires a demo session. A browser cookie still marks guest bookings on that browser's timetable. The email-only demo login creates an opaque, expiring session and lists all active reservations for that email, including those made in other browsers. It **does not verify email ownership**: anyone who knows an address can view and cancel its prototype bookings. Do not use this login design for real users or sensitive booking data; production would require an emailed code or link (or ANU SSO). Room names and capacities follow supplied LibCal screenshots, but the catalogue is partial and not an authoritative facilities directory. Availability comes only from reservations in this prototype. Mt Stromlo's test location is deliberately excluded.

The visual treatment uses black, white and restrained gold based on the [ANU colour guide](https://webpublishing.anu.edu.au/web-style-guide/colours). The header image is sourced from the [ANU Library LibCal banner](https://dtvrvhzaa8b2y.cloudfront.net/data/headers/4797/ANU_Library_Banner_2025.png); the prominent prototype notice makes clear this is not an official service.

The built server checks the booking journey in `spec/crit-7.test.ts`, multi-library availability and cancellation ownership in `spec/availability.test.ts`, and general routes and accessibility in `spec/invariants.test.ts`. Desktop and mobile layouts also need visual inspection.

## Run locally

```sh
pnpm install
pnpm dev
```

Run `pnpm check` before deployment. The SQLite file defaults to `.data/app.db`; on Fly it lives at `/data/app.db`.

## Booking confirmation emails

The server can submit plain-text confirmation emails through [Resend's email API](https://resend.com/docs/api-reference/emails/send-email). Configure these server environment variables before expecting delivery:

- `RESEND_API_KEY`: a Resend API key with permission to send email.
- `BOOKING_EMAIL_FROM`: a sender address on a domain you control and have verified in Resend, such as `StudySpace <bookings@your-domain.example>`.

Set them as Fly secrets for `comp4020-crit7-lzm-1024` when ready; never put the key in a tracked file or browser code. Until both variables are configured, demo bookings still work and the confirmation page clearly says no email was sent. If Resend rejects a request, the booking remains recorded and the page reports that the email failed. The test server explicitly disables sending, so automated checks cannot email real students. A verified sending domain is required to email arbitrary ANU recipients; the Resend test sender is insufficient for that.
