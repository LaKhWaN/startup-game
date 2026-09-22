# Security Policy

## Reporting a vulnerability

**Please don't open a public issue for a security problem.**

Report it privately through GitHub's [Report a vulnerability](https://github.com/LaKhWaN/startup-game/security/advisories/new) form, which opens a draft advisory only the maintainer can see.

Expect an acknowledgement within a week. This is a hobby project maintained by one person, so please be patient — but do follow up if you hear nothing.

Include what you'd need to reproduce it: the affected route or file, the steps, and what an attacker gains.

## Scope

In scope: this repository, and the deployed site at https://failunicorn.vercel.app.

Out of scope:
- Anything requiring physical access to a player's device
- Denial of service through sheer traffic volume
- Reports from automated scanners with no demonstrated impact

## A known limitation, by design

This is a client-side browser game with no user accounts. Two consequences are worth stating plainly rather than being reported as findings:

**Scores are not trustworthy.** Game state lives in the browser and is posted to the analytics endpoint from there. Anyone can edit it. The leaderboard reflects what clients reported, not verified play. Treat it as decoration.

**`VITE_`-prefixed environment variables are public.** Vite inlines them into the client bundle at build time, so anyone can read them from the deployed JavaScript. Never put a database URI, an API key, or anything else genuinely secret behind a `VITE_` variable; those belong in server-only variables read by `api/` and `server/`.

The Gemini API key follows that rule: it is `GEMINI_API_KEY`, with no prefix, read only by `/api/rate-idea`. The browser sends an operation name and an idea string to that route and never sees the key. The prompts are built server-side too, so the route can't be used as an open proxy to the model.

`VITE_ANALYTICS_INGEST_SECRET` is still a `VITE_` variable and so is readable in the bundle. It only guards the analytics ingest route, where the worst case is junk data rather than cost, but it is not a secret in any meaningful sense.
