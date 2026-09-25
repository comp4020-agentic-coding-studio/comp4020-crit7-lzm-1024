# StudySpace checks

`pnpm check` typechecks the project, builds the same server artefact used by Fly,
then runs Vitest against that server over HTTP. `global-setup.ts` gives the
server a disposable SQLite database and disables outbound confirmation email.
No test booking touches the deployed app or its persistent volume.

`crit-7.test.ts` protects the create, reload, conflict and cancellation journey.
`availability.test.ts` checks the four-library catalogue, exact and nearby
search ranges, 30-minute selections, booking limits and timetable ownership.
`demo-login.test.ts` checks the email-only session, automatic sign-in after a
successful booking, the success page, access to My bookings, account isolation
and logout. `readme.test.ts` ensures `/readme/` serves the full README.

`invariants.test.ts` checks the routes listed in `routes.ts` for basic document
structure and an axe-core accessibility floor. It samples one timetable room
per library in each responsive grid to keep the repeated-slot scan tractable.
The protected success page is exercised with an authenticated session in
`demo-login.test.ts`; an unauthenticated fetch must redirect to login. JSDOM
cannot judge rendered layout or contrast, so desktop and phone still need
manual browser checks.

Before shipping, run `pnpm check:evidence` too. It checks that `PROCESS.md`
cites real commits and that `reflections/crit-7.md` exists. Once the repo is
public, CI runs both gates, deploys, checks the live entry pages and form
origins, and scans internal links and committed secrets.
