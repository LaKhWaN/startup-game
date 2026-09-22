# Security Policy

## Reporting a vulnerability

**Please don't open a public issue for a security problem.**

Report it privately through GitHub's [Report a vulnerability](https://github.com/LaKhWaN/startup-game/security/advisories/new) form, which opens a draft advisory only the maintainer can see.

Expect an acknowledgement within a week. This is a hobby project maintained by one person, so please be patient — but do follow up if you hear nothing.

Include what you'd need to reproduce it: the affected route or file, the steps, and what an attacker gains.

## Scope

In scope: this repository, and failunicorn.com.

Out of scope:
- Anything requiring physical access to a player's device
- Denial of service through sheer traffic volume
- Reports from automated scanners with no demonstrated impact

## A known limitation, by design

This is a client-side browser game with no user accounts. Two consequences are worth stating plainly rather than being reported as findings:

**Scores are not trustworthy.** Game state lives in the browser and is posted to the analytics endpoint from there. Anyone can edit it. The leaderboard reflects what clients reported, not verified play. Treat it as decoration.

**`VITE_`-prefixed environment variables are public.** Vite inlines them into the client bundle at build time, so anyone can read them from the deployed JavaScript. `VITE_GEMINI_API_KEY` is one of these — if you deploy your own instance, restrict that key by HTTP referrer in the Google Cloud console and set a quota cap. Never put a database URI or anything else genuinely secret behind a `VITE_` variable; those belong in server-only variables read by `api/` and `server/`.

Moving the Gemini call behind a server route is a known improvement, and a welcome PR.
