# Contributing to failunicorn

Thanks for taking a look. This is a small project — issues and PRs get read, and you don't need permission to open either.

## Ground rules

- **Open an issue before large changes.** For a typo, a balance tweak, or a bug fix, just send the PR. For a new feature or a refactor that touches several files, open an issue first so you don't spend a weekend on something that gets turned down.
- **One concern per PR.** A PR that fixes a bug *and* reformats three files is hard to review and hard to revert.
- **Be decent to people.** See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Setup

Requires Node 20+.

```bash
git clone https://github.com/<your-username>/startup-game.git
cd startup-game
npm install
cp .env.example .env
npm run dev
```

You do **not** need any API keys to work on the game. With an empty `.env`, idea scoring falls back to a local heuristic and the analytics calls are skipped. You only need `MONGODB_URI` if you're specifically working on the leaderboard or analytics.

## Before you open a PR

```bash
npx tsc -b      # must pass with no errors
npm run build   # must succeed
```

There is no test suite yet. Until there is, say in your PR description what you actually clicked through to verify — "played to day 40, shipped two features, confirmed churn applied" is worth more than "should work".

## Conventions

**TypeScript.** No `any` in new code. Shared types belong in `src/types/index.ts`.

**Styling.** Use the tokens in `src/styles/colors.css` (`var(--brand-primary)`, `var(--surface)`, `var(--muted)`, …). Don't hardcode hex values — the palette is deliberate and gets adjusted as a set. Drop shadows only, no glow effects. Fonts are Roboto, Roboto Mono, and DM Serif Display for the wordmark.

**State.** Game state lives in the Zustand store (`src/store/gameStore.ts`). Game rules live in `src/engine/`. Components read state and dispatch actions; they should not contain game logic.

**Commits.** Write a real sentence in the imperative mood: `Fix churn applying twice on the first month tick`. Not `fix stuff`.

## Where things are

| You want to change | Look in |
|---|---|
| Prices, salaries, churn, event odds | `src/engine/` |
| The office view | `src/office/OfficeScene.ts` |
| Panels, toasts, modals | `src/components/` |
| Blog posts, changelog entries | `src/data/` |
| Marketing pages | `src/pages/` |
| Analytics / leaderboard / idea rating | `server/` **and** `api/` — see below |

### The one real gotcha

Analytics, leaderboard and idea-rating logic each exist **twice**: `server/*.ts` runs in dev through `vite/plugins/analyticsApi.ts`, and `api/*.js` runs on Vercel in production. They are separate files with the same logic, and they have silently drifted before — a missing field in one copy's Mongo projection made the whole leaderboard return zeroes.

**If you change one, change the other, and say in your PR that you did.** Consolidating these two into one shared module is a genuinely welcome PR.

## Good first contributions

- Balance tuning in `src/engine/` — prices, churn rates, event probabilities. Needs game sense, not codebase knowledge.
- New random events in the event pool.
- New blog posts or changelog entries in `src/data/`.
- Accessibility fixes — keyboard navigation, focus states, contrast, `aria` labels.
- Mobile layout bugs.

## Reporting bugs

Use the bug template and include the browser, what you did, and what happened. A screenshot of the game screen with the metrics bar visible is usually enough context.

If you think you've found a **security** problem, don't open an issue — see [SECURITY.md](SECURITY.md).

## Licensing

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
