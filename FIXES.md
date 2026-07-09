# Mini Games — Concrete Fixes for P0 / P1
**Scope:** every 🔴 P0 and 🟡 P1 issue from `AUDIT_REPORT.md`, with file paths, line refs, and drop-in code.
**These are proposals — no code was changed in this session.**

---

## P0-1 · Add a service worker (real offline + Android install)

**Problem:** No SW anywhere → offline fails, Android won't show an install prompt.

**Files:** `public/sw.js` (new), `src/components/ServiceWorkerRegister.tsx` (new), `src/app/layout.tsx` (wire it in).

`public/sw.js`:
```js
const CACHE = 'minigames-v1';
const PRECACHE = ['/', '/manifest.json']; // App-shell; static chunks cached on first fetch below.

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate for same-origin GET (covers Next static chunks + routes).
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => { cache.put(request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
```

`src/components/ServiceWorkerRegister.tsx`:
```tsx
'use client';
import { useEffect } from 'react';
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
```

`src/app/layout.tsx` — add inside `<body>` next to `<SwipeBack />`:
```tsx
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
// ...
<body>
  <ServiceWorkerRegister />
  <SwipeBack />
  {children}
</body>
```

> If you'd rather not hand-roll: `npm i next-pwa` and wrap `next.config.ts`. Hand-rolled is fine here because there are no runtime `fetch` calls to worry about.

---

## P0-2 · Fix the Daily + Streak system (all 3 daily games)

This is three bugs in one feature. Fix them in shared code first, then wire each hook.

### 2a · Day rollover must be local, not UTC — `src/lib/dateUtils.ts`

**Problem (lines 4–6, 26–28):** `getDayIndex`/`getDailySeed` use `Date.now() - EPOCH` (UTC), but `getTodayString` (lines 8–11) uses local `getDate()`. The puzzle changes at UTC midnight; the streak "day" changes at local midnight. For US users the daily flips in the early evening.

Replace the day math with a **local-midnight day number** and reuse it everywhere:
```ts
const MS_PER_DAY = 86400000;

// Local-midnight day number, consistent with getTodayString().
export function getLocalDayNumber(d: Date = new Date()): number {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate()); // local midnight
  return Math.floor(local.getTime() / MS_PER_DAY);
}

export function getDayIndex(listLength: number): number {
  // Anchor so the index is stable; any fixed offset works.
  return ((getLocalDayNumber() % listLength) + listLength) % listLength;
}

export function getDailySeed(): number {
  return getLocalDayNumber();
}
```
Now `getDailySeed()`, `getDayIndex()`, and `getTodayString()` all roll over at the same instant (local midnight).

### 2b · Make streaks actually break — shared helper in `dateUtils.ts`

Add:
```ts
// Returns the new streak given the last completion date string (YYYY-MM-DD).
export function nextStreak(lastDate: string, prevStreak: number): number {
  if (!lastDate) return 1;                       // first ever
  const today = getLocalDayNumber();
  const last = getLocalDayNumber(new Date(lastDate + 'T00:00:00'));
  if (last === today) return prevStreak;         // already counted today
  if (last === today - 1) return prevStreak + 1; // consecutive day
  return 1;                                       // gap → reset
}
```

### 2c · Wordle — `src/hooks/useWordle.ts`
Delete the dead line 120 (`wasYesterday`). Replace the win block (lines 117–131):
```ts
if (mode === 'daily') {
  const today = getTodayString();
  const lastDate = storage.wordle.getLastPlayedDate();
  if (lastDate === today) return; // already played today's daily — no double count
  const newStreak = nextStreak(lastDate, storage.wordle.getDailyStreak());
  const newBest = Math.max(bestStreak, newStreak);
  setStreak(newStreak); setBestStreak(newBest);
  storage.wordle.setDailyStreak(newStreak);
  storage.wordle.setBestStreak(newBest);
  storage.wordle.setLastPlayedDate(today);
  storage.wordle.setDailySolved(true);
  storage.wordle.setGamesPlayed(storage.wordle.getGamesPlayed() + 1);
  storage.wordle.setWins(storage.wordle.getWins() + 1);
}
```
And lock **losses** too (lines 132–140): on the 6th wrong guess set `setDailySolved(true)` (treat "attempted today" as locked) and persist the guesses (see P1-7) so a reload restores the finished board instead of letting the player retry.

### 2d · Minesweeper — `src/hooks/useMinesweeper.ts`
Add date-lock + real streak to the daily win (lines 144–149):
```ts
if (mode === 'daily') {
  const today = getTodayString();
  if (storage.minesweeper.getLastDaily?.() === today) return; // add getter/setter to storage.ts
  const s = nextStreak(storage.minesweeper.getLastDaily?.() ?? '', storage.minesweeper.getDailyStreak());
  storage.minesweeper.setDailyStreak(s);
  storage.minesweeper.setLastDaily(today);
}
```
Add to `storage.ts` under `minesweeper`: `getLastDaily`/`setLastDaily` (string) and a `getDailyDone(today)` check so the page can show "done today" and block replay.

Also fix the **determinism break** (lines 103–106): never use `Math.random()` for a daily. Use a deterministic re-roll:
```ts
let attempt = 0;
let g = buildGrid(rows, cols, mines, rng);
while (g[safeR][safeC].mine) {
  attempt++;
  rng = mode === 'daily'
    ? seededRng(getDailySeed() * 100 + ['easy','medium','hard'].indexOf(difficulty) + attempt * 7919)
    : undefined;
  g = buildGrid(rows, cols, mines, rng);
}
```

### 2e · Sudoku — `src/hooks/useSudoku.ts`
Same treatment as Minesweeper at the win block (lines 156–158): check/set a `lastDaily` date, use `nextStreak`, and block re-completion of today's daily. Add `getLastDaily`/`setLastDaily` to `storage.ts` under `sudoku`. Move the render-time read of `streak` (line 185) into state initialized from storage.

---

## P0-3 · Fix PVP Battleship — `src/hooks/useBattleship.ts`

**Problem:** `fireAt` only handles `currentTurn === 1` (line 213); in PVP, player 2 can never fire. There's also no second board model for two humans and no pass-device screen.

Minimum viable fix — model **two human boards** and route `fireAt` by turn:
1. You already have `playerBoard` (P1) and `p2Board`/`opponentBoard` (P2). Keep two views: `p1View` (what P1 sees of P2) and `p2View` (what P2 sees of P1).
2. Generalize `fireAt`:
```ts
const fireAt = useCallback((row, col) => {
  if (phase !== 'battle' || winner || aiThinking) return;
  const attackerView = currentTurn === 1 ? p1View : p2View;
  const defenderBoard = currentTurn === 1 ? opponentBoard : playerBoard;
  if (attackerView[row][col] !== 'empty') return;
  // ...apply hit/miss/sunk to the correct view + board (same logic as today)...
  // on all-sunk: setWinner(currentTurn); setPhase('gameover'); return;
  if (mode === 'pvp') setPvpPhase(currentTurn === 1 ? 'p2pass' : 'p1pass'); // show pass screen
  setCurrentTurn(currentTurn === 1 ? 2 : 1);
}, [phase, winner, aiThinking, currentTurn, p1View, p2View, opponentBoard, playerBoard, mode]);
```
3. Add a "Pass device to Player N — tap when ready" gate keyed on `pvpPhase === 'p1pass' | 'p2pass'` in `battleship/page.tsx` so neither player sees the other's board.

AI mode is already correct and untouched.

---

## P0-4 · Fix PWA icons + iOS notch

### 4a · Real icons — `public/icons/` + `public/manifest.json`
Generate PNGs (192, 512) and a 512 **maskable** (with safe padding). Then:
```json
{
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
`src/app/layout.tsx` line 24 — point `apple-touch-icon` at a **PNG** (iOS ignores SVG):
```tsx
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### 4b · Notch / safe-area — `src/app/layout.tsx` + `src/app/globals.css`
Add a proper viewport (App Router supports a `viewport` export):
```tsx
import type { Viewport } from 'next';
export const viewport: Viewport = {
  themeColor: '#0f172a',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};
```
Then pad for the status bar in `globals.css`:
```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```
(You can drop the manual `<meta name="theme-color">` once it's in the `viewport` export.)

---

## P1-5 · Persist wins for Chess / Checkers / Battleship / Dots & Boxes

**Problem:** these 4 hooks never `import { storage }`. The getters/setters already exist in `storage.ts` (lines 98–113) and are dead.

In each hook, on the win path, record the AI win. Example — `useChess.ts` (player-side checkmate, around line 446–448, and the AI-effect mate at lines 510–512):
```ts
import { storage } from '@/lib/storage';
// when winner === 'white' && mode === 'ai':
storage.chess.setWins(storage.chess.getWins() + 1);
```
Do the equivalent:
- `useCheckers.ts` — when `winner === 1 && mode === 'ai'` (lines 248–250 and 291–293): `storage.checkers.setWins(...)`.
- `useBattleship.ts` — when `winner === 1 && mode === 'ai'` (lines 233–235): `storage.battleship.setWins(...)`.
- `useDotsBoxes.ts` — on `gameOver` when `scores[0] > scores[1] && mode === 'ai'` (lines 136–139, 216–220): `storage.dotsboxes.setWins(...)`.

Guard each so it fires **once** per game (e.g., set a `recordedRef`), since the AI effect can re-run.

---

## P1-6 · Fix Solitaire timer — `src/hooks/useSolitaire.ts`

**Problem:** line 101 `const startRef = { current: Date.now() };` is recreated every render → best time ≈ 0.

Use a real ref + a ticking `elapsed`, and show it on the page:
```ts
import { useRef, useEffect } from 'react';
const startRef = useRef<number>(Date.now());
const [elapsed, setElapsed] = useState(0);

useEffect(() => {
  if (state.won || paused) return;
  const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
  return () => clearInterval(id);
}, [state.won, paused]);
```
On `restart` set `startRef.current = Date.now(); setElapsed(0);`. Use `Math.floor((Date.now() - startRef.current)/1000)` for the win time (lines 195). Remove the dead `startTime` `useCallback` (line 100). Add a timer readout in `solitaire/page.tsx` (it currently has none).

---

## P1-7 · Persist in-progress state (at least the daily games)

**Problem:** no hook serializes its board; every refresh resets the game.

Add a tiny generic helper and use it where it matters most (daily Wordle/Minesweeper/Sudoku, then 2048/Block Blast/Solitaire). Example pattern for Wordle:
```ts
// save after each guess:
storage.setItem('wordle', mode === 'daily' ? `daily:${getTodayString()}` : 'random:state',
  { guesses, gameOver, won, target });
// on mount, if a saved blob exists for today's daily, hydrate guesses/letterMap/gameOver/won.
```
For the daily games this also closes the "replay after refresh" hole from P0-2. Key daily blobs by date so they self-expire.

---

## P1-8 · Sudoku: unique solutions + win on any valid solution — `src/hooks/useSudoku.ts`

**Problem:** `generatePuzzle` (lines 48–67) "trusts the count"; multiple solutions are possible, and the win check (line 149) compares against one stored grid.

Add a solution **counter** and only remove a cell if the puzzle stays unique:
```ts
function countSolutions(grid: Grid, limit = 2): number {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (grid[r][c] === 0) {
      let count = 0;
      for (let n = 1; n <= 9; n++) {
        if (isValid(grid, r, c, n)) {
          grid[r][c] = n;
          count += countSolutions(grid, limit);
          grid[r][c] = 0;
          if (count >= limit) return count;
        }
      }
      return count;
    }
  }
  return 1;
}
// in generatePuzzle: tentatively clear a cell, keep it cleared only if countSolutions(copy,2)===1.
```
Then change the win check to "every cell filled **and valid**" rather than "matches the stored solution":
```ts
const full = next.every(row => row.every(v => v !== 0));
const valid = full && next.every((row, r) => row.every((v, c) => {
  const g = next.map(rr => [...rr]); g[r][c] = 0; return isValid(g, r, c, v);
}));
if (valid) { /* win */ }
```
While here: add a **mistake cap** (e.g., 3 → lose) and an **undo** stack (push `userGrid` before each `inputNumber`).

---

## P1-9 · Water Sort: guarantee solvable puzzles — `src/hooks/useWaterSort.ts`

**Problem:** `generatePuzzle` (lines 24–50) shuffles with no solvability guarantee.

Two safe options:
- **Generate by reverse play:** start from the solved state (each color in its own tube) and apply N random *legal* pours backward; the result is always solvable. Preferred — also lets `level`/difficulty scale by N.
- **Or** keep random generation but validate with a quick BFS/DFS solver and re-roll until solvable (cap attempts).

This also lets you make "Level-based" real: scale `N` (and tube/color counts) with `level` instead of ignoring it (`newPuzzle` currently ignores its `lvl` arg, lines 83–89).

---

## P1-10 · Chess Hard: stop freezing the UI — `src/hooks/useChess.ts`

**Problem:** depth-5 minimax (lines 304–374) runs synchronously; up to 2 s of frozen UI.

Best: move `getAIMove` into a **Web Worker** (`public/chess-worker.js` or a `new Worker(new URL(...))`), post the board, receive the move. Keep the `aiThinking` spinner you already have.
Cheaper interim: lower Hard to depth 4, and/or yield between root moves with `await new Promise(r => setTimeout(r))` so the event loop can paint the "thinking…" state. The 2 s deadline (line 363) should stay as a safety net.

---

## P1-11 · Self-host the font — `src/app/layout.tsx`

**Problem:** lines 14–19 load Nunito from Google Fonts CDN — render-blocking and offline-broken.

```tsx
import { Nunito } from 'next/font/google';
const nunito = Nunito({ subsets: ['latin'], weight: ['400','600','700','800','900'], display: 'swap' });
// <html lang="en" className={nunito.className}>  and delete the three <link> tags.
```
`next/font` self-hosts at build time → no network, no layout shift, works offline.

---

## P1-12 · Home: show daily completion + don't hard-code 'easy'

**File:** `src/app/page.tsx`.
- For Minesweeper (line 45) and Sudoku (line 50), read the **best across all difficulties** (like Water Sort already does at lines 57–61), or show the **daily streak / "✓ done today"** instead of an easy-only best time.
- Add a "done today" badge: read `lastDaily === getTodayString()` (after adding the storage getters from P0-2d/2e) and render a small ✓ on the Wordle/Minesweeper/Sudoku cards. This is the retention hook the daily games are missing.

---

## P1-13 · Add undo (Sudoku + Solitaire) and a Sudoku lose state

- **Sudoku** (`useSudoku.ts`): push `userGrid`/`notes` onto a history stack in `inputNumber`; add `undo()`. Add `mistakes >= 3 → lost` state and surface it in the page.
- **Solitaire** (`useSolitaire.ts`): snapshot `state` before each mutating action (`drawFromStock`, `moveToFoundation`, `moveToTableau`) into a stack; add `undo()`. Wire a button in `solitaire/page.tsx`.

---

## P1-14 · Pause should stop the clock — `useMinesweeper.ts` + `useSudoku.ts`

**Problem:** `paused` blocks input but the interval keeps ticking.

Drive the timer off `paused`:
```ts
useEffect(() => {
  if (!started || gameOver || won || paused) { stopTimer(); return; }
  startTimer();
  return stopTimer;
}, [started, gameOver, won, paused]);
```
And accumulate elapsed across pauses by storing `elapsedAtPause` rather than recomputing from a single start time. (Minesweeper's `startTimer` already offsets by `elapsed` at line 86, so it's close — just gate it on `paused`.)

---

### Suggested order of operations
1. **P0-2 (dateUtils)** first — it's shared and unblocks all three daily games.
2. **P0-1 (service worker)** + **P0-4 (icons/notch)** — ship the "real PWA" together.
3. **P1-5** (wins) and **P1-6** (Solitaire timer) — small, high-visibility wins.
4. **P0-3** (PVP Battleship), **P1-8/9** (Sudoku/Water Sort generators) — larger logic work.
5. The rest as polish.

Every reference above is to the code as read on 2026-06-24; line numbers will drift as you edit.
