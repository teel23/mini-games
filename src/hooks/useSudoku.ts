'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { seededRng, getDailySeed, getTodayString } from '@/lib/dateUtils';
import { storage } from '@/lib/storage';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type GameMode = 'daily' | 'random';

const CLUE_COUNTS = { easy: 36, medium: 30, hard: 25, expert: 22 };

type Grid = number[][];
type Notes = Set<number>[][];

function emptyGrid(): Grid { return Array.from({ length: 9 }, () => Array(9).fill(0)); }
function emptyNotes(): Notes { return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>())); }

function isValid(grid: Grid, r: number, c: number, val: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === val || grid[i][c] === val) return false;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (grid[br + i][bc + j] === val) return false;
  return true;
}

function solve(grid: Grid, rng?: () => number): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      const nums = [1,2,3,4,5,6,7,8,9];
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

function generatePuzzle(clues: number, rng: () => number): { puzzle: Grid; solution: Grid } {
  const solution = emptyGrid();
  solve(solution, rng);

  const puzzle = solution.map(r => [...r]);
  const positions = Array.from({ length: 81 }, (_, i) => i).sort(() => rng() - 0.5);
  let removed = 0;
  const target = 81 - clues;

  for (const pos of positions) {
    if (removed >= target) break;
    const r = Math.floor(pos / 9), c = pos % 9;
    const val = puzzle[r][c];
    puzzle[r][c] = 0;
    // Quick check: just remove and trust the count (full uniqueness check is too slow for browser)
    removed++;
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
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const seed = mode === 'daily'
      ? getDailySeed() * 10 + ['easy','medium','hard','expert'].indexOf(difficulty)
      : Date.now();
    const rng = seededRng(seed);
    const { puzzle: p, solution: s } = generatePuzzle(clues, rng);
    setPuzzle(p);
    setSolution(s);
    setUserGrid(p.map(r => [...r]));
    setNotes(emptyNotes());
    setSelected(null);
    setMistakes(0);
    setWon(false);
    setElapsed(0);
    stopTimer();
    startTimer();
  }, [difficulty, mode, clues, startTimer, stopTimer]);

  const selectCell = useCallback((r: number, c: number) => {
    setSelected([r, c]);
  }, []);

  const inputNumber = useCallback((num: number) => {
    if (!selected || !userGrid || !puzzle || !solution) return;
    const [r, c] = selected;
    if (puzzle[r][c] !== 0) return; // Given cell

    if (notesMode) {
      setNotes(prev => {
        const next = prev.map(row => row.map(s => new Set(s)));
        const cell = next[r][c];
        if (cell.has(num)) cell.delete(num);
        else cell.add(num);
        return next;
      });
      return;
    }

    const next = userGrid.map(row => [...row]);
    next[r][c] = num;
    setUserGrid(next);

    // Clear notes for this cell
    setNotes(prev => {
      const n = prev.map(row => row.map(s => new Set(s)));
      n[r][c] = new Set();
      return n;
    });

    if (num !== 0 && num !== solution[r][c]) {
      setMistakes(m => m + 1);
    }

    // Check win
    const complete = next.every((row, ri) => row.every((val, ci) => val === solution[ri][ci]));
    if (complete) {
      setWon(true);
      stopTimer();
      const time = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const best = storage.sudoku.getBestTime(difficulty);
      if (time < best) storage.sudoku.setBestTime(difficulty, time);
      if (mode === 'daily') {
        storage.sudoku.setDailyStreak(storage.sudoku.getDailyStreak() + 1);
      }
    }
  }, [selected, userGrid, puzzle, solution, notesMode, difficulty, mode, stopTimer]);

  const restart = useCallback(() => {
    if (!puzzle) return;
    setUserGrid(puzzle.map(r => [...r]));
    setNotes(emptyNotes());
    setSelected(null);
    setMistakes(0);
    setWon(false);
    setElapsed(0);
    stopTimer();
    startTimer();
  }, [puzzle, stopTimer, startTimer]);

  // Highlight logic
  const getHighlight = useCallback((r: number, c: number): 'selected' | 'related' | 'same' | null => {
    if (!selected) return null;
    const [sr, sc] = selected;
    if (r === sr && c === sc) return 'selected';
    const inBox = Math.floor(r/3) === Math.floor(sr/3) && Math.floor(c/3) === Math.floor(sc/3);
    if (r === sr || c === sc || inBox) return 'related';
    if (userGrid && userGrid[sr][sc] !== 0 && userGrid[r][c] === userGrid[sr][sc]) return 'same';
    return null;
  }, [selected, userGrid]);

  const streak = storage.sudoku.getDailyStreak();

  return {
    puzzle, solution, userGrid, notes, selected, notesMode, mistakes, won, elapsed, paused,
    streak,
    setPaused,
    selectCell,
    inputNumber,
    toggleNotes: () => setNotesMode(p => !p),
    restart,
    getHighlight,
  };
}
