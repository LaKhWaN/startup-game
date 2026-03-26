# Startup Game — Claude Context

## Stack
Vite + React + TypeScript + Zustand + Phaser 3 (office scene) + MongoDB

## Dev
```
npm run dev
```

## Entry Points
- `src/App.tsx` — routes: setup → Onboarding, playing → GameScreen, sold/lost → PostMortem
- `src/store/gameStore.ts` — Zustand store (GameState + actions)
- `src/engine/gameEngine.ts` — all game logic (tick, campaigns, events, features, churn)
- `src/types/index.ts` — all TypeScript interfaces

## Game Loop
- 1 real second = 1 game hour at 1× speed (2×/3×/5× available)
- `processDayTick` every 24 hours: features build, campaigns run, churn applies, XP gained
- `processMonthTick` every 30 days: salaries deducted, MRR calculated, events triggered
- Win: $10k MRR (200 customers × $50 ARPU) | Lose: cash = $0

## Key Financial Numbers
- ARPU: $50/user/month
- Starting cash: Home $120k, Coworking $100k, Office $80k
- Infra: $200 / $1k / $2.5k/mo
- Dev salary: ~$7k/mo, PM ~$6k, Marketing ~$5k, Sales ~$4.5k
- Desk cost: $1,500 each, max 6

## UI Layout
```
TopBar (fixed, 96px) → RunwayBanner (fixed, 36px, only when runway ≤ 3mo)
game-main:
  game-canvas-area: OfficeCanvas (Phaser) + BottomNav (6 tabs)
  RightPanel: panel content based on active tab
Overlays: EventCard, TutorialModal, CampaignResultToast, FeatureResultToast,
          MilestoneToast, InvestorCheckin
```

## BottomNav Tabs
product, team, hire, shop, gtm, metrics, goals

## Key Components
- `TopBar.tsx` — metrics pill, speed controls (1×/2×/3×/5×), ⚙️ Settings modal
- `TutorialModal.tsx` — spotlight tutorial, shown once via `localStorage: startup-game-tutorial-completed`, re-accessible via Settings
- `InvestorCheckin.tsx` — feedback modal, triggers Day 30 + game over, saves to MongoDB `game_feedback`
- `RunwayBanner.tsx` — pulsing warning at 3/2/1 months runway
- `CampaignResultToast.tsx` — shows GREAT/OK/FLOPPED after campaign ends
- `FeatureResultToast.tsx` — shows after feature ships
- `EventCard.tsx` — binary-choice events (pauses game), 5-day cooldown, 55% daily chance
- `PostMortem.tsx` — win/loss screen with leaderboard + triggers InvestorCheckin

## Office Scene (Phaser)
- `OfficeCanvas.tsx` → `OfficeScene.ts`
- `onReady` callback fires after scene `create()` + 800ms minimum
- Loader shown until ready; tutorial shown after loader

## Save System
- 3 slots (slot 1 = auto-save every 30s): `src/save/saveManager.ts`
- Leaderboard in localStorage: `src/save/leaderboard.ts`

## MongoDB / Analytics Pattern
3-layer architecture:
1. `server/*.ts` — MongoDB handler (receives rawJson + env, returns `{status, body}`)
2. `vite/plugins/analyticsApi.ts` — Vite dev middleware routing `/api/*` to handlers
3. `src/analytics/mongoIngest.ts` — client-side fetch functions

Collections: `game_sessions`, `game_day_snapshots`, `game_feedback`

Env vars: `MONGODB_URI`, `MONGODB_DB_NAME` (default: `startup-game`), `ANALYTICS_INGEST_SECRET`, `VITE_ANALYTICS_API_URL`, `VITE_DISABLE_REMOTE_ANALYTICS`

## Difficulty Tiers (from idea score via Gemini AI)
- Promising (8-10): ×1.2 customers, 3% churn floor
- Competitive (6-7): ×1.0, 5% floor
- Risky (4-5): ×0.7, 8% floor
- Brutal (0-3): ×0.4, 12% floor

## Design System
Light theme — `--bg:#f7f8fa`, `--surface:#fff`, `--surface2:#f0f2f5`, `--border:#e2e5ec`, `--accent:#0ea5e9`
Fonts: Roboto + Roboto Mono. Drop shadows only (no glow effects).

## GameSpeed Type
`0 | 1 | 2 | 3 | 5` (10× and 50× removed)
