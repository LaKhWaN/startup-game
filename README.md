<div align="center">

# failunicorn

**A startup simulator where you probably die.**

Start alone in your bedroom with $500. Hire a team, ship features, keep your people from quitting, and climb from a bedroom to your own building before the cash hits zero. Most players don't.

[Play it](https://failunicorn.vercel.app) · [Blog](https://failunicorn.vercel.app/blog) · [Leaderboard](https://failunicorn.vercel.app/leaderboard) · [Idea Rater](https://failunicorn.vercel.app/tools/startup-idea-rater)

[![CI](https://github.com/LaKhWaN/startup-game/actions/workflows/ci.yml/badge.svg)](https://github.com/LaKhWaN/startup-game/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-D4A373.svg)](LICENSE)

<br />

<img src="docs/images/07-building.jpg" alt="A 50-person startup in its own building: rows of desks with people working, the founder's corner and a lounge, with MRR, cash, burn and churn in the top bar" width="900" />

</div>

---

## What it is

A browser game. You describe a startup idea, an AI scores it on six things (market, pain, competition, feasibility, specificity and business model), and that score sets your difficulty. Then you play in a 3D office: research ideas, build features, send cold emails, close sales, and hire.

- **People are people.** Hires have energy, stress, morale and experience. Ignore them and they quit; the game pauses to warn you first.
- **Climb the ladder.** Bedroom → bigger home → villa → co-working → small office → big office → your own building. Every move costs a move-in fee and higher rent.
- **At scale, growth costs money.** Cold emails fade, so you buy ads. You run out of ideas, so you pay for an AI-planned roadmap of big projects your developers build together. Competitors poach customers once you own the market.
- **Lose:** cash goes below $0. **End:** sell the company whenever you like, or take an acquisition offer.

1.5 real seconds is one game hour at 1×. No signup, no account, saves live in your browser.

## Screenshots

<table>
  <tr>
    <td width="50%">
      <img src="docs/images/01-bedroom.jpg" alt="Day 16: the founder alone at a desk in a small bedroom, building a feature, with $500 in the bank" />
      <p align="center"><em>Day 16. One founder, one old laptop, $500.</em></p>
    </td>
    <td width="50%">
      <img src="docs/images/02-first-hires.jpg" alt="A bigger home with four interns at their desks, 173 customers and $9k MRR" />
      <p align="center"><em>First hires in a bigger home. Interns are cheap and messy.</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/images/08-people-alert.jpg" alt="A pop-up warning that a developer is close to quitting, with stress and morale bars and options to give time off or a raise" />
      <p align="center"><em>Ignore your team and they quit. The game stops to ask first.</em></p>
    </td>
    <td width="50%">
      <img src="docs/images/12-city.jpg" alt="The city map: a road lined with the bedroom, bigger home, villa, co-working space, small office, big office and your own building" />
      <p align="center"><em>The road from your bedroom to your own building.</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/images/09-team.jpg" alt="The Team window: seats, payroll, burn, profit and runway on top, a grid of team members with mood bars and skills, and a hiring column" />
      <p align="center"><em>Your team at a glance, with hiring on the side.</em></p>
    </td>
    <td width="50%">
      <img src="docs/images/11-desktop.jpg" alt="The founder's Desktop with the Roadmap app open, listing shipped big projects and the cost of planning the next roadmap" />
      <p align="center"><em>The founder's Desktop: hosting, Wi-Fi, tools, employees, roadmap and ads.</em></p>
    </td>
  </tr>
</table>

## The carousel

The v2 launch post: 27 simulated founders, three play styles, three ideas, two years each. Click a slide for full size.

<table>
  <tr>
    <td><a href="docs/images/carousel/slide-01.jpg"><img src="docs/images/carousel/slide-01.jpg" alt="Slide 1: I made 27 bots play my startup game. The ones who didn't think about money went broke in 8 of 9 runs." /></a></td>
    <td><a href="docs/images/carousel/slide-02.jpg"><img src="docs/images/carousel/slide-02.jpg" alt="Slide 2: You start alone in your bedroom with $500." /></a></td>
    <td><a href="docs/images/carousel/slide-03.jpg"><img src="docs/images/carousel/slide-03.jpg" alt="Slide 3: AI scores your idea on 6 things; examples from 10 (global payroll) to 1 (an app)." /></a></td>
    <td><a href="docs/images/carousel/slide-04.jpg"><img src="docs/images/carousel/slide-04.jpg" alt="Slide 4: Then you hire, and people have energy, stress and morale." /></a></td>
    <td><a href="docs/images/carousel/slide-05.jpg"><img src="docs/images/carousel/slide-05.jpg" alt="Slide 5: Ignore your team and they quit." /></a></td>
  </tr>
  <tr>
    <td><a href="docs/images/carousel/slide-06.jpg"><img src="docs/images/carousel/slide-06.jpg" alt="Slide 6: Bedroom to your own building; every move can kill you." /></a></td>
    <td><a href="docs/images/carousel/slide-07.jpg"><img src="docs/images/carousel/slide-07.jpg" alt="Slide 7: At scale, growth costs money: ads, AI roadmaps, competitors, tech debt, overhead." /></a></td>
    <td><a href="docs/images/carousel/slide-08.jpg"><img src="docs/images/carousel/slide-08.jpg" alt="Slide 8: The experiment: reckless survived 1 of 9, sensible 9 of 9 at $16k–$150k MRR, obsessive 9 of 9 at $111k–$631k MRR." /></a></td>
    <td><a href="docs/images/carousel/slide-09.jpg"><img src="docs/images/carousel/slide-09.jpg" alt="Slide 9: Your idea sets the ceiling. How you run the company decides how close you get." /></a></td>
    <td><a href="docs/images/carousel/slide-10.jpg"><img src="docs/images/carousel/slide-10.jpg" alt="Slide 10: How far does your idea get? Play free at failunicorn.vercel.app." /></a></td>
  </tr>
</table>

The numbers come from the balance simulations described below.

## Quick start

Requires **Node 20+** (developed on 24).

```bash
git clone https://github.com/LaKhWaN/startup-game.git
cd startup-game
npm install
cp .env.example .env    # optional — see below
npm run dev
```

Open the URL Vite prints. **It runs with an empty `.env`** — idea scoring falls back to a local estimate and analytics are skipped. You only need keys for those specific features:

| Variable | Needed for | Without it |
|---|---|---|
| `GROQ_API_KEYS` | AI idea scoring, roadmaps and big projects, via `/api/rate-idea`. A bracketed, comma-separated list (`[key1, key2]`) rotated when one hits its quota | Idea scoring falls back to a local estimate; roadmaps use built-in lists |
| `MONGODB_URI` | Analytics + global leaderboard | Those routes return 503 |
| `MONGODB_DB_NAME` | — | Defaults to `startup-game` |
| `VITE_SITE_URL` | Canonical URLs, OG tags, sitemap, share links | Defaults to `https://failunicorn.vercel.app` |
| `VITE_DISABLE_REMOTE_ANALYTICS` | — | Set `true` to never phone home |

> `VITE_`-prefixed variables are **inlined into the client bundle and publicly readable**. Never put a secret behind one — that's why the Groq keys have no prefix and are only ever read server-side. See [SECURITY.md](SECURITY.md).

## Scripts

```bash
npm run dev        # dev server with the /api routes wired up
npm run build      # generate sitemap → typecheck → production build
npm test           # unit tests (vitest)
npm run preview    # serve the production build
npm run mongo:ping # check your MONGODB_URI connects
```

Balance and screenshot tools (all opt-in):

```bash
SIM_PERSONAS=1 npx vitest run src/v2/__tests__/personas.test.ts  # easy/medium/hard players × ideas 3/5/8, 2 years each
SIM_PROBE=1 npx vitest run src/v2/__tests__/simProbe.test.ts     # month-by-month trace of one scripted game
SIM_SCENES=1 npx vitest run src/v2/__tests__/scenes.test.ts      # save game moments, then open /?scene=<name> in npm run dev
node scripts/v2-scene-shots.mjs http://localhost:5173            # screenshot every scene (needs npm run dev)
```

## How it's put together

**Vite + React + TypeScript + Zustand + React Three Fiber**, deployed on Vercel.

```
src/
  App.tsx            landing page, then the game (src/v2/AppV2.tsx)
  router.tsx         react-router routes, all lazy-loaded
  v2/                the game
    engine/          pure game logic: clock, day, churn, market, money, people, infra, ads, events
    store.ts         Zustand store; actions.ts has every state-changing action
    v2Tick.ts        one game hour: founder, team, chapters, unlocks
    scene/           the 3D rooms and the city (React Three Fiber)
    ui/              event cards, metrics, post-mortem, investor check-in
  pages/             marketing pages: blog, changelog, leaderboard, idea rater
  data/              blog posts, changelog, feature and candidate data
  analytics/         client → /api ingest
server/              API handlers (dev, via the Vite middleware)
api/                 the same handlers as Vercel serverless functions
vite/plugins/        dev middleware routing /api/* to server/
```

**The game loop.** `stepV2` runs one game hour: people get tired or recover, the founder and team make progress, and at each day boundary churn, cash, events and tech debt are processed. The office never closes; the founder sleeps 23:00–07:00.

**Balance is tested, not guessed.** Scripted players (`src/v2/__tests__/simPersonas.ts`) play full two-year games headlessly, and every balance decision is written down in [`docs/superpowers/v2-rulings.md`](docs/superpowers/v2-rulings.md).

**Analytics are three layers:** a handler in `server/` that takes raw JSON and returns `{status, body}`, a route in `vite/plugins/analyticsApi.ts` for dev, and a fetch wrapper in `src/analytics/`. Vercel gets its own copy in `api/`. If you touch one, check the other — they have drifted before.

More design notes live in [`docs/`](docs/).

## Contributing

Contributions welcome — see **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup, conventions, and what makes a good PR. Good places to start are the issues labelled [`good first issue`](https://github.com/LaKhWaN/startup-game/labels/good%20first%20issue).

Balance changes (prices, churn rates, event odds) are genuinely useful and need no deep knowledge of the codebase. The numbers live in `src/v2/engine/`; run the persona simulation before and after to show the effect.

By contributing you agree your work is licensed under the MIT License.

## License

[MIT](LICENSE) © Upender Singh Lakhwan
