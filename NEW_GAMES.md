# Mini Games — New Game Recommendations
**Date:** 2026-06-24
**Goal:** add 5–8 games that are mobile-first, touch-friendly, dark-mode-native, account-free, understandable in seconds, and satisfying in under 5 minutes — while **filling gaps** the current 13 don't cover.

## What the library already covers (so we don't repeat it)
| Niche | Covered by |
|---|---|
| Tile-merge | 2048 |
| Word / letter guessing | Wordle, Hangman |
| Logic deduction (grid) | Minesweeper, Sudoku |
| Spatial packing | Block Blast, Water Sort |
| Card | Solitaire |
| Abstract 2-player strategy | Chess, Checkers, Dots & Boxes, Battleship, Tic-Tac-Toe |

**Genuine gaps:** picture-logic puzzles, path/flow connection, memory, *real-time reflex/arcade* (the library has zero), tile-matching (vs. card), and a **second daily-with-streak** game (only 3 of 13 are daily, and that feature is currently broken — see audit). The picks below target those gaps.

---

## The 7 recommendations

### 1. Nonogram (Picross)
Fill a grid from numeric row/column clues to reveal a picture.
- **Why it fits:** pure tap/long-press (fill vs. mark-X), reads beautifully in dark mode, no text, deeply satisfying "picture appears" payoff.
- **Complexity:** Medium (clue generation + solver-for-uniqueness; rendering is trivial).
- **Daily puzzle:** **Yes** — one seeded picture per day.
- **Streak:** **Yes.**
- **Unique value:** picture-logic — distinct from Minesweeper (no probability) and Sudoku (no number placement). Adds a second strong daily.

### 2. Flow / Pipes (connect the dots)
Drag to connect matching color pairs (Flow) or rotate tiles to complete a network (Pipes), filling the board.
- **Why it fits:** touch-drag is the *core* mechanic — feels native; instant to understand; one board ≈ 1–2 min.
- **Complexity:** Medium (level/solvability generation is the work; UI is simple).
- **Daily puzzle:** **Yes.**
- **Streak:** Optional (works better as level-progression, like Water Sort).
- **Unique value:** path-routing — a mechanic nothing in the library has, and the drag interaction complements the tap-heavy roster.

### 3. Daily Grouping ("Connections", icon edition)
16 tiles, find the 4 hidden groups of 4. Use **emoji/icons/colors** instead of words.
- **Why it fits:** all tapping, 4 mistakes max, ~3 min, hugely shareable (the colored-grid result).
- **Complexity:** Medium-High (authoring good non-trivial groupings is the real cost; engine is easy).
- **Daily puzzle:** **Yes** (this is the format).
- **Streak:** **Yes** — strong.
- **Unique value:** categorization/grouping — *not* a word-guessing game, so it doesn't overlap Wordle/Hangman. Using icons keeps it language-free and on-brand. Biggest retention upside of any pick.

### 4. Snake (endless arcade)
Swipe to steer; eat, grow, don't crash.
- **Why it fits:** swipe controls already proven in 2048; zero instructions; high-score loop; a *different mood* (fast, twitchy) from the cerebral roster.
- **Complexity:** Low-Medium.
- **Daily puzzle:** No.
- **Streak:** No (high-score / personal best).
- **Unique value:** the library has **no real-time/reflex game at all**. Snake adds an entire missing category cheaply.

### 5. Memory Match (Concentration)
Flip cards two at a time, find all pairs in the fewest moves / fastest time.
- **Why it fits:** the simplest possible touch loop; great for a 60-second session; the card-flip animation is a satisfying showcase for the existing animation system.
- **Complexity:** Low.
- **Daily puzzle:** Limited (a daily "par moves" challenge is possible).
- **Streak:** Weak (better as best-time/fewest-moves).
- **Unique value:** memory — an untouched mechanic; lowest build cost on this list; good "casual on-ramp" for the home grid.

### 6. Lights Out
Tap a cell to toggle it and its neighbors; turn the whole grid off.
- **Why it fits:** one-tap interaction, tiny rules, "aha" solving, fast rounds.
- **Complexity:** Low-Medium (guaranteed-solvable generation via random valid toggles — same reverse-generation trick recommended for Water Sort).
- **Daily puzzle:** **Yes.**
- **Streak:** **Yes.**
- **Unique value:** parity/toggle logic — different from every existing puzzle; another cheap daily to bulk up that roster.

### 7. Mahjong Solitaire
Clear a layered tile pyramid by matching free pairs.
- **Why it fits:** pure tap-to-match, visually rich in dark mode, relaxing 3–5 min sessions; pairs naturally with the existing Solitaire card games.
- **Complexity:** Medium (layout + free-tile detection + solvable-shuffle guarantee).
- **Daily puzzle:** **Yes** (seeded layout).
- **Streak:** Optional.
- **Unique value:** tile-matching (vs. card Solitaire) — a recognizable, sticky classic that broadens the "relaxing" end of the library.

---

## Evaluation matrix

| # | Game | Fits mobile/touch | Complexity | Daily | Streak | Fills which gap |
|---|------|:--:|:--:|:--:|:--:|---|
| 1 | Nonogram (Picross) | ✅ | Medium | ✅ | ✅ | Picture-logic; 2nd strong daily |
| 2 | Flow / Pipes | ✅ (drag) | Medium | ✅ | ➖ | Path-routing; drag mechanic |
| 3 | Daily Grouping (icons) | ✅ | Med-High | ✅ | ✅ | Categorization; shareable daily |
| 4 | Snake | ✅ (swipe) | Low-Med | ❌ | ❌* | **Real-time/reflex (none today)** |
| 5 | Memory Match | ✅ | Low | ➖ | ➖ | Memory; cheapest build |
| 6 | Lights Out | ✅ | Low-Med | ✅ | ✅ | Toggle/parity logic; cheap daily |
| 7 | Mahjong Solitaire | ✅ | Medium | ✅ | ➖ | Tile-matching (vs. card) |

\* high-score / personal-best rather than a day streak.

---

## Recommended build order
1. **Daily Grouping (icons)** — highest retention upside; turns the under-used "daily + streak" system into a real habit loop. *(Build only after the daily/streak bugs in the audit are fixed.)*
2. **Snake** — fills the entire missing reflex category for low cost; adds variety to a puzzle-heavy grid.
3. **Nonogram** + **Lights Out** — two more solid dailies; both reuse the "reverse-generate for guaranteed-solvable" pattern you'll also want for Water Sort.
4. **Memory Match** — quick win, lowest cost, nice casual on-ramp.
5. **Flow/Pipes** and **Mahjong Solitaire** — higher-effort, higher-polish additions once the core library is healthy.

**One caveat:** every new daily game inherits the **broken daily/streak engine** documented in `AUDIT_REPORT.md` / `FIXES.md` (P0-2). Fix that first, or you'll ship the same UTC-rollover, never-breaking, farmable-streak bugs into each new title.
