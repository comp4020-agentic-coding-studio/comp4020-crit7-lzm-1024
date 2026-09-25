# Process overview

## What I built

StudySpace is a full-stack student prototype for finding and booking library spaces across Chifley, Hancock, Menzies and Law. It is deliberately separate from ANU LibCal: its availability and reservations belong only to this demo.

## How I got here

I carried forward the working rules in `CLAUDE.md` ([`ccf728b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-lzm-1024/commit/ccf728b)) and began with a persistence test for creating, conflicting with and cancelling a booking ([`38003ae`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-lzm-1024/commit/38003ae)). The first implementation put the catalogue, SQLite transaction, login and timetable together ([`bc0a7bc`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-lzm-1024/commit/bc0a7bc)). That large commit made the prototype runnable, but gave a thinner history than smaller, decision-by-decision commits would have.

Testing the rendered site exposed a more important problem than visual fidelity: a selected time could disappear between the timetable and room page, and a guest who had already entered an email had to enter it again. The feedback was concrete:

> 我点了这个之后跳转页面 没有保持我刚才的选项

> 我现在遇到一个情况 我现在未登录 我预定之后提示我输入邮箱 我输入完 现在跳转到登陆界面让我在登陆一次

I made selected duration part of the room link, kept half-hour editing on the detail page, and created the demo session only after the booking transaction succeeds ([`4ee1f4e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-lzm-1024/commit/4ee1f4e)). HTTP tests now exercise the built server with a disposable database, including conflicts, daily limits, cross-account access and the success page. `pnpm check` provides automated backpressure; screenshots and the deployed site exposed interaction gaps the tests initially missed. I also replaced CI's obsolete SSE probe with checks of real booking routes and form origins. Email-only sign-in still does **not** verify inbox ownership, so the app remains explicitly a prototype.
