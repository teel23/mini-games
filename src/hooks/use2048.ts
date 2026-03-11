'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { storage } from '@/lib/storage';

export type BoardMode = '4x4' | '5x5';
export type Grid = number[][];

function createEmptyGrid(size: number): Grid {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function addRandomTile(grid: Grid): Grid {
  const size = grid.length;
  const empty: [number, number][] = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c] === 0) empty.push([r, c]);
  if (!empty.length) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map(row => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function init(size: number): Grid {
  let g = createEmptyGrid(size);
  g = addRandomTile(g);
  g = addRandomTile(g);
  return g;
}

function slideRow(row: number[]): { row: number[]; score: number } {
  const filtered = row.filter(Boolean);
  let score = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < row.length) merged.push(0);
  return { row: merged, score };
}

function moveLeft(grid: Grid): { grid: Grid; score: number; moved: boolean } {
  let score = 0;
  let moved = false;
  const next = grid.map(row => {
    const { row: newRow, score: s } = slideRow(row);
    score += s;
    if (newRow.some((v, i) => v !== row[i])) moved = true;
    return newRow;
  });
  return { grid: next, score, moved };
}

function rotate90(grid: Grid): Grid {
  const size = grid.length;
  return grid[0].map((_, c) => grid.map(row => row[c]).reverse());
}

function rotate180(grid: Grid): Grid { return rotate90(rotate90(grid)); }
function rotate270(grid: Grid): Grid { return rotate90(rotate90(rotate90(grid))); }

type Direction = 'left' | 'right' | 'up' | 'down';

function move(grid: Grid, dir: Direction): { grid: Grid; score: number; moved: boolean } {
  let g = grid;
  if (dir === 'right') g = rotate180(g);
  else if (dir === 'up') g = rotate270(g);
  else if (dir === 'down') g = rotate90(g);

  const result = moveLeft(g);

  if (dir === 'right') result.grid = rotate180(result.grid);
  else if (dir === 'up') result.grid = rotate90(result.grid);
  else if (dir === 'down') result.grid = rotate270(result.grid);

  return result;
}

function hasValidMoves(grid: Grid): boolean {
  const size = grid.length;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < size && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < size && grid[r][c] === grid[r + 1][c]) return true;
    }
  return false;
}

export function use2048(boardMode: BoardMode) {
  const size = boardMode === '4x4' ? 4 : 5;
  const [grid, setGrid] = useState<Grid>(() => init(size));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setBestScore(storage['2048'].getBestScore(boardMode));
  }, [boardMode]);

  const doMove = useCallback((dir: Direction) => {
    if (gameOver || paused || animating) return;
    setGrid(prev => {
      const result = move(prev, dir);
      if (!result.moved) return prev;

      const newGrid = addRandomTile(result.grid);
      setScore(s => {
        const ns = s + result.score;
        setBestScore(b => {
          const nb = Math.max(b, ns);
          storage['2048'].setBestScore(boardMode, nb);
          return nb;
        });
        return ns;
      });
      if (!hasValidMoves(newGrid)) setGameOver(true);
      return newGrid;
    });
  }, [gameOver, paused, animating, boardMode]);

  const restart = useCallback(() => {
    setGrid(init(size));
    setScore(0);
    setGameOver(false);
    setPaused(false);
  }, [size]);

  // Touch/swipe tracking
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 30) return;
    if (absDx > absDy) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
    touchStart.current = null;
  }, [doMove]);

  return { grid, score, bestScore, gameOver, paused, setPaused, doMove, restart, onTouchStart, onTouchEnd };
}

// Tile color mapping
export function getTileStyle(value: number): { background: string; color: string } {
  const map: Record<number, { background: string; color: string }> = {
    0:    { background: '#242424', color: 'transparent' },
    2:    { background: '#3a3a2e', color: '#f0f0f0' },
    4:    { background: '#4a4a2e', color: '#f0f0f0' },
    8:    { background: '#f97316', color: '#fff' },
    16:   { background: '#ea580c', color: '#fff' },
    32:   { background: '#dc2626', color: '#fff' },
    64:   { background: '#b91c1c', color: '#fff' },
    128:  { background: '#d97706', color: '#fff' },
    256:  { background: '#ca8a04', color: '#fff' },
    512:  { background: '#a16207', color: '#fff' },
    1024: { background: '#854d0e', color: '#fff' },
    2048: { background: '#f59e0b', color: '#fff' },
  };
  return map[value] ?? { background: '#7c3aed', color: '#fff' };
}
