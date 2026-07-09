'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { seededRng, getDailySeed, getTodayString, nextStreak } from '@/lib/dateUtils';
import { storage } from '@/lib/storage';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type GameMode = 'daily' | 'random';

const CLUE_COUNTS = { easy: 40, medium: 32, hard: 27, expert: 24 };
const MAX_MISTAKES = 3;

type Grid = number[][];
type Notes = Set<number>[][];

function emptyGrid(): Grid { return Array.from({ length: 9 }, () => Array(9).fill(0)); }
function emptyNotes(): Notes { return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>())); }
function cloneGrid(g: Grid): Grid { return g.map(r => [...r]); }

function isValid(grid: Grid, r: number, c: number, val: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (i !== c && grid[r][i] === val) return false;
    if (i !== r && grid[i][c] === val) return false;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const rr = br + i, cc = bc + j;
      if ((rr !== r || cc !== c) && grid[rr][cc] === val) return false;
    }
  return true;
}

function solve(grid: Grid, rng?: () => number): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      if (rng) nums.sort(() => rng() - 0.5);
      for (const n of nums) {
        if (isValid(grid, r, c, n)) {
          grid[r][c] = n;
          if (solve(grid, rng)) return true;
          grid[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

// Count solutions up to `limit` (early-exit). Used to keep puzzles unique.
function countSolutions(grid: Grid, limit = 2): number {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
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

function generatePuzzle(clues: number, rng: () => number): { puzzle: Grid; solution: Grid } {
  const solution = emptyGrid();
  solve(solution, rng);

  const puzzle = cloneGrid(solution);
  const positions = Array.from({ length: 81 }, (_, i) => i).sort(() => rng() - 0.5);
  let remaining = 81;
  const target = clues;

  for (const pos of positions) {
    if (remaining <= target) break;
    const r = Math.floor(pos / 9), c = pos % 9;
    if (puzzle[r][c] === 0) continue;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    // Keep the removal only if the puzzle still has exactly one solution.
    if (countSolutions(cloneGrid(puzzle), 2) !== 1) {
      puzzle[r][c] = backup; // revert — would create ambiguity
    } else {
      remaining--;
    }
  }

  return { puzzle, solution };
}

export function useSudoku(difficulty: Difficulty, mode: GameMode) {
  const clues = CLUE_COUNTS[difficulty];
  const [puzzle, setPuzzle] = useState<Grid | null>(null);
  const [solution, setSolution] = useState<Grid | null>(null);
  const [userGrid, setUserGrid] = useState<Grid | null>(null);
  const [notes, setNotes] = useState<Notes>(emptyNotes());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<Grid[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAccumRef = useRef<number>(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    setStreak(storage.sudoku.getDailyStreak());
    const seed = mode === 'daily'
      ? getDailySeed() * 10 + ['easy', 'medium', 'hard', 'expert'].indexOf(difficulty)
      : Date.now();
    const rng = seededRng(seed);
    const { puzzle: p, solution: s } = generatePuzzle(clues, rng);
    setPuzzle(p);
    setSolution(s);
    setUserGrid(cloneGrid(p));
    setNotes(emptyNotes());
    setSelected(null);
    setMistakes(0);
    setWon(false);
    setLost(false);
    setElapsed(0);
    setHistory([]);
    startTimeRef.current = Date.now();
    pausedAccumRef.current = 0;
  }, [difficulty, mode, clues]);

  // Pause-aware timer.
  useEffect(() => {
    if (won || lost || paused || !userGrid) { stopTimer(); return; }
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return stopTimer;
  }, [won, lost, paused, userGrid, stopTimer]);

  const selectCell = useCallback((r: number, c: number) => {
    setSelected([r, c]);
  }, []);

  const inputNumber = useCallback((num: number) => {
    if (!selected || !userGrid || !puzzle || !solution || won || lost) return;
    const [r, c] = selected;
    if (puzzle[r][c] !== 0) return; // given cell

    if (notesMode) {
      setNotes(prev => {
        const next = prev.map(row => row.map(s => new Set(s)));
        const cell = next[r][c];
        if (cell.has(num)) cell.delete(num); else cell.add(num);
        return next;
      });
      return;
    }

    setHistory(h => [...h, cloneGrid(userGrid)]);
    const next = cloneGrid(userGrid);
    next[r][c] = num;
    setUserGrid(next);

    setNotes(prev => {
      const n = prev.map(row => row.map(s => new Set(s)));
      n[r][c] = new Set();
      return n;
    });

    if (num !== 0 && num !== solution[r][c]) {
      setMistakes(m => {
        const nm = m + 1;
        if (nm >= MAX_MISTAKES) { setLost(true); stopTimer(); }
        return nm;
      });
      return;
    }

    // Win: board full AND every filled value is valid in its row/col/box.
    const full = next.every(row => row.every(v => v !== 0));
    const valid = full && next.every((row, ri) => row.every((v, ci) => isValid(next, ri, ci, v)));
    if (valid) {
      setWon(true);
      stopTimer();
      const time = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const best = storage.sudoku.getBestTime(difficulty);
      if (time < best) storage.sudoku.setBestTime(difficulty, time);
      if (mode === 'daily') {
        const today = getTodayString();
        if (storage.sudoku.getLastDaily() !== today) {
          const ns = nextStreak(storage.sudoku.getLastDaily(), storage.sudoku.getDailyStreak());
          storage.sudoku.setDailyStreak(ns);
          storage.sudoku.setLastDaily(today);
          setStreak(ns);
        }
      }
    }
  }, [selected, userGrid, puzzle, solution, notesMode, difficulty, mode, won, lost, stopTimer]);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setUserGrid(cloneGrid(prev));
      return h.slice(0, -1);
    });
  }, []);

  const restart = useCallback(() => {
    if (!puzzle) return;
    setUserGrid(cloneGrid(puzzle));
    setNotes(emptyNotes());
    setSelected(null);
    setMistakes(0);
    setWon(false);
    setLost(false);
    setElapsed(0);
    setHistory([]);
    startTimeRef.current = Date.now();
  }, [puzzle]);

  const getHighlight = useCallback((r: number, c: number): 'selected' | 'related' | 'same' | null => {
    if (!selected) return null;
    const [sr, sc] = selected;
    if (r === sr && c === sc) return 'selected';
    const inBox = Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3);
    if (r === sr || c === sc || inBox) return 'related';
    if (userGrid && userGrid[sr][sc] !== 0 && userGrid[r][c] === userGrid[sr][sc]) return 'same';
    return null;
  }, [selected, userGrid]);

  return {
    puzzle, solution, userGrid, notes, selected, notesMode, mistakes, maxMistakes: MAX_MISTAKES,
    won, lost, elapsed, paused, streak, canUndo: history.length > 0,
    setPaused,
    selectCell,
    inputNumber,
    toggleNotes: () => setNotesMode(p => !p),
    undo,
    restart,
    getHighlight,
  };
}
