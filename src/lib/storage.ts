'use client';

const PREFIX = 'minigames';

function key(game: string, stat: string): string {
  return `${PREFIX}:${game}:${stat}`;
}

export function getItem<T>(game: string, stat: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key(game, stat));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setItem<T>(game: string, stat: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key(game, stat), JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

export function removeItem(game: string, stat: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key(game, stat));
}

// Typed helpers for each game
export const storage = {
  '2048': {
    getBestScore: (mode: '4x4' | '5x5') =>
      getItem<number>('2048', mode === '4x4' ? 'bestScore' : 'bigBoard:bestScore', 0),
    setBestScore: (mode: '4x4' | '5x5', score: number) =>
      setItem('2048', mode === '4x4' ? 'bestScore' : 'bigBoard:bestScore', score),
  },
  wordle: {
    getDailyStreak: () => getItem<number>('wordle', 'dailyStreak', 0),
    setDailyStreak: (v: number) => setItem('wordle', 'dailyStreak', v),
    getBestStreak: () => getItem<number>('wordle', 'bestStreak', 0),
    setBestStreak: (v: number) => setItem('wordle', 'bestStreak', v),
    getLastPlayedDate: () => getItem<string>('wordle', 'lastPlayedDate', ''),
    setLastPlayedDate: (v: string) => setItem('wordle', 'lastPlayedDate', v),
    getDailySolved: () => getItem<boolean>('wordle', 'dailySolved', false),
    setDailySolved: (v: boolean) => setItem('wordle', 'dailySolved', v),
    getGamesPlayed: () => getItem<number>('wordle', 'gamesPlayed', 0),
    setGamesPlayed: (v: number) => setItem('wordle', 'gamesPlayed', v),
    getWins: () => getItem<number>('wordle', 'wins', 0),
    setWins: (v: number) => setItem('wordle', 'wins', v),
  },
  minesweeper: {
    getBestTime: (diff: 'easy' | 'medium' | 'hard') =>
      getItem<number>('minesweeper', `bestTime:${diff}`, Infinity),
    setBestTime: (diff: 'easy' | 'medium' | 'hard', t: number) =>
      setItem('minesweeper', `bestTime:${diff}`, t),
    getDailyStreak: () => getItem<number>('minesweeper', 'dailyStreak', 0),
    setDailyStreak: (v: number) => setItem('minesweeper', 'dailyStreak', v),
  },
  sudoku: {
    getBestTime: (diff: 'easy' | 'medium' | 'hard' | 'expert') =>
      getItem<number>('sudoku', `bestTime:${diff}`, Infinity),
    setBestTime: (diff: 'easy' | 'medium' | 'hard' | 'expert', t: number) =>
      setItem('sudoku', `bestTime:${diff}`, t),
    getDailyStreak: () => getItem<number>('sudoku', 'dailyStreak', 0),
    setDailyStreak: (v: number) => setItem('sudoku', 'dailyStreak', v),
  },
  solitaire: {
    getBestTime: () => getItem<number>('solitaire', 'bestTime', Infinity),
    setBestTime: (v: number) => setItem('solitaire', 'bestTime', v),
    getGamesWon: () => getItem<number>('solitaire', 'gamesWon', 0),
    setGamesWon: (v: number) => setItem('solitaire', 'gamesWon', v),
  },
  watersort: {
    getHighestLevel: (diff: 'easy' | 'medium' | 'hard') =>
      getItem<number>('watersort', `highestLevel:${diff}`, 0),
    setHighestLevel: (diff: 'easy' | 'medium' | 'hard', v: number) =>
      setItem('watersort', `highestLevel:${diff}`, v),
  },
  blockblast: {
    getBestScore: () => getItem<number>('blockblast', 'bestScore', 0),
    setBestScore: (v: number) => setItem('blockblast', 'bestScore', v),
  },
  tictactoe: {
    getWinsVsAI: () => getItem<number>('tictactoe', 'winsVsAI', 0),
    setWinsVsAI: (v: number) => setItem('tictactoe', 'winsVsAI', v),
  },
  hangman: {
    getWins: () => getItem<number>('hangman', 'wins', 0),
    setWins: (v: number) => setItem('hangman', 'wins', v),
    getBestStreak: () => getItem<number>('hangman', 'bestStreak', 0),
    setBestStreak: (v: number) => setItem('hangman', 'bestStreak', v),
  },
  dotsboxes: {
    getWins: () => getItem<number>('dotsboxes', 'wins', 0),
    setWins: (v: number) => setItem('dotsboxes', 'wins', v),
  },
  battleship: {
    getWins: () => getItem<number>('battleship', 'wins', 0),
    setWins: (v: number) => setItem('battleship', 'wins', v),
  },
  checkers: {
    getWins: () => getItem<number>('checkers', 'wins', 0),
    setWins: (v: number) => setItem('checkers', 'wins', v),
  },
  chess: {
    getWins: () => getItem<number>('chess', 'wins', 0),
    setWins: (v: number) => setItem('chess', 'wins', v),
  },
};
