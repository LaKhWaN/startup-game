# v2 build — rulings and deferred minors (Phases 1–6)

Decisions made autonomously during the build, with what each costs if wrong, and review findings deliberately not fixed.

## 2026-10-01-v2-phase3-interns

### Rulings
- Ruling: plan omits full code listings (author = executor, same session) — cost if wrong: less reviewable plan.
- Ruling: sales mistake = converted−1 (spec "1 extra lead lost" is a no-op since sales consumes all leads) — cost if wrong: mistake slightly harsher.
- Task 3: Ruling: new hires default their standing assignment to their role's main task (spec silent) — saves a click and still teaches assignment via beat-1 card — cost if wrong: player may not notice they can change it.
- Task 4: Ruling: updated Phase 2 v2Tick test 'keeps events once there is a team' to also require chapter2 complete — spec §7.3 changed the rule — cost if wrong: none.
- Task 6: Ruling: hires do research/develop/emails seated at their own seat (icon per task), only sales paces on per-seat pace spots — keeps the founder's bookshelf spot free and avoids collisions in a 4×4 room — cost if wrong: less visual variety for hires.
- Task 6: Ruling: founder paceA moved (2.6,−2.6)→(2.9,−2.35) to clear the second desk chair — cost if wrong: none, layout tests cover it.
- Task 6: Ruling: footprint() generalized with optional `origin` for non-corner pivots (tableCoffee) — cost if wrong: none, old cases still pass.
- Task 6: Ruling: spec §7.4 said beanbag by bookshelf + small desk by window; Kenney kit has no beanbag and the bookshelf corner is full, so seat 0 = lounge chair + coffee table front-right, seat 1 = second desk on the back wall beside the window — cost if wrong: re-place two furniture groups.
- Final: Ruling: re-graded Minor #2 (Settings re-show does nothing in Chapter 2) and Minor #3 (first-customer card skipped when family money is claimed first — the common path) to Important — a tutorial button that silently fails and a lost Chapter 1 card are what players get — cost if wrong: two small fixes.
- Final: Ruling: sales mistake = one fewer conversion (reviewer Minor #9) — sales zeroes leads anyway — cost if wrong: none.
- Final: Ruling: keep sdd workspaces until the end of all phases (skill says delete after review) — rulings must survive for the final report — cost if wrong: a git-ignored folder lingers.

### Deferred minors
- Final: minor (deferred): a hire removed by a legacy event gets one more hour of work before syncPayroll drops them (v2Tick order).
- Final: minor (deferred): SkeletonUtils clone bone textures never disposed on unmount (small leak per hire/fire) — Phase 6 perf.
- Final: minor (deferred): Room re-renders all furniture every game hour (subscribes to v2.team) — Phase 6 perf.
- Final: minor (deferred): save migration checks team/chapter2 shape loosely; orphaned intern builds in corrupted saves aren't repaired.
- Final: minor (deferred): "Let go" has no confirmation; changing an assignment discards current task progress.
- Final: minor (deferred): key-employee-quit always targets an intern ("Your Best Developer") since mirrors are role 'developer' — Phase 4 event gating addresses.

## 2026-10-01-v2-phase4-locations

### Rulings
- Task 2: Ruling: tests in new tiers.test.ts instead of work/team test files — keeps Phase 4 rules together — cost if wrong: none.
- Task 3: Ruling: Chapter 3 tests in chapter3.test.ts; onMoved is applied by the move action, not inside moveTo — keeps moveTo a pure location op — cost if wrong: a non-action move path would skip the beat.
- Task 4: Ruling: added key-employee-quit to EVENT_MIN_STAGE (stage ≥ 2) — every payroll mirror is role 'developer', so below the Villa it always targets an intern as "your best developer" (Phase 3 reviewer note) — cost if wrong: fewer early crises.
- Task 4: Ruling: event salary raises (e.g. counter-offer +$1,200/mo) are scaled like costs — spec §8.5 named cash and infra only, but an unscaled raise on an $800 intern is the same bankrupting problem — cost if wrong: raises feel small.
- Task 4: Ruling: a pending event restored from a save is re-filtered (re-rolls the keep chance) — rare, harmless — cost if wrong: a loaded event can vanish.
- Task 4: Ruling: updated Phase 3 v2Tick test to pass a keep-always rng and compare ids — the event is now a scaled copy — cost if wrong: none.
- Task 5: Ruling: role labels dropped the word 'intern' and a tier badge (Intern / Full-time) carries it — one label set for both tiers — cost if wrong: copy tweak.
- Task 6: Ruling: generated rooms reuse the bedroom desk/chair/laptop offsets for every workstation and a lounge chair as the founder's idle spot (SpotId 'bed' kept) — reuses known-good visuals; Phase 5 restyles each location — cost if wrong: generated rooms look samey until Phase 5.
- Task 6: Ruling: harness console shows duplicate-key warnings from legacy MilestoneToastQueue (timestamp keys) when the dev hook jumps MRR/team and several milestones fire in one tick — legacy component, not editable, not a v2 bug — cost if wrong: none in normal play.
- Task 6: Ruling: CAMERA_DISTANCE 20→40 so the orthographic camera sits outside the biggest room — no visual change for ortho — cost if wrong: none.
- Task 7: Ruling: spec §8.2 location numbers kept unchanged — seeded sim (3 seeds) reaches Co-working on days 48 / 59 / 205 and never goes broke; added a ≥30-day lower bound so a future change can't make the ladder trivial — cost if wrong: the early ladder may feel fast for lucky runs (seed 1 got an investor raise).
- Final: Ruling: re-graded Minor 1 (loaded save shows/charges the unscaled legacy event for ~1s) and Minor 3 (migrated Phase 3 save: Map open but every rung locked while c3-0 says move) to Important — real money and a dead-end card — cost if wrong: two small fixes.
- Final: Ruling: updated eventsV2 test "keeps payout events whole" to use acquisition-premium — angel is now gated — cost if wrong: none.

### Deferred minors
- Final: minor (deferred): scaleText regex edge cases ("$2,000," swallows comma; "$1.5k"/"$5M") — latent, no current event text hits them.
- Final: minor (deferred): $50 scaled-cost floor can exceed a tiny raw cost (e.g. $30 refund → $50).
- Final: minor (deferred): "Room is full… Move somewhere bigger on the Map" shows before the Map tab exists.
- Final: minor (deferred): seat renumbering on move follows seat order, spec says hire order (differs only after fire + re-hire).
- Final: minor (deferred): moving down and back resets event infra bumps (intended by §8.2; dodgeable).
- Final: minor (deferred): free-play banner says "next stop X at $Y MRR" even when X is already unlocked.
- Final: minor (deferred): a kept event costs the founder/team that hour (early return), unlock checks wait a tick.
- Final: minor (deferred): key-employee-quit picks the last hire (mirror level forced to 1), not the "best developer".

## 2026-10-01-v2-phase5-rooms

### Rulings
- Task 1: Ruling: generated rooms dropped their back-right potted plant (themes bring their own plants in the strip) and the right margin shrank 0.6→0.3 next to the 2-tile strip — cost if wrong: none.
- Task 1: Ruling: fetch script also pulls all 12 characters now (used in Task 3); plantSmall3 dropped (tabletop plant looked lost on the floor) — cost if wrong: none.
- Task 2: Ruling: generated rooms draw every workstation, empty ones included (showEmptySeats) — a 28-seat office with 8 people looked like a bare floor; the bedroom keeps occupancy-based seats per §7.4 — cost if wrong: more meshes (Phase 6 perf covers it).
- Task 2: Ruling: tint copies are cached per model+tint (materials cloned once, geometry shared) instead of per piece — 120 floor tiles share one tinted copy — cost if wrong: none.
- Task 3: Ruling: "variety by morale" became in-scene reactions (😬 2.5 s after a mistake, 💤 with no task) — v2 holds legacy morale fixed, so there's no morale to show — cost if wrong: a later morale system replaces the 💤 rule.
- Task 3: Ruling: reactions/shouldShowMove helper + test were written in one step before the RED run (TDD slip, logic trivial) — cost if wrong: none observed.
- Task 4: Ruling: 💤 shows only for assignment Idle, not every hire waiting for work — a room full of Zzz after hiring read as a bug — cost if wrong: waiting hires look busy-ish.
- Task 4: Ruling: harness doesn't click a 3D character (no stable screen projection from Playwright); click wiring is type-checked and covered by the focus/highlight code path only — cost if wrong: a click bug surfaces only in manual play.
- Task 4: Ruling: in-scene Html icons capped at zIndexRange [20, 0] so the move overlay (z 30) covers them — cost if wrong: none.
- Task 5: Ruling: Phase 5 gates/review folded into Phase 6 Task 5 (one fresh review of Phase 5+6) — both phases touch the same scene files — cost if wrong: Phase 5 findings land a phase later.

### Deferred minors

## 2026-10-01-v2-phase6-polish

### Rulings
- Ruling: no postprocessing dependency — CSS vignette, no bloom (design system: no glow), MSAA already on — cost if wrong: slightly less filmic look.
- Task 1: Ruling: adaptive quality lowers DPR only; spec §10.1 also turned shadows off, but toggling shadows live made every already-compiled material vanish (caught in the harness: villa lost walls and desks) — cost if wrong: slow devices keep paying for shadows.
- Task 1: Ruling: helper tests for Tasks 2/4 (stepFor, two-click confirm) were committed with Task 1 in polish.test.ts — written test-first, all helpers pure — cost if wrong: none.
- Task 2: Ruling: under reduced motion, pacing (sales) stands still at its first spot instead of snapping back and forth every frame — cost if wrong: none.
- Task 3: Ruling: on phones the top bar hides the startup name/day text (logo stays) and lets the metric pill and controls scroll sideways — TopBarV2 is a legacy-style bar that can't fit 5 metrics + 9 controls in 390px — cost if wrong: name/day only visible on wider screens.
- Task 3: Ruling: harness clears random events before tab clicks (dev hook clearEvent) and checks for horizontal page overflow — events blocked the Map click on one run — cost if wrong: none.
- Final: Ruling: re-graded Minor 4 (double-click within ~300 ms fires "Let go") to Important — it defeats the confirm it exists for — cost if wrong: one constant.

### Deferred minors
- Final: minor (deferred): pointer cursor can stick if a hovered character unmounts.
- Final: minor (deferred): reduced motion still bobs scene icons and smooth-scrolls; preference read once per mount.
- Final: minor (deferred): re-clicking the same hire doesn't re-scroll the Team panel.
- Final: minor (deferred): phone tap targets tiny in the big rooms (~10 px characters).
- Final: minor (deferred): all 35 furniture + 12 character models preload up front (~3.5 MB).
- Final: minor (deferred): wall tint also tints window glass (blue cast in Small office).
- Final: minor (deferred): tint cache keyed by model name, not scene identity (stale after useGLTF.clear/HMR, dev-only).
- Final: minor (deferred): no test names the amenity-strip "never covers a standing spot" contract (covered by generic room tests).

## 2026-10-01-v2-phase7-room-first

### Rulings
- Task 2: Ruling: pure helpers renamed founderBar.ts → founderTasks.ts — macOS can't hold founderBar.ts next to FounderBar.tsx — cost if wrong: none.
- Task 2: Ruling: Map opens the old map list in a modal for now; Task 4 replaces it with the city view — keeps every commit playable — cost if wrong: none.
- Task 2: Ruling: modals sit at z 60, below event cards (100), toasts (90/300) and the family-money modal (1000), so game-pausing events always stay on top — cost if wrong: an event can appear over an open sheet (intended).
- Task 2: Ruling: top-bar mini labels hide below 1680px (tooltips keep the names) so six metrics + controls fit; Profit uses 💰 so it doesn't repeat churn's 📉 — cost if wrong: copy/style tweak.
- Task 2: Ruling: hoverText helper + test written in one step (TDD slip, pure string table) — cost if wrong: none observed.
- Task 3: Ruling: verification is now tsc + unit tests + a manual test table (user's call: browser checks cost too many tokens); hover/click not machine-verified — cost if wrong: UI bugs surface in the user's manual pass.
- Task 3b: Ruling: avatars are Kenney's own preview renders of each character (public/assets/v2/portraits) so the card matches the person in the room; hires from older saves have no one-liner and simply skip that line — cost if wrong: none.
- Task 3c (user request mid-build): Ruling: the right side gets a slim read-only stats rail (funnel, working/waiting/idle, ideas/being built, all-time email rounds/leads/calls/customers/shipped/research/mistakes); hidden on phones (≤768px) where the room needs the width — cost if wrong: phone players don't see these counts.
- Task 3c: Ruling: lifetime counters live in v2.stats, counted once in applyOutcome so founder and hires share one path; saves without stats migrate to zeros (history before this build isn't counted) — cost if wrong: totals start from the update.
- Task 4: Ruling: city data module named cityLayout.ts (macOS case clash with City.tsx) — cost if wrong: none.
- Task 4: Ruling: all seven lots sit on one side of a straight main road, left→right in ladder order, trees and street lights across the road; building fronts assumed to face +z (toward the road) — Kenney's facing wasn't machine-checked (no browser checks now) — cost if wrong: flip one rotation constant.
- Task 4: Ruling: the old Map list (MapPanel) is deleted; the city card shows the same info (seats, rent, move-in, Move or blocked reason) — cost if wrong: none.
- Task 4: Ruling: founder bar and coach card hide in city view; the stats rail stays — cost if wrong: none.
- Task 4: Ruling: cityLayout test + module written together (TDD slip, pure data) — cost if wrong: none observed.
- Final: Ruling: also fixed these minors by effect (players hit them): Build picker reopening by itself, PersonCard "best at develop" / "product skill" copy, stale person modal after Let go, typing sound in city view, Esc closing the sheet under an event, city sun missing far towers, lots re-rendering every tick, committed probe script, dead map/focus CSS, old phone right-panel rule in sheets, conversion capped at 100% — no unit tests (UI-only), covered by the manual table — cost if wrong: caught in the manual pass.

### Deferred minors
- Final: minor (deferred): v2.stats.featuresShipped written but the rail counts completed features (keeps pre-counter saves right).
- Final: minor (deferred): drei Html labels/icons can draw over floating controls (visual only).
- Final: minor (deferred): characters restart at their start spot after returning from the city.
- Final: minor (deferred): city GLBs preload before the Map unlocks (~1MB).

## 2026-10-02-v2-A-own-engine

### Rulings
- Task 1+2+5: Ruling: Tasks 1, 2 and 5 landed as one commit — the legacy UI pieces read the legacy store, so switching the store and copying the UI couldn't be split without a broken build — cost if wrong: one bigger commit.
- Task 1: Ruling: kept the field name infraCostMonthly (spec said rent) — events, scaling and 20+ call sites use it; renaming is churn with no player effect — cost if wrong: a later rename.
- Task 1: Ruling: cash still moves daily ((MRR − burn) / 30), spec §3.1 said monthly payroll — same totals, smoother, and runway/game-over react immediately — cost if wrong: none.
- Task 1: Ruling: daily churn rounds probabilistically (legacy floored to 0 for small companies, so <~250 customers never churned) — this is the "customers never change" bug — cost if wrong: churn now visible earlier; B replaces the formula anyway.
- Task 1: Ruling: events are the legacy data run against a team-backed `employees` view; departures/salary changes map onto v2 hires, morale/stress changes are ignored until C; "best developer" now really is the most skilled developer — cost if wrong: none.
- Task 5: Ruling: the event card computes the outcome once and passes it to applyEventChoice (legacy ran effects twice, so the shown outcome could differ from the applied one) — cost if wrong: none.
- Task 5: Ruling: legacy milestone toasts dropped (chapters/coach cards cover progression); local SQLite analytics dropped, Mongo ingest kept (session workspace = current location) — cost if wrong: admin local-DB view loses v2 games (Mongo dashboard unaffected).
- Task 2: Ruling: shared types (src/types) and data (featureTemplates, candidates) stay as shared modules; only legacy runtime gets deleted in Task 6 — cost if wrong: none.
- Task 3: Ruling: games start Monday 09:00 (not midnight) so day one opens with the office open — cost if wrong: none.
- Task 3: Ruling: the founder's tasks still progress 24h/day (works nights for free until C adds energy); hires count 8-hour work days, so their throughput is 5/7 of before — balance sim still passes; C/F retune — cost if wrong: hires feel weaker until F.
- Task 3: Ruling: "window darkens" is done with lighting (moonlight sun, dim sky, brighter lamps/screens, ceiling glow, dark background) rather than swapping window models — cost if wrong: windows look lit-glass at night.
- Task 3: Ruling: hires mounted after hours (load, back from the city) start hidden at the door; at 09:00 they walk in — cost if wrong: none.
- Task 4: Ruling: the event outcome popup no longer auto-dismisses after 4 s — it stays (and keeps the game paused) until clicked, per "when done after dismiss resume" — cost if wrong: one extra click per event.
- Task 4: Ruling: pausing popups = event card + its outcome, family money, investor check-in; speed buttons disable while any is open — cost if wrong: none.
- Task 6: Ruling: also deleted the /prototype dev experiments (one imported Phaser) and the unused StoryLog component; removed phaser, sql.js, lucide-react, @types/sql.js — cost if wrong: prototypes recoverable from git.
- Task 6: Ruling: local SQLite game analytics (src/save/gameAnalytics) removed with the legacy save code; Mongo ingest and the admin dashboard (API-backed) stay — cost if wrong: no local analytics DB in dev.
- Task 6: Ruling: the landing page still shows the old pixel-office screenshot (office_bg_level1.png kept, employee sprite deleted); refreshing landing visuals goes to F (polish) — cost if wrong: marketing shows the old look until then.
- Task 6: Ruling: updated CLAUDE.md to the new architecture (it described the deleted legacy game) — cost if wrong: none.
- Task 7: Ruling: balance sim (3 seeds) passes unchanged on the new engine with office hours — no tuning needed in A; F re-balances with B–E — cost if wrong: none.
- Final: Ruling: re-graded Minor 1 (a popup after a player pause resumed at 1×) to Important — players expect to stay paused — cost if wrong: none.
- Final: Ruling: game over at cash < $0 (legacy was <= 0) — a founder at exactly $0 can still claim family money/sell — cost if wrong: one comparison.
- Final: Ruling: investor-interest "culture > 65" bonus dropped in the port (culture is static in v2 until C) — cost if wrong: tiny.
- Final: Ruling: quit event's "halve build progress" is overridden by departMember resetting the feature to proposed/0 — losing the builder loses the build — cost if wrong: harsher than legacy.

### Deferred minors
- Final: minor (deferred): a kept event costs the founder that one hour (early return in v2Tick).
- Final: minor (deferred): departMember duplicates team.ts removeMember/freeFeatureOf.
- Final: minor (deferred): PostMortem mount effect double-runs in dev StrictMode (two leaderboard entries, dev only).
- Final: minor (deferred): load forces 1× even if a popup hold is live.
- Final: minor (deferred): investor interest ≥70 before stage 2 can occupy the event slot every day (legacy behaviour).
- Final: minor (deferred): old localStorage keys (startup-game-v2-save-*, startup-game-leaderboard) left behind.

## 2026-10-02-v2-B-market

### Rulings
- Unanswered support tickets also cut sales conversion (reputation factor ×(1 − backlog/customers × 0.5), floor 0.5) — added because the simulation showed neglecting support still won (time spent on support cost more sales than the churn it saved); now careful play ends with ~40% more customers by day 200 — cost if wrong: support may feel mandatory.
- Incident "All hands" lowers tech debt by 8 (the spec's "−1 day of founder task" dropped: event effects only touch company state) — cost if wrong: incidents feel lighter.
- Incident damage (customers, ticket flood) lands when it fires; the popup is only the follow-up decision. Incidents are never suppressed by chapter gating or event thinning — cost if wrong: an incident during the tutorial if the player racks up debt.
- Support uses the outreach skill and Refactor the build skill; no new roles — cost if wrong: a dedicated support role would come in C.
- Simulation players: the original "sensible" player now neglects support/debt and still reaches Co-working on days 237–279; a careful variant is compared against it — cost if wrong: none.

## 2026-10-02-v2-C-people

### Rulings
- Energy tuned from the spec draft (−7/+45 → −5 busy / −1 idle per work hour, +50 overnight; founder −3 working, +15 asleep) — the draft made a normal work week unsustainable and stalled the simulation — cost if wrong: grinding feels softer.
- The founder now sleeps 23:00–07:00 by default even mid-task (no progress, +15 energy/h); a 🌙 Work late toggle keeps them working at an energy cost — without it a multi-day task meant working 24/7 with no way to rest — cost if wrong: one more toggle to learn.
- Burnout → notice is told through the story log, the person card (warning + "Convince them to stay", once per person) and the stats rail, not a blocking popup — cost if wrong: a player who never opens cards may miss a notice (the head shows 😫).
- Pacing after B+C: simulation reaches Bigger home on days 174–231 and Co-working on 314–415 (was 46–157 before B); careful play ends day 300 with churn 10% vs 15% — final tuning is F's job — cost if wrong: the mid-game may feel slow until F.

## 2026-10-02-v2-D-shop

### Rulings
- There's no PlayStation or ping-pong model in the Kenney kits: "Game corner" is a TV on a cabinet, "Table tennis" uses the kit's plain table — cost if wrong: a closer model later.
- Perks are kept when you move but only as many as the new place has slots are active (the rest show "In storage") — cost if wrong: none.
- Setups belong to desks (seat index), not people: a new hire sits at an upgraded desk, the founder desk is separate; tier-3+ desks show a monitor — cost if wrong: an upgrade "moves" if seats renumber after a move.
- Test fixtures use neutral tier-2 desks so other timing tests stay exact; real games start on the tier-1 XP laptop (checked in shop.test) — cost if wrong: none.
- The balance simulation still starts on neutral desks and never shops; F rebuilds the simulated player to start on real XP laptops and buy perks/setups — cost if wrong: D's balance unverified until F.

## 2026-10-02-v2-E-infra

### Rulings
- Home Wi-Fi is the ×1.0 baseline; Fiber ×1.05 ($80) and Business ×1.1 ($250) are upgrades (spec draft had home at ×0.95) — keeps a neutral start and makes Wi-Fi a pure upgrade — cost if wrong: Wi-Fi feels optional.
- Outages are never suppressed or thinned (like incidents); the outage popup's "credit customers" choice costs 20% of customers × ARPU — cost if wrong: none.
- The macOS-style desktop uses generic window dots and a "◆ Infra" menu (no Apple branding) — cost if wrong: none.

## 2026-10-02-v2-F-balance

### Rulings
- B+C review fixes: shipped churn reductions are now a lasting `churnRelief` (max 6%) instead of vanishing at midnight; good-news events leave a negative, fading shock; support/reputation use max(20, customers) so tiny companies aren't punished for one ticket; everyone answers Support at main-task speed — cost if wrong: support and retention are friendlier than the first draft.
- People re-tuned so burnout is reachable: busy −7 energy/h, +0.45 stress/h; overnight +45 energy/−1 stress; weekend −4 stress; a hire busy every work hour hands in notice after ~8 weeks without perks, one with regular idle time never does — cost if wrong: grinding still feels lenient for a few weeks.
- Early-game boosts after the full simulation: intern speed 0.7/0.35 → 0.8/0.4, old laptop ×0.85 → ×0.9 — the bedroom phase took ~300 game days — cost if wrong: interns slightly stronger.
- Simulation: a "manager" player (real XP-laptop start, buys perks/setups/hosting/Wi-Fi/tools, rests stressed hires, convinces leavers, one hire on support per 250 customers, moves with 2 months' reserve) reaches Bigger home on days 167–225 and Co-working on 317–485 without going broke; a neglectful player ends day 300 with ~40% fewer customers and 13× the support backlog — cost if wrong: real players may be faster or slower than the scripted one.
- Tips (support, debt, hosting, stress, notice, shop, night, market) show once each, only when no chapter card is up — cost if wrong: one more card at a busy moment.
- The landing page screenshot still shows the old game (no browser screenshots this session) — cost if wrong: marketing lags the game.

## Final review of D–F (fresh reviewer: 1 Critical, 4 Important, 13 Minor)

### Fixed
- Critical: an outage/incident before Chapter 2 froze time with no card (the event card was only mounted after Chapter 2) — the event card is now always mounted.
- Services (hosting, Wi-Fi, tools) bill by the hour, so subscribing and cancelling within a day still costs.
- Hosting can be downgraded instantly when customers fit the smaller plan.
- Metrics churn breakdown adds a retention row and a "held at your idea's floor" note; the Churn cell uses the same live total.
- The simulation now asserts the manager really bought perks, a founder setup and hosting tier ≥ 3; the neglect player never upgrades hosting (ends day 300 with ~20 customers and ~60% churn).
- Minors fixed: desk computers follow their people when seats renumber on a move; the founder's desk row hides the irrelevant mistakes number; the ship toast reports the churn relief actually applied (cap 6); day snapshots use post-incident numbers.

### Deferred minors
- A "1-day" migration started late in the evening finishes at the next midnight (whole-day timing).
- The player can't choose which perks are active after moving to a smaller place (oldest bought win).
- Straight-line walking can pass through a perk spot (no path-finding).
- Home seat 0 (lounge chair + coffee table) never shows a monitor.
- Settings "re-show" brings back chapter cards, not tips.
- CoachOverlay subscribes to the whole store (legal, re-renders each tick).
- Old saves load on free hosting and XP laptops; unknown perk ids aren't filtered.
- Good-news churn shocks can stack (clamped at the idea's floor).
- FounderPanel "days left" ignores desk/Wi-Fi/CI/energy factors.
- The simulation still never triggers a burnout notice (people care keeps stress low); burnout is covered by a deterministic unit test instead.

## Support role (user request after testing)

### Rulings
- Added a fifth hire role, Support (intern and full-time): main task Support, main skill outreach, its own bios; candidate pools now draw from 5 roles (~1 in 5 is Support) — cost if wrong: slightly fewer of each other role in a pool (Refresh rerolls).

## Pacing, night shift, auto skip, Metrics/rail redesign (user requests)

### Rulings
- Clock slowed to 1.5 s per game hour at 1× (a day lasts 36 s) and every task shortened (research 3→1.5 days, emails/sales 2→1, support 1→0.5, refactor 2→1, builds baseDays/0.6 → baseDays/1.2), so far fewer day/night cycles pass per piece of work; simulation now reaches Bigger home on days 126–160 and Co-working on 276–299, never broke — cost if wrong: per-day output roughly doubled, so the economy is a bit friendlier.
- Night shift is a tool in 💻 Infra → Tools: office open 09:00–23:00 on weekdays, costs +50% of payroll, evening hours count double for stress — cost if wrong: none.
- Auto skip to morning is an "Auto" toggle next to ⏭ Skip in the office-closed pill (saved with the game); it never skips while a popup is open, an event is pending, or the founder is working late — cost if wrong: one more toggle.
- Metrics sheet rebuilt as spaced KPI cards (with colour-coded borders), a market bar, a "why customers leave" list showing only the parts that apply, and health bars; the stats rail became a funnel card, icon tiles (working/waiting/idle/stressed/ideas/building), three pressure gauges (market, hosting, support) and all-time tiles, with details in hover tooltips — cost if wrong: some numbers moved into tooltips.

## Churn vs growth balance (user: "churn not impacting much")

Measured with the sim probe (`SIM_PROBE=1 npx vitest run src/v2/__tests__/simProbe.test.ts`). Before: churn sat on the 5% floor (retention relief cancelled every extra), customers grew to ~3,700, ARPU drifted to ~$155, cash $3M by day 720.

### Rulings
- Competition churn: +0% at 40% market share rising to +8% at full share — cost if wrong: late game plateaus sooner.
- Retention relief cancels at most half of the extra churn (still capped at 6 points) — cost if wrong: retention features feel weaker.
- Stale product: after Chapter 1, +0.5%/week once 30 days pass with no ship, max +3% (tried 21 days / +4%; mid-game stalled too hard) — cost if wrong: sales-only teams leak.
- New customers (won in ~the last 30 days, `v2.freshCustomers`, ages 1/30 a day) churn twice as fast: breakdown adds `base × fresh/customers` — cost if wrong: fast growth spurts leak more.
- Sales conversion × (1 − 0.5 × market share); email lead floor 10% → 5% — cost if wrong: late hires add less.
- Tickets 0.03 → 0.05 per customer per day; per-customer tools cost $1 → $4/mo — cost if wrong: thinner margins.
- Features cap ARPU at $100 (an already-higher ARPU is kept) — cost if wrong: less revenue upside.
- After: churn 10–35% in the late game, customers plateau around 2,700–3,200 with monthly wins ≈ losses; one seed declined from 1,556 to 840. Manager sim: Bigger home on days 154–165, Co-working on days 290–330; neglect run ends with 21 customers vs 569. Cash at scale still reaches $0.6–3.8M because payroll (max 50 hires at $2–3k) stays far below MRR; left for a follow-up.
- Metrics "Why customers leave" lists Competitors, Nothing shipped lately and New customers; market gauge warns from 40%; new "Customers want something new" tip.

## Raises, pricier growth, people who quit, rooms with their own look (user request)

### Rulings
- 💻 Infra became 💻 Desktop with a fourth app, 👥 Employees: yearly raise policy (0/3/5/8/10/15%, default 5%), payroll now and after a round of raises, and each person's salary, next review, morale and stress — cost if wrong: one more app.
- Raises land on each work anniversary (every 360 days from hire). People expect 8%; the last raise sets a lasting morale modifier of ±2 per point away from 8 (clamped ±16) — cost if wrong: a 0% policy saves money but quietly costs morale.
- Full-time hires $2,000–3,000 → $3,500–5,100 (steps of $400); promotion pays at least $3,500 — cost if wrong: slower full-time phase.
- Rent / move-in / unlock MRR: Bigger home $500 / $1.2k / $1.5k, Villa $1.5k / $4k / $4k, Co-working $3.5k / $7k / $8k, Small office $8k / $18k / $18k, Big office $16k / $45k / $40k, Building $32k / $100k / $90k. Chapter 2's goal follows the Bigger home unlock ($1,500) so the Map opens with somewhere to go; old saves past Chapter 2 get that peak credited — cost if wrong: slower ladder.
- Stress: busy hours 0.45 → 0.8/h; running on empty (+1.5/h) now only counts while busy. Morale drifts to 65 (was 75) + perks + pay mood − stress/2. New exit: morale under 35 for 5 work days in a row → notice ("took another offer"). A departure costs everyone else 6 morale. Convincing someone to stay also lifts their morale to 55 — cost if wrong: harsher people management.
- Sim (seed 1/2, 2 years): a player who rests people and buys perks has 0 quits; one who never does has 14–17 quits, and seed 1 runs out of cash around day 600. A new balance test pins ≥5 quits ignored vs < half that cared for. Manager sim reaches Co-working on days 302–306; late-game cash for the caring player is $0.4–1.8M (was $3.8M).
- Rooms: each space now groups desks its own way with aisles and plants — Bigger home pairs on rugs, Villa single-desk islands on rugs, Co-working benches of 3, Small office pods of 2×2, Big office rows of 4, Building pods of 3×2 under a glass back wall. Desk spacing ≥0.8 between neighbours; rooms grew 2–5 units wide. Not visually checked (no browser), the room tests cover overlaps, bounds, seats and spots — cost if wrong: a layout may need visual tweaks.

## Pop-up coaching, auto-closing toasts, no more night (user request)

### Rulings
- Coach and tip cards ("do this") are a centred pop-up that pauses the game until "Got it". The chapter goal banner opens for 5 s whenever the goal changes, then folds into a 🎯 Goal chip that reopens it. Other notifications: story lines that start with an emoji (quits, notices, raises, unlocks, moves, perks, monthly churn) show as toasts top-right for 5 s; plain task lines don't, to keep it quiet at 5× — cost if wrong: some info the player wanted isn't toasted.
- Night and weekends removed: no darkness, hires never walk home, no ⏭ Skip / Auto chip. Hires work every hour; a hire "day" is now a whole game day (WORK_DAY_HOURS 24) and hourly mood changes are ×1/3, so a day adds up the same. Weekend rest is replaced by stronger daily recovery (stress −2.5, energy +50 a day). Hires now work 7 days a week instead of 5 (+40% weekly output); the sim still reaches Co-working on days 297–306 and an ignored team still loses 18–20 people — cost if wrong: a little more output.
- The founder still sleeps 23–07 (energy mechanic) and "Work late" stays, without the night look.
- Night shift (meaningless without evenings) became 🔥 Crunch mode: hires 1.5× faster, busy stress ×2, +50% payroll. Saves with Night shift get Crunch mode — cost if wrong: one renamed tool.
