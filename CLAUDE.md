# Your harness

This file is yours, and it arrives empty on purpose. The rules you hold the
agent to are part of what gets marked, so they should be rules you decided on.

Nothing about the starter is recorded here. What the repo ships is explained
where it lives --- `fly.toml`, the `Dockerfile`, the CI workflow and
`spec/README.md` each say what they fix --- and the
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec. Read them before you plan or build;
what the agent needs to carry from any of it is your call.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make
  them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state.

### Project-specific engineering rules

Carried forward from crit 2 through assignment 2, minus the rules and gotchas
tied to that build's specific theme and content model (this repo has no
shared theme package and no fixed component library --- it's a bare Astro +
Drizzle + SQLite scaffold). What's left held up across five different builds
and is worth holding the agent to again.

- **Separate structure from presentation.** Content and document structure
  belong in markup and frontmatter; visual presentation belongs in scoped
  `<style>` blocks or shared tokens/global styles. Do not use inline `style`
  attributes or presentational markup to work around a component's styles.
- **Use small reusable components.** Reuse existing components for repeated
  ideas rather than duplicating markup across pages. Add a new component only
  when a pattern is repeated or has a distinct meaning.
- **Use design tokens for repeated visual decisions.** Shared colours,
  spacing, type scale, radius, elevation, and motion durations/easings belong
  in shared tokens/global styles, not scattered as unexplained near-duplicate
  values in individual components.
- **Make content and markup readable.** Use semantic elements, descriptive
  frontmatter, correctly associated form labels where relevant, useful image
  `alt` text, and concise headings. Keep indentation consistent. Comments
  should explain a non-obvious decision or constraint, not repeat what the
  code already says.
- **Change the smallest coherent unit.** Before editing, inspect the relevant
  content, its shared components/styles, and the tests that express its
  contract. Avoid broad rewrites for a local change. When a shared component
  or pattern changes, verify every page that uses it at desktop and mobile
  sizes.
- **Prefer evidence over assumptions.** After a meaningful change, run
  `pnpm check`, then inspect the rendered result at 1920x1080 and 390x844 in
  a real browser. Check focus visibility, text contrast, overflow,
  navigation, image loading, and form labels. A green test suite does not
  replace visual inspection.
- **Do not over-engineer.** Do not create utility layers, naming systems,
  generators, or abstractions for a single use. Duplication is worth removing
  when it represents a stable shared concept; two superficially similar
  blocks may remain separate when combining them would make either one
  harder to understand or change.
- **Verify interaction states, not only initial screenshots.** At 1920x1080
  and 390x844, actually navigate the app, resize during an interaction, tab
  through links and controls with the keyboard, and confirm feedback remains
  understandable without colour alone. JSDOM/build-time tests alone do not
  satisfy this --- look at the rendered result in a real browser.
- **Make timing and motion explicit.** Where anything has a built-in delay
  or transition, disclose it rather than leaving it to be discovered.
  Meaningful content and feedback must remain usable under
  `prefers-reduced-motion: reduce`.
- **Keep the CI probes tied to the shipped app.** When a starter endpoint is
  removed, replace its deploy check with a read-only check of a real journey.
  Test the exact expected status, not merely the absence of one error code.
- **Treat reservation and session creation as separate outcomes.** Only begin
  the demo session after the booking transaction succeeds; test that invalid
  details and conflicts never sign a guest in. Check that a success URL cannot
  expose another email's booking.

## The checks

`pnpm check` runs them, and `pnpm check:evidence` is the extra gate before you
ship. CI runs the same plus links, secrets and the deploy.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo
and say what they are for.

## This file is yours

A starting point, not a rulebook: what you add to it is the harness, and the
harness is assessed. This file and the sensors you wire into `check` carry
across the course --- both come with you into next week's repo. The
prototype doesn't: source, and the tests answering this week's published
spec, stay behind.
