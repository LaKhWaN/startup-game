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
