# Fail Unicorn — Marketing & Tracking Guide

> Generated: 2026-03-27 | URL: https://failunicorn.vercel.app

---

## What Your Game Is

**Fail Unicorn** is a browser-based startup simulator where players build a SaaS company, manage burn rate, hire team members, and try to reach $10k MRR before going bankrupt. Runs take 20–40 minutes. Free, no install, AI-powered.

---

## Your Niche Audience

| Audience | Why they'd play |
|---|---|
| **Indie hackers / solo founders** | It mirrors their reality — churn, runway, burn |
| **Aspiring entrepreneurs** | Learn startup mechanics in a safe sandbox |
| **CS/MBA students** | Startup economics without the risk |
| **Product managers** | Understand tradeoffs (features vs. tech debt) |
| **"I want to start a startup someday" people** | Huge and underserved segment |

Your game teaches real SaaS concepts by making them feel. That's your hook.

---

## Free Marketing Strategies (Priority Order)

### 1. Post on Indie Hacker Communities (Do This First)

**Where:** IndieHackers.com, r/indiehackers, r/startups, r/SideProject

**What to post:**
> "I built a startup simulator that uses real SaaS economics — churn, burn rate, runway. Curious if founders find it realistic. Would love brutal feedback."

- Don't pitch. Ask for feedback. Indie hackers love tearing things apart.
- Post your own "run story" as content (e.g., "I went bankrupt on Day 47 because I ignored churn")

**Expected outcome:** 50–200 early users, genuine feedback, potential viral thread

---

### 2. Reddit — Target the Right Subreddits

Post authentically in:
- `r/startups` — "I made a game that simulates startup life. It's brutally realistic."
- `r/gamedev` — Show the Phaser office scene, talk tech
- `r/cscareerquestions` — "Built this to understand how startups work before joining one"
- `r/Entrepreneur`
- `r/SideProject`

**Rule:** Each post should feel native to that subreddit. Don't copy-paste.

---

### 3. Product Hunt Launch (Plan for ~2 weeks out)

Product Hunt gets you 500–2000 visitors in one day if done right.

**To prepare:**
- Write a clear tagline: *"Build a startup. Hire a team. Don't go bankrupt."*
- Make a short GIF/screen recording showing gameplay
- Get 5–10 friends to upvote on launch day (first 2 hours matter most)
- Launch on Tuesday or Wednesday

---

### 4. Twitter/X — Founder Content

Post a thread like:
> "I built a startup simulator. Here's what I learned about real SaaS metrics by building it: 🧵"
> 1/ Churn kills you faster than you think...
> 2/ Runway is everything...

Tag it with `#buildinpublic` and `#indiedev`. This audience is huge and shares freely.

Also post your own "losing run" as a story — loss content performs better than win content.

---

### 5. Build in Public (Ongoing)

Document your journey of building and growing the game:
- Weekly posts: "X users this week, here's what happened"
- Share analytics screenshots
- Share what features you're building next

Platforms: Twitter/X, IndieHackers, LinkedIn

This creates an audience that's invested in your success and becomes your first word-of-mouth engine.

---

### 6. YouTube / TikTok Shorts — "Startup in 60 seconds"

Record a 60-second screen capture of a run — show the stress of runway running out. No face cam needed. Caption it: *"I went bankrupt on day 47 because I hired too fast"*

Short-form video with a story hook can reach tens of thousands organically.

---

## Tracking Setup (Free Tools Only)

You already have MongoDB analytics — build on that.

### A. Add Umami Analytics (Free, Privacy-first)

**Umami** is the best free option — self-hostable, open source.
- Sign up at `umami.is` (free cloud tier)
- Add one `<script>` tag to your `index.html`
- Tracks: page views, unique visitors, referrers, countries, devices

This tells you **where traffic comes from** (Reddit? Product Hunt? Direct?)

### B. Track Key Game Events (You Already Have MongoDB)

Add these events to your existing `src/analytics/mongoIngest.ts`:

| Event | What it tells you |
|---|---|
| `game_started` | How many people actually play |
| `game_day_reached` (Day 7, 30) | How far players get |
| `game_ended` (win/loss + reason) | Common failure points |
| `tab_clicked` (product/team/gtm) | Which features are used |
| `speed_changed` | Player engagement level |

This lets you see: are people dropping off immediately, or playing full runs?

### C. Add a Share Button After Game Over

On the PostMortem screen, add a pre-filled tweet button:
> "I built [startup name] to $X MRR in [N] days before going bankrupt. Try it: failunicorn.vercel.app"

This is your viral loop — every loss becomes free marketing.

---

## 7-Day Action Plan

| Day | Action |
|---|---|
| Day 1 | Post on IndieHackers + r/SideProject |
| Day 2 | Post on r/startups + r/Entrepreneur |
| Day 3 | Write a Twitter thread about the game |
| Day 4 | Set up Umami analytics (30 min) |
| Day 5 | Add share button to PostMortem screen |
| Day 6 | Add `game_started`/`game_ended` tracking events |
| Day 7 | Plan Product Hunt launch for next week |

---

## Your Core Advantage

> You built something that teaches real startup mechanics by making failure feel personal — that's inherently shareable, and your target audience (indie hackers, founders, CS students) is concentrated in a handful of free platforms.

---

## Next Steps (When Ready)

- Implement the share button on `PostMortem.tsx`
- Add tracking events to `src/analytics/mongoIngest.ts`
- Write Reddit/IndieHackers post copy
