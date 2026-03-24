# Mini Games — Project Notes
> Reference for jumping back into this project.
> Last updated: March 16, 2026 (Full polish sprint — deployed live)

---

## What It Is
A collection of 13 browser-based mini games. Playful colorful design, phone-first, no accounts. All scores and streaks stored in `localStorage`. No Supabase — local only for phase 1.

## Live URL
🌐 **https://games.c2tbuilds.com** ✅ Live on Vercel

## GitHub
📁 **https://github.com/teel23/mini-games**

## Local Path
`/COMPUTER/AI/Projects/mini-games/`

---

## Tech Stack
Next.js 16 · TypeScript · Tailwind CSS · localStorage · Vercel

---

## Status
✅ **Live at games.c2tbuilds.com** — Vercel auto-deploys on push to `main`
✅ **Portfolio card** — screenshot added (`mini-games-real.png`), description updated to "13 games"

---

## Games (all complete)
| # | Game | Accent | Modes | Stats Tracked |
|---|---|---|---|---|
| 1 | Tic-Tac-Toe | `#60a5fa` | vs AI (easy/medium/hard minimax), vs Friend | Wins vs AI |
| 2 | 2048 | `#f97316` | 4×4, 5×5 | Best score per mode |
| 3 | Wordle | `#22c55e` | Daily (seeded by date), Random | Daily streak, best streak, win % |
| 4 | Minesweeper | `#ef4444` | Easy/Medium/Hard × Daily/Random | Best time per difficulty, daily streak |
| 5 | Sudoku | `#a78bfa` | Easy/Medium/Hard/Expert × Daily/Random | Best time per difficulty, daily streak |
| 6 | Block Blast | `#eab308` | Endless | Best score |
| 7 | Water Sort | `#06b6d4` | Level-based (Easy/Medium/Hard) | Highest level per difficulty |
| 8 | Solitaire | `#10b981` | Draw-1 or Draw-3 | Games won, best time |
| 9 | Hangman | `#f43f5e` | P1vP2 (P1 enters word), vs AI (Easy/Med/Hard) | Wins vs AI, best streak |
| 10 | Dots & Boxes | `#8b5cf6` | P1vP2 pass-and-play, vs AI (Easy/Med/Hard) | Wins vs AI |
| 11 | Battleship | `#06b6d4` | P1vP2 pass-and-play, vs AI (Easy/Med/Hard) | Wins vs AI |
| 12 | Checkers | `#dc2626` | P1vP2 pass-and-play, vs AI (Easy/Med/Hard) | Wins vs AI |
| 13 | Chess | `#f59e0b` | P1vP2 pass-and-play, vs AI (Easy/Med/Hard) | Wins vs AI |

---

## Architecture
```
src/
  app/
    page.tsx              ← Home grid (reads localStorage stats, sound toggle)
    tic-tac-toe/page.tsx
    2048/page.tsx
    wordle/page.tsx
    minesweeper/page.tsx
    sudoku/page.tsx
    block-blast/page.tsx
    water-sort/page.tsx
    solitaire/page.tsx
    hangman/page.tsx
    dots-boxes/page.tsx
    battleship/page.tsx
    checkers/page.tsx
    chess/page.tsx
  hooks/
    useTicTacToe.ts       ← minimax AI
    use2048.ts            ← grid logic + swipe + mergedPositions/newPositions sets
    useWordle.ts          ← daily seed + evaluation
    useMinesweeper.ts     ← flood fill + long-press flag
    useSudoku.ts          ← puzzle gen + notes mode
    useBlockBlast.ts      ← 18 shapes + line clear scoring
    useWaterSort.ts       ← pour logic + undo stack
    useSolitaire.ts       ← full Klondike rules
    useHangman.ts         ← categorized word lists + SVG figure
    useDotsBoxes.ts       ← greedy/chain-avoidance AI
    useBattleship.ts      ← hunt+target AI, ship placement
    useCheckers.ts        ← forced captures, kings, minimax depth 6 + alpha-beta
    useChess.ts           ← en passant, castling, promotion, checkmate/stalemate; 2s deadline guard
  components/
    GameCard.tsx          ← accent-colored gradient card
    PauseMenu.tsx         ← frosted glass overlay
    ConfettiOverlay.tsx   ← 25 colored divs, CSS confetti keyframe, active prop
    SwipeBack.tsx         ← left-edge 30px touch → 80px rightward swipe → router.push('/')
  lib/
    storage.ts            ← typed localStorage helpers (minigames:game:stat)
    dateUtils.ts          ← daily seeding: (Date.now() - epoch) / 86400000 % len
    wordList.ts           ← 365 daily words + ~2000 valid guesses
    haptics.ts            ← haptic.light/medium/heavy/win/error() → navigator.vibrate()
    sounds.ts             ← Web Audio API synthesis: playTick/Success/Error/Win/Flag()
  app/
    globals.css           ← keyframes: tileAppear, tileMerge, confetti, shakeBoard, pourDrip
    layout.tsx            ← PWA meta tags, SwipeBack component
  public/
    manifest.json         ← PWA manifest (display: standalone, #0f172a bg)
    icons/icon-192.svg    ← dark bg + 🎮 emoji
    icons/icon-512.svg
```

## localStorage Key Format
All keys: `minigames:{game}:{stat}` — e.g. `minigames:wordle:dailyStreak`
Sound toggle: `minigames:sound:enabled` (🔊/🔇 on home page)

## Build Note
iCloud path spaces break `npm run build` locally. Always:
```bash
rsync -a --exclude=node_modules "/path/to/mini-games/" /tmp/mini-games-build/
cd /tmp/mini-games-build && npm install && npm run build
```

---

## Recent Changes
| Date | What Changed |
|---|---|
| Mar 9, 2026 | Created `teel23/mini-games` GitHub repo (scaffold README only) |
| Mar 11, 2026 | **Full build** — all 8 games, clean Next.js 16 build (0 TS errors). Pushed. |
| Mar 11, 2026 | Promoted to live projects on portfolio |
| Mar 12, 2026 | **Major overhaul** — 5 new games (Hangman, Dots & Boxes, Battleship, Checkers, Chess), mobile audit + fixes, full UI redesign (Nunito font, navy gradient bg, per-game accent cards, frosted glass PauseMenu, entrance animations). 13 total, 0 errors. |
| Mar 16, 2026 | **Full polish sprint** — haptics, Web Audio sounds, ConfettiOverlay, SwipeBack, PWA manifest, 2048 tile animations, Solitaire pointer drag-and-drop, Block Blast touch drag via elementFromPoint, Water Sort pour drip, Chess 2s AI deadline guard, per-game win/lose effects. Sound toggle on home page. Home page stats for all 13 games. |
| Mar 16, 2026 | Connected to Vercel ✅ — games.c2tbuilds.com live |
| Mar 16, 2026 | Portfolio updated — screenshot `mini-games-real.png` added, description updated to "13 games" |
| Mar 23, 2026 | **Full mobile/touch audit** — 8 files fixed. Solitaire: rewrote drag-and-drop with drag threshold + dragRef pattern to fix race condition where onPointerUp was unregistered on quick taps, causing card moves to be swallowed; also fixed double-event (onClick + pointer) conflict. 2048: added touch-action:none to swipe area (was scroll-fighting). Battleship: touch-action:manipulation on placement grid + enlarged orientation toggle. Dots & Boxes: hit area 26→42px for line taps. Minesweeper/Sudoku/Wordle: all control buttons now minHeight:44. Block Blast: touch-action:manipulation on piece tray buttons. 0 TS errors. |

---

## Open Items
- [ ] Phase 2: Supabase leaderboards (2048, Wordle, Minesweeper best times)
- [ ] Phase 2: Wordle share button (copy colored grid to clipboard)
- [ ] Phase 2: `/stats` page showing all-time records across all 13 games
