const EPOCH = new Date('2024-01-01').getTime();
const MS_PER_DAY = 86400000;

export function getDayIndex(listLength: number): number {
  return Math.floor((Date.now() - EPOCH) / MS_PER_DAY) % listLength;
}

export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isNewDay(lastDate: string): boolean {
  return lastDate !== getTodayString();
}

// Seeded RNG for daily puzzles
export function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function getDailySeed(): number {
  return Math.floor((Date.now() - EPOCH) / MS_PER_DAY);
}
