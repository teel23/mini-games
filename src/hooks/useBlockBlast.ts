'use client';

import { useState, useCallback } from 'react';
import { storage } from '@/lib/storage';

const SIZE = 10;

export type Grid = (string | null)[][];

export interface Shape {
  cells: [number, number][];
  color: string;
  name: string;
}

const COLORS = ['#f97316','#22c55e','#60a5fa','#a78bfa','#ef4444','#eab308','#06b6d4','#ec4899'];

export const ALL_SHAPES: Omit<Shape, 'color'>[] = [
  { name: 'single', cells: [[0,0]] },
  { name: 'domino-h', cells: [[0,0],[0,1]] },
  { name: 'domino-v', cells: [[0,0],[1,0]] },
  { name: 'tromino-h', cells: [[0,0],[0,1],[0,2]] },
  { name: 'tromino-v', cells: [[0,0],[1,0],[2,0]] },
  { name: 'tromino-L', cells: [[0,0],[1,0],[1,1]] },
  { name: 'tromino-J', cells: [[0,1],[1,0],[1,1]] },
  { name: 'tetro-L', cells: [[0,0],[1,0],[2,0],[2,1]] },
  { name: 'tetro-J', cells: [[0,1],[1,1],[2,0],[2,1]] },
  { name: 'tetro-S', cells: [[0,1],[0,2],[1,0],[1,1]] },
  { name: 'tetro-Z', cells: [[0,0],[0,1],[1,1],[1,2]] },
  { name: 'tetro-T', cells: [[0,0],[0,1],[0,2],[1,1]] },
  { name: 'tetro-I-h', cells: [[0,0],[0,1],[0,2],[0,3]] },
  { name: 'tetro-I-v', cells: [[0,0],[1,0],[2,0],[3,0]] },
  { name: 'square-2', cells: [[0,0],[0,1],[1,0],[1,1]] },
  { name: 'square-3', cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]] },
  { name: 'pento-L', cells: [[0,0],[1,0],[2,0],[3,0],[3,1]] },
  { name: 'pento-I', cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] },
];

function randomShape(): Shape {
  const base = ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { ...base, color };
}

function getNextPieces(): Shape[] {
  return [randomShape(), randomShape(), randomShape()];
}

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function canPlace(grid: Grid, shape: Shape, row: number, col: number): boolean {
  return shape.cells.every(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE && grid[r][c] === null;
  });
}

function canPlaceAnywhere(grid: Grid, shape: Shape): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (canPlace(grid, shape, r, c)) return true;
  return false;
}

function placeShape(grid: Grid, shape: Shape, row: number, col: number): Grid {
  const next = grid.map(r => [...r]);
  shape.cells.forEach(([dr, dc]) => {
    next[row + dr][col + dc] = shape.color;
  });
  return next;
}

function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const fullRows = new Set<number>();
  const fullCols = new Set<number>();

  for (let r = 0; r < SIZE; r++)
    if (grid[r].every(c => c !== null)) fullRows.add(r);
  for (let c = 0; c < SIZE; c++)
    if (grid.every(r => r[c] !== null)) fullCols.add(c);

  if (fullRows.size === 0 && fullCols.size === 0) return { grid, cleared: 0 };

  const next = grid.map((row, r) =>
    row.map((cell, c) => (fullRows.has(r) || fullCols.has(c)) ? null : cell)
  );

  return { grid: next, cleared: fullRows.size + fullCols.size };
}

export function useBlockBlast() {
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [pieces, setPieces] = useState<(Shape | null)[]>(getNextPieces);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => storage.blockblast.getBestScore());
  const [gameOver, setGameOver] = useState(false);
  const [lastCleared, setLastCleared] = useState(0);

  const selectPiece = useCallback((idx: number) => {
    if (gameOver || pieces[idx] === null) return;
    setSelectedPiece(idx);
  }, [gameOver, pieces]);

  const placePiece = useCallback((row: number, col: number) => {
    if (selectedPiece === null || gameOver) return;
    const shape = pieces[selectedPiece];
    if (!shape) return;

    if (!canPlace(grid, shape, row, col)) return;

    let newGrid = placeShape(grid, shape, row, col);
    const { grid: clearedGrid, cleared } = clearLines(newGrid);
    newGrid = clearedGrid;

    // Scoring
    const cellScore = shape.cells.length * 10;
    const lineScore = cleared * 100;
    const comboBonus = cleared > 1 ? Math.floor(lineScore * 0.5 * (cleared - 1)) : 0;
    const gained = cellScore + lineScore + comboBonus;

    setLastCleared(cleared);
    setGrid(newGrid);

    const newPieces = [...pieces];
    newPieces[selectedPiece] = null;
    setSelectedPiece(null);

    // Check if all 3 used
    if (newPieces.every(p => p === null)) {
      const next = getNextPieces();
      setPieces(next);
      // Check game over
      const over = next.every(s => !canPlaceAnywhere(newGrid, s));
      if (over) {
        setGameOver(true);
      }
    } else {
      setPieces(newPieces);
      // Check if remaining pieces can be placed
      const remaining = newPieces.filter(Boolean) as Shape[];
      if (remaining.every(s => !canPlaceAnywhere(newGrid, s))) {
        setGameOver(true);
      }
    }

    setScore(prev => {
      const ns = prev + gained;
      setBestScore(b => {
        const nb = Math.max(b, ns);
        storage.blockblast.setBestScore(nb);
        return nb;
      });
      return ns;
    });
  }, [selectedPiece, gameOver, pieces, grid]);

  const getGhost = useCallback((row: number, col: number): [number, number][] => {
    if (selectedPiece === null || pieces[selectedPiece] === null) return [];
    const shape = pieces[selectedPiece]!;
    if (!canPlace(grid, shape, row, col)) return [];
    return shape.cells.map(([dr, dc]) => [row + dr, col + dc]);
  }, [selectedPiece, pieces, grid]);

  const restart = useCallback(() => {
    setGrid(emptyGrid());
    setPieces(getNextPieces());
    setSelectedPiece(null);
    setScore(0);
    setGameOver(false);
    setLastCleared(0);
  }, []);

  return {
    grid, pieces, selectedPiece, score, bestScore, gameOver, lastCleared,
    selectPiece, placePiece, getGhost, restart,
  };
}
