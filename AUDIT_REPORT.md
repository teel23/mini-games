# Mini Games — Production Audit Report
**Target:** `games.c2tbuilds.com` · Next.js 16 · React 19 · Tailwind 4 · localStorage · Vercel
**Date:** 2026-06-24
**Method:** Full static read of `src/` (13 hooks, 13 pages, 4 lib modules, 4 components, config, manifest). No code changed.
**Tone:** Brutally critical, as requested. Nothing here is sugar-coated.

---

## TL;DR — The 6 things that matter most

1. **There is no service worker. The "PWA" does not work offline at all.** `manifest.json` exists but no SW is registered anywhere in the tree. Offline = white screen. On Android, Chrome won't even fire the install prompt without a fetch-handling SW.
2. **The entire "Daily + Streak" feature is broken** across Wordle, Minesweeper, and Sudoku: the day index rolls over on **UTC** while the streak clock rolls over on **local time**, streaks **never break** on a skipped day, and the daily is **replayable/farmable** in Minesweeper and Sudoku.
3. **PVP Battleship is unplayable** — `fireAt` only handles player 1; player 2 can never take a turn. Hard deadlock.
4. **Four games never save their stats.** Chess, Checkers, Battleship, and Dots & Boxes don't import `storage` — "wins vs AI" is shown on the home cards but is recorded *nowhere*. Those cards are permanently blank.
5. **Solitaire's best time is always ~0:00** — `startRef` is a plain object literal recreated on every render instead of a `useRef`, so elapsed time is always near zero.
6. **iOS install is visibly broken** — `apple-touch-icon` points at an SVG (iOS ignores SVG icons → blank/letter icon), there's no maskable icon for Android, and with `black-translucent` status bar + no `viewport-fit=cover`/safe-area insets, every game renders under the notch.

Also worth stating plainly: the audit prompt describes **8 games**, but the app ships **13**. `NOTES.md`, `manifest.json`, and `page.tsx` all say 13. The brief is out of date.

---

## Phase 1 — Codebase Scan

### Structure (what exists)
```
src/
  app/
    layout.tsx              PWA meta tags, Google Fonts <link>, SwipeBack
    page.tsx                Home grid (13 cards, sound toggle)
    globals.css             gradient bg, keyframes
    <13 game routes>/page.tsx
  hooks/                    one hook per game (13)
  components/               GameCard, PauseMenu, ConfettiOverlay, SwipeBack
  lib/
    storage.ts              typed localStorage helpers
    dateUtils.ts            day index + seeded RNG
    wordList.ts             daily words + valid guesses
    sounds.ts               Web Audio synthesis
    haptics.ts              navigator.vibrate wrappers
public/
  manifest.json
  icons/icon-192.svg, icon-512.svg   (SVG only)
next.config.ts             empty
```

### What's missing
- **No service worker / offline strategy** (`sw.js`, `next-pwa`, Workbox — none present).
- **No PNG or maskable icons.** Only two SVGs.
- **No in-progress game-state persistence** anywhere. Only best-scores/streaks are stored. Every game resets on refresh.
- **No `viewport` export / `viewport-fit=cover`**, no `env(safe-area-inset-*)` usage anywhere.
- **No instructions/help** on any of the 13 games.
- **No install-prompt UI** (`beforeinstallprompt` is never captured).
- `next.config.ts` is the empty default — no headers, no caching, no image config.

### Inconsistent / duplicated
- **Day-rollover logic is internally inconsistent** (UTC index vs local date string — see Phase 2).
- **Inline styles vs Tailwind** are mixed almost at random (`GameCard`/`page.tsx` are nearly all inline styles; `PauseMenu` is mostly Tailwind). Maintenance hazard.
- **`storage.ts` contains dead getters/setters** for chess/checkers/battleship/dotsboxes that nothing ever calls.
- `NOTES.md` is drifting from the code (claims Checkers "minimax depth 6"; code is depth 4. Claims a Wordle share button; it's wired in the hook but not surfaced in the UI).

---

## Phase 2 — Game-by-Game Audit

> Legend: 🔴 broken · 🟡 degraded · 🟢 polish

### Cross-cutting (applies to all 13)
- 🟡 **No game survives a page refresh.** Every hook initializes fresh state; nothing serializes the board. For the *daily* games this is worse — you lose daily progress and (for MS/Sudoku) can simply replay.
- 🟢 No game has instructions/help.
- 🟢 Haptics (`navigator.vibrate`) are a **no-op on iOS Safari** — the API is unsupported on iPhone, the primary target. Android-only feature.
- 🟢 `sounds.ts` never calls `ctx.resume()`. iOS suspends `AudioContext` created/triggered outside a direct user gesture (e.g., AI-move sounds from `setTimeout`), so sound is unreliable on iOS.

### 1. Tic-Tac-Toe — `useTicTacToe.ts`
- ✅ Minimax + alpha-beta correct; hard is genuinely unbeatable; easy/medium/hard scale meaningfully (random / 65% optimal / optimal).
- ✅ Win/draw/friend mode all handled. Wins-vs-AI persists.
- 🟢 No issues of substance. This one is solid.

### 2. 2048 — `use2048.ts`
- ✅ Slide/merge/rotate logic correct; `hasValidMoves` game-over correct; best score persists per board size.
- 🟡 **No win/2048-tile detection** — reaching 2048 does nothing (no celebration, no "keep going?"). Defensible as endless, but there's no payoff moment.
- 🟢 **`animating` state is dead** — it's checked in `doMove` (line 118) and returned, but never set to `true`. The 200 ms animation gate does nothing; rapid swipes can overlap animations.
- 🟢 Writes best score to localStorage on **every** move (line 155), even when the score didn't beat the best.

### 3. Wordle — `useWordle.ts`
- 🔴 **Streak never breaks on a skipped day.** Line 120: `const wasYesterday = isNewDay(lastDate) && !isNewDay(lastDate);` is `X && !X` → always `false`, and isn't even used. There is no gap detection; streak is just a cumulative solve counter. Skip 5 days, solve, and your "streak" goes up by 1.
- 🔴 **Daily loss isn't locked.** On a win, `dailySolved=true` and reload restores the solved state. On a *loss*, `dailySolved` stays `false`, so a reload re-initializes a fresh daily and you can retry until you win.
- 🟡 **Restored solved-state shows an empty board** (lines 71–75 set `won/gameOver` but never restore `guesses`).
- 🟡 Daily progress not persisted mid-game (shared cross-cutting issue).
- 🟢 `shareText()` exists but is not surfaced in the page (NOTES lists it as a TODO).
- ✅ `evaluateGuess` two-pass (correct→present) handling of duplicate letters is correct.

### 4. Minesweeper — `useMinesweeper.ts`
- 🔴 **Daily streak is farmable.** There is *no* `lastPlayedDate` check for minesweeper at all (lines 144–149 just do `getDailyStreak()+1`). Replay the daily (or remount the page) and win again → streak +1, infinitely, same day.
- 🔴 **Daily determinism breaks on first-click-safety.** When the first click lands on a mine, regeneration uses `seededRng(getDailySeed()*100 + Math.random()*1000)` (line 104) — `Math.random()` destroys the daily seed, and `seededRng` expects an integer. The "daily" board becomes non-deterministic the moment safety kicks in.
- 🟡 Streak never breaks on a skipped day (same family as Wordle; explicitly commented "not checking yesterday gap for brevity").
- 🟡 **Pause doesn't stop the timer.** `paused` blocks clicks but the interval keeps running; `setPaused` is never tied to `stopTimer`/`startTimer`.
- 🟢 Recursive `floodFill` on Hard (16×30) is fine but unbounded recursion; iterative stack would be safer.
- ✅ Chord (line 168) and flood reveal are correct.

### 5. Sudoku — `useSudoku.ts`
- 🔴 **Puzzles are not guaranteed to have a unique solution.** `generatePuzzle` removes cells and "trust[s] the count" (line 62, comment admits it) with no uniqueness check. Multi-solution / non-logical puzzles are possible.
- 🔴 **Win requires matching the one stored solution** (line 149). Combined with the above, a player who fills a *valid alternate* solution won't register a win. Maddening.
- 🟡 **Daily streak farmable** — increments on every daily completion (line 156) with no date check, no gap check, no replay lock. Remount = replay the same deterministic puzzle = streak +1.
- 🟡 **No mistake limit / lose state.** `mistakes` increments but nothing ever ends the game (most Sudoku apps cap at 3).
- 🟡 **No undo** — the brief explicitly expects undo in Sudoku. Not implemented.
- 🟡 Pause doesn't stop the timer (same as Minesweeper).
- 🟢 `streak` is read from localStorage during render (line 185) instead of via state — non-reactive and a render-time side read.

### 6. Block Blast — `useBlockBlast.ts`
- ✅ Placement, line-clear, combo scoring, and game-over detection are all correct and clean. Best game-over logic in the codebase.
- 🟡 No in-progress persistence (cross-cutting).
- 🟢 **No win/celebration overlay** — Block Blast is the *only* game that doesn't render `ConfettiOverlay`. It also can't "win" (endless), but a high-score moment would help.

### 7. Water Sort — `useWaterSort.ts`
- 🔴 **Puzzles can be generated unsolvable.** `generatePuzzle` just shuffles colors into tubes with no solvability guarantee and no solver. Random water-sort layouts are frequently impossible → dead-end forcing a restart.
- 🟡 **"Level-based" is a misnomer.** `level` is just a counter; `newPuzzle(diff, lvl)` ignores `lvl` and difficulty config never changes within a difficulty. Every "level" is the same size/complexity.
- 🟡 `restart` and `nextLevel` both call `newPuzzle` identically — "restart" gives you a *different* puzzle, not the same one.
- ✅ Undo stack works; pour logic correct.

### 8. Solitaire (Klondike) — `useSolitaire.ts`
- 🔴 **Best time is always ~0.** Line 101: `const startRef = { current: Date.now() };` is a plain object recreated on *every render*, not a `useRef`. `Date.now() - startRef.current` (line 195) ≈ 0, so best time records as `0:00` forever.
- 🟡 **`elapsed` is never updated** and there is **no timer UI** on the page (no `setInterval`, no display). The "best time" stat is both broken and invisible during play.
- 🟡 **No undo** — the brief explicitly expects undo in Solitaire. Not implemented.
- 🟡 No in-progress persistence (cross-cutting).
- ✅ Klondike rules (tableau build-down alternating colors, foundation by suit, K-on-empty, stock recycle, auto-to-foundation) are correct. `useCallback startTime` (line 100) is dead.

### 9. Hangman — `useHangman.ts`
- ✅ Solid. Wins + best streak persist correctly; 6-category × 3-difficulty word lists; win/lose handled.
- 🟢 PVP mode relies on the page to hide P1's typed word; verify the page actually masks input.

### 10. Dots & Boxes — `useDotsBoxes.ts`
- 🔴 **Wins never persisted** — no `storage` import. The home "wins vs AI" card is dead.
- 🟡 **No winner is computed in the hook** — `gameOver` is set but the winner must be derived from `scores` in the page; nothing records a result.
- ✅ Box-completion, extra-turn-on-claim, and the hard "avoid giving the 3rd side" heuristic are correct.

### 11. Battleship — `useBattleship.ts`
- 🔴 **PVP is a hard deadlock.** `fireAt` only has an `if (currentTurn === 1)` branch (line 213) and no handling for turn 2 in PVP; the AI effect returns early for `mode==='pvp'`. After P1 fires, nobody can move. There's also no pass-device screen and no second view model for two human boards. PVP Battleship is unplayable.
- 🔴 **Wins never persisted** — no `storage` import.
- ✅ AI (hunt/target, collinear lock on Hard, checkerboard hunt) is genuinely well done.

### 12. Checkers — `useCheckers.ts`
- 🔴 **Wins never persisted** — no `storage` import.
- 🟢 Forced multi-jumps, kinging, and minimax (depth 3/4 + alpha-beta) are correct. NOTES claims depth 6; code is depth 4 (doc drift).

### 13. Chess — `useChess.ts`
- 🔴 **Wins never persisted** — no `storage` import.
- 🟡 **Hard AI freezes the UI.** Depth-5 minimax runs **synchronously on the main thread** with a 2 s deadline — up to two seconds of frozen UI on a phone, no worker, no async yield.
- 🟡 **No promotion picker** — `handleCellClick` picks the first move matching the destination (line 415), which is always the queen promotion. Underpromotion is impossible.
- 🟢 Castling rook code (lines 230–232) sets the f-file square twice (the first using an already-nulled square via `!`); net-correct but dead/confusing.
- ✅ Otherwise impressively complete: en passant, castling legality (can't castle out of/through check), checkmate/stalemate, captured tracking.

---

## Phase 3 — Home Screen Audit

- ✅ All **13** cards present (`page.tsx`), 2-col grid → 3-col at `sm:`. Cards are 140px tall (tap target fine).
- 🟡 **Daily completion is not shown on any card.** Wordle shows a day-streak number; Minesweeper/Sudoku show a *best time* — not "✓ done today" and not the streak. There's no "come back tomorrow" signal, which is the whole point of a daily.
- 🟡 **Minesweeper & Sudoku home stats only read `'easy'` best time** (`page.tsx` lines 45, 50). A player who only plays Hard sees a blank card forever.
- 🟡 **Chess / Checkers / Battleship / Dots & Boxes cards are permanently blank** (stats never saved — see Phase 2).
- 🟢 No skeleton/loading state — cards show `"Play now →"` then flip to a stat after the `useEffect` read (minor, no layout shift thanks to fixed `minHeight`).
- 🟢 Branding is just an emoji + "Mini Games"; fine, but there's no header/nav on game pages (back is swipe- or button-only, inconsistently).
- 🟢 `GameCard` has a dead ternary: `color: accentStat ? accent : accent` (both branches identical).

---

## Phase 4 — PWA Audit

- 🔴 **No service worker.** Confirmed: zero references to `serviceWorker`, `workbox`, or `next-pwa` in `src`, `public`, or `next.config.ts`. **Offline does not work.** First and subsequent loads require network beyond the browser HTTP cache.
- 🔴 **Android installability is likely blocked** — Chrome requires a registered SW with a fetch handler to fire `beforeinstallprompt`. No SW → no native install prompt.
- 🔴 **Icons are SVG-only.** iOS ignores SVG `apple-touch-icon` → the installed icon is blank/letter. No 192/512 **PNG**, no **maskable** icon → Android shows a letterboxed icon in a white circle.
- 🟡 **No `viewport-fit=cover` + no safe-area insets**, but `apple-mobile-web-app-status-bar-style=black-translucent` is set → content renders **under** the iOS status bar/notch on every page.
- 🟡 **Fonts load from Google Fonts CDN** (`layout.tsx` lines 14–19) — a render-blocking network request that **fails offline** (falls back to system font). Should use `next/font` (self-hosted, offline-safe).
- 🟡 **No install-prompt UI** anywhere.
- ✅ Manifest has `display:standalone`, `start_url`, theme/background color, name/short_name. The basics are there; the icons and offline story are not.
- ✅ No runtime `fetch`/XHR in game code — so *if* a SW cached the shell + fonts, the games themselves would run offline. The plumbing is just missing.

---

## Phase 5 — Performance Audit

- ✅ **Route-level code splitting is automatic** (App Router) — each game is its own chunk. Bundle is tiny (only `next`/`react`/`react-dom`; no heavy deps).
- 🟡 **Chess Hard blocks the main thread** for up to 2 s (synchronous minimax). Checkers depth-4 is lighter but also synchronous. Move these to a Web Worker or yield with `requestIdleCallback`/`setTimeout` chunks.
- 🟢 **2048 writes localStorage on every move** (even non-best). Batch or write only on new best / game over.
- 🟢 **Sudoku reads localStorage during render** (`streak`, line 185) — move to state.
- 🟢 Minor CLS on the home grid (stat text swaps in post-mount); mitigated by fixed card height.
- ✅ No `<canvas>` in the codebase, so no DPR sizing concerns. Confetti is 25 divs for 2 s — negligible.

---

## Phase 6 — Consistency Audit

| Game | Pause menu | Win confetti | Back nav | Stats saved | Notable inconsistency |
|---|---|---|---|---|---|
| Tic-Tac-Toe | ✅ | ✅ | router | ✅ | — |
| 2048 | ✅ | ✅ | router | ✅ | no win state |
| Wordle | ❌ | ✅ | router | ⚠️ streak broken | share button hidden |
| Minesweeper | ✅ | ✅ | router | ⚠️ daily farmable | pause ≠ timer stop |
| Sudoku | ✅ | ✅ | router | ⚠️ daily farmable | no undo, no lose state |
| Block Blast | ✅ | ❌ **only game w/o confetti** | router | ✅ | — |
| Water Sort | ✅ | ✅ | router | ✅ | unsolvable puzzles |
| Solitaire | ✅ | ✅ | router | ⚠️ best time = 0 | no undo, no timer UI |
| Hangman | ❌ | ✅ | router | ✅ | — |
| Dots & Boxes | ❌ | ✅ | router | 🔴 never saved | — |
| Battleship | ❌ | ✅ | router | 🔴 never saved | PVP deadlocked |
| Checkers | ❌ | ✅ | router | 🔴 never saved | — |
| Chess | ❌ | ✅ | router | 🔴 never saved | UI freeze on Hard |

Patterns:
- **PauseMenu on only 7/13 games.** The 5 strategy games + Hangman use a "back to mode select" flow instead of the frosted PauseMenu — two different pause/menu paradigms.
- **Confetti everywhere except Block Blast.**
- **Stat persistence works for 6 games, is broken for 5** (4 never-saved + Solitaire-time), and is degraded for the 2 daily-streak games.
- **No game has instructions** — uniformly absent (consistent, but a shared gap).
- Inline-style vs Tailwind split is per-file arbitrary.

---

## Phase 7 — Prioritized Critical Issues

### 🔴 P0 — Broken (fix immediately)
1. **No service worker → no offline, no Android install.** The product's headline ("PWA you install and play anywhere") is non-functional. *(Phase 4)*
2. **Daily/Streak feature is fundamentally broken** for all 3 daily games: UTC-vs-local rollover, streaks that never break, and (MS/Sudoku) infinitely farmable daily. The marquee retention feature does not work as a streak. *(Phase 2)*
3. **PVP Battleship is unplayable** (turn-2 deadlock, no pass screen, no two-board model). *(Phase 2)*
4. **iOS install is visibly broken** — SVG `apple-touch-icon` (blank icon), no maskable icon, content under the notch. First impression of an installed app is broken. *(Phase 4)*

### 🟡 P1 — Degraded experience (fix before next release)
5. **Wins never saved** for Chess, Checkers, Battleship, Dots & Boxes (4 dead home cards). *(Phase 2/3)*
6. **Solitaire best time always 0:00** (`startRef` bug) + no timer UI. *(Phase 2)*
7. **No game survives a refresh** — add in-progress persistence, at minimum for the daily games. *(Phase 2)*
8. **Sudoku puzzles aren't uniqueness-checked** and win requires the exact stored solution → unsolvable/unwinnable states. *(Phase 2)*
9. **Water Sort can generate unsolvable boards.** *(Phase 2)*
10. **Chess Hard freezes the UI** up to 2 s (no worker). *(Phase 5)*
11. **Google Fonts CDN** blocks paint and fails offline — switch to `next/font`. *(Phase 4/5)*
12. **Home cards don't show daily completion**, and MS/Sudoku only read `'easy'` best time. *(Phase 3)*
13. **Sudoku has no undo / no mistake-limit; Solitaire has no undo** (brief explicitly expects undo in both). *(Phase 2)*
14. **Pause doesn't stop the timer** in Minesweeper/Sudoku. *(Phase 2)*

### 🟢 P2 — Polish / nice-to-have
15. Block Blast has no confetti/celebration.
16. No instructions/help on any game.
17. Unify pause UX (PauseMenu on only 7/13).
18. Surface the Wordle share button (already built in the hook).
19. 2048 `animating` dead code; writes best score every move; no 2048-tile win moment.
20. Wordle restored-solved board renders empty (doesn't restore guesses).
21. Haptics no-op on iOS; `AudioContext` never `resume()`d (unreliable iOS sound).
22. `GameCard` dead ternary; inline-style vs Tailwind cleanup; remove dead `storage` getters once wired.
23. Chess: add a promotion picker; clean up castling rook double-assignment.
24. Update `NOTES.md` (depth-6 claim, "8 games" brief, share-button TODO).

---

*Concrete code-level fixes for every P0/P1 item — with file paths, line numbers, and drop-in snippets — are in `FIXES.md`. New-game recommendations with the full evaluation matrix are in `NEW_GAMES.md`.*
