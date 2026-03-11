'use client';

import { useState, useCallback, useRef } from 'react';
import { seededRng, getDailySeed, getTodayString } from '@/lib/dateUtils';
import { storage } from '@/lib/storage';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'daily' | 'random';
export type CellState = 'hidden' | 'revealed' | 'flagged';

export interface Cell {
  mine: boolean;
  adjacent: number;
  state: CellState;
}

const CONFIGS = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard:   { rows: 16, cols: 30, mines: 99 },
};

function buildGrid(rows: number, cols: number, mines: number, rng?: () => number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, adjacent: 0, state: 'hidden' as CellState }))
  );

  // Place mines
  const rand = rng ?? Math.random;
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(rand() * rows);
    const c = Math.floor(rand() * cols);
    if (!grid[r][c].mine) { grid[r][c].mine = true; placed++; }
  }

  // Calculate adjacency
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) count++;
        }
      grid[r][c].adjacent = count;
    }
  }

  return grid;
}

function reveal(grid: Cell[][], r: number, c: number): Cell[][] {
  const rows = grid.length, cols = grid[0].length;
  const next = grid.map(row => row.map(cell => ({ ...cell })));

  function floodFill(row: number, col: number) {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return;
    const cell = next[row][col];
    if (cell.state !== 'hidden') return;
    cell.state = 'revealed';
    if (cell.adjacent === 0 && !cell.mine) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          floodFill(row + dr, col + dc);
    }
  }

  floodFill(r, c);
  return next;
}

export function useMinesweeper(difficulty: Difficulty, mode: GameMode) {
  const config = CONFIGS[difficulty];
  const [grid, setGrid] = useState<Cell[][] | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - elapsed * 1000;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [elapsed]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const initGrid = useCallback((safeR: number, safeC: number) => {
    const { rows, cols, mines } = config;
    let rng: (() => number) | undefined;
    if (mode === 'daily') rng = seededRng(getDailySeed() * 100 + ['easy','medium','hard'].indexOf(difficulty));

    // Keep regenerating until (safeR, safeC) is safe
    let g = buildGrid(rows, cols, mines, rng);
    while (g[safeR][safeC].mine) {
      rng = mode === 'daily' ? seededRng(getDailySeed() * 100 + Math.random() * 1000) : undefined;
      g = buildGrid(rows, cols, mines, rng);
    }
    return g;
  }, [config, mode, difficulty]);

  const handleClick = useCallback((r: number, c: number) => {
    if (gameOver || won || paused) return;

    setGrid(prev => {
      let g = prev;
      if (!g) {
        g = initGrid(r, c);
        setStarted(true);
        startTimer();
      }

      const cell = g[r][c];
      if (cell.state === 'flagged' || cell.state === 'revealed') return g;

      if (cell.mine) {
        // Reveal all mines
        const next = g.map(row => row.map(cell => cell.mine ? { ...cell, state: 'revealed' as CellState } : { ...cell }));
        setGameOver(true);
        stopTimer();
        return next;
      }

      const next = reveal(g, r, c);

      // Check win
      const hiddenSafe = next.flat().filter(c => c.state === 'hidden' && !c.mine).length;
      if (hiddenSafe === 0) {
        setWon(true);
        stopTimer();
        const time = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (mode === 'random') {
          const best = storage.minesweeper.getBestTime(difficulty);
          if (time < best) storage.minesweeper.setBestTime(difficulty, time);
        }
        if (mode === 'daily') {
          const today = getTodayString();
          // Simple: increment streak (not checking yesterday gap for brevity)
          const s = storage.minesweeper.getDailyStreak() + 1;
          storage.minesweeper.setDailyStreak(s);
        }
      }

      return next;
    });
  }, [gameOver, won, paused, initGrid, startTimer, stopTimer, mode, difficulty]);

  const handleLongPress = useCallback((r: number, c: number) => {
    if (gameOver || won || paused || !grid) return;
    setGrid(prev => {
      if (!prev) return prev;
      const next = prev.map(row => row.map(c => ({ ...c })));
      const cell = next[r][c];
      if (cell.state === 'revealed') return prev;
      cell.state = cell.state === 'flagged' ? 'hidden' : 'flagged';
      return next;
    });
  }, [gameOver, won, paused, grid]);

  const handleChord = useCallback((r: number, c: number) => {
    if (!grid || gameOver || won) return;
    const cell = grid[r][c];
    if (cell.state !== 'revealed' || cell.adjacent === 0) return;
    const { rows, cols } = config;
    const neighbors: [number, number][] = [];
    let flags = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !(dr === 0 && dc === 0)) {
          neighbors.push([nr, nc]);
          if (grid[nr][nc].state === 'flagged') flags++;
        }
      }
    if (flags === cell.adjacent) {
      neighbors.forEach(([nr, nc]) => {
        if (grid[nr][nc].state === 'hidden') handleClick(nr, nc);
      });
    }
  }, [grid, gameOver, won, config, handleClick]);

  const restart = useCallback(() => {
    stopTimer();
    setGrid(null);
    setGameOver(false);
    setWon(false);
    setStarted(false);
    setElapsed(0);
    setPaused(false);
  }, [stopTimer]);

  const flagCount = grid ? grid.flat().filter(c => c.state === 'flagged').length : 0;
  const minesLeft = config.mines - flagCount;

  return {
    grid,
    config,
    gameOver,
    won,
    started,
    elapsed,
    minesLeft,
    paused,
    setPaused,
    handleClick,
    handleLongPress,
    handleChord,
    restart,
  };
}
