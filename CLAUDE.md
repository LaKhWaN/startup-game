# Startup Game — Claude Context

## Stack
Vite + React + TypeScript + Zustand + React Three Fiber (2.5D rooms/city) + MongoDB

## Dev
```
npm run dev
```

## Entry Points
- `src/App.tsx` — `/`: landing page, then the game (`src/v2/AppV2.tsx`: onboarding → GameScreenV2 → PostMortem). `/new` redirects to `/?play`.
- `src/v2/store.ts` — Zustand store; `src/v2/actions.ts` — every state-changing action + `useV2` selector hook
- `src/v2/engine/` — own engine: `clock.ts` (office hours), `day.ts` (churn, cash, events, snapshots), `events.ts`/`eventData.ts`, `money.ts`
- `src/v2/v2Tick.ts` — `stepV2` (one game hour) and `skipToMorning`; founder/team/chapters layer
- `src/v2/state.ts` — `V2GameState` = company state + `v2` slice (founder, team, chapters, location…)
- `src/types/index.ts`, `src/data/featureTemplates.ts`, `src/data/candidates.ts` — shared types/data
- Plans/specs/decisions: `docs/superpowers/` (`v2-rulings.md` lists every autonomous decision)

## Game Loop
- 1.5 real seconds = 1 game hour at 1× (`GAME_HOUR_MS`; 2×/3×/5×; 10× in dev). Games start Monday 09:00.
- No night or weekends: the office never closes and hires work every hour (task durations in whole game days; hourly mood changes are ×1/3). The founder sleeps 23–07. Notices, quit warnings and low raises pause the game with a pop-up (`PeopleAlertCard.tsx`, `peopleAlerts.ts`). Crunch mode tool: +50% speed, +50% payroll, double stress.
- Daily: churn (probabilistic), cash += (MRR − burn)/30, event roll, metrics snapshot. Monthly: summary line.
- Game-raised popups (events, family money, check-in, coach/tip cards) pause the game (`src/v2/pause.ts`). Notable story lines (emoji-led) show as toasts for 5 s (`NotificationToasts.tsx`).
- Lose: cash < $0. End by selling (Sell button / acquisition events).

## Key Financial Numbers
- Start: $500 founder savings, $0 burn, ARPU $50. Family money ($800–1,500) at the end of Chapter 1.
- Interns $600–1,000/mo, full-time $3,500–5,100/mo (full-time from the Villa); yearly raises set in 💻 Desktop → Employees (`src/v2/payroll.ts`). Location ladder (rent/move-in/capacity/unlock) in `src/v2/locations.ts`.

## Late game
- Regular features have diminishing returns (`FEATURE_DECAY` in `engine/market.ts`). Paid AI roadmaps of epics (`src/v2/epics.ts`, Desktop → Roadmap, `epics` op on `/api/rate-idea`) push further; up to 3 devs co-build an epic.
- Ads (`engine/ads.ts`, Desktop → Ads) buy leads; cold emails fade with size; a sales call handles 12 + 4×skill leads. Tech debt creeps daily (`debtCreep` in `engine/day.ts`).

## UI Layout (room-first)
- TopBarV2 (metrics pill incl. Profit, clock, speed) → room canvas full width + StatsRail on the right
- FounderBar (bottom), GoalBanner (top-left, folds to 🎯 after 5 s), toasts (top-right), BottomNav (Founder/Team/Map/Metrics/Desktop)
- Founder/Team/Metrics/person cards open as Modal sheets; Map swaps the canvas to the 2.5D city
- Overlays: EventCard, FeatureResultToasts, RunwayBanner, FamilyMoneyModal, InvestorCheckin (all in `src/v2/ui/`)

## Saves
- 3 slots, slot 1 autosaves every 30s: `src/v2/saveV2.ts` (keys `startup-v2-save-*`). Leaderboard: `src/v2/ui/leaderboard.ts`.

## MongoDB / Analytics Pattern
3-layer architecture:
1. `server/*.ts` — MongoDB handler (receives rawJson + env, returns `{status, body}`)
2. `vite/plugins/analyticsApi.ts` — Vite dev middleware routing `/api/*` to handlers
3. `src/analytics/mongoIngest.ts` — client-side fetch functions

Collections: `game_sessions`, `game_day_snapshots`, `game_feedback`

Env vars: `MONGODB_URI`, `MONGODB_DB_NAME` (default: `startup-game`), `ANALYTICS_INGEST_SECRET`, `VITE_ANALYTICS_API_URL`, `VITE_DISABLE_REMOTE_ANALYTICS`

## Difficulty Tiers (from idea score via Groq AI — `GROQ_API_KEYS`, `server/rateIdea.ts`/`api/rate-idea.js`)
- Promising (8-10): ×1.2 customers, 3% churn floor
- Competitive (6-7): ×1.0, 5% floor
- Risky (4-5): ×0.7, 8% floor
- Brutal (0-3): ×0.4, 12% floor

## Design System
Light theme — `--bg:#f7f8fa`, `--surface:#fff`, `--surface2:#f0f2f5`, `--border:#e2e5ec`, `--accent:#0ea5e9`
Fonts: Roboto + Roboto Mono. Drop shadows only (no glow effects).

## GameSpeed Type
`0 | 1 | 2 | 3 | 5 | 10` in `src/v2/store.ts` (0 = paused; 10× only offered in dev builds)
