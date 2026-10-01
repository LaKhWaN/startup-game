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
