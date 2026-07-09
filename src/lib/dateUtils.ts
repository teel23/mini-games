const MS_PER_DAY = 86400000;

// Local-midnight day number — consistent with getTodayString() so the daily
// puzzle and the streak clock roll over at the SAME instant (local midnight).
export function getLocalDayNumber(d: Date = new Date()): number {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate()); // local midnight
  return Math.floor(local.getTime() / MS_PER_DAY);
}

export function getDayIndex(listLength: number): number {
  return ((getLocalDayNumber() % listLength) + listLength) % listLength;
}

export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isNewDay(lastDate: string): boolean {
  return lastDate !== getTodayString();
}

// Seeded RNG for daily puzzles (deterministic integer seed in, [0,1) out)
export function seededRng(seed: number): () => number {
  let s = Math.floor(seed) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function getDailySeed(): number {
  return getLocalDayNumber();
}

// Given the last completion date (YYYY-MM-DD) and the previous streak, return
// the new streak. Same day = unchanged; consecutive day = +1; any gap = reset to 1.
export function nextStreak(lastDate: string, prevStreak: number): number {
  if (!lastDate) return 1;
  const today = getLocalDayNumber();
  const last = getLocalDayNumber(new Date(lastDate + 'T00:00:00'));
  if (last === today) return prevStreak;
  if (last === today - 1) return prevStreak + 1;
  return 1;
}
