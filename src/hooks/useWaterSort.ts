'use client';

import { useState, useCallback } from 'react';
import { storage } from '@/lib/storage';

export type Difficulty = 'easy' | 'medium' | 'hard';

const CONFIGS = {
  easy:   { colors: 4, tubes: 6 },
  medium: { colors: 6, tubes: 8 },
  hard:   { colors: 8, tubes: 10 },
};

const CAPACITY = 4;

const WATER_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#60a5fa','#a78bfa','#ec4899',
  '#10b981','#f43f5e',
];

export type Tube = string[];

function generatePuzzle(colors: number, tubes: number): Tube[] {
  // Create filled tubes
  const allColors: string[] = [];
  for (let i = 0; i < colors; i++) {
    for (let j = 0; j < CAPACITY; j++) {
      allColors.push(WATER_COLORS[i]);
    }
  }

  // Shuffle
  for (let i = allColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allColors[i], allColors[j]] = [allColors[j], allColors[i]];
  }

  const result: Tube[] = [];
  for (let i = 0; i < colors; i++) {
    result.push(allColors.slice(i * CAPACITY, (i + 1) * CAPACITY));
  }

  // Add empty tubes
  for (let i = colors; i < tubes; i++) {
    result.push([]);
  }

  return result;
}

function canPour(from: Tube, to: Tube): boolean {
  if (from.length === 0) return false;
  if (to.length >= CAPACITY) return false;
  if (to.length === 0) return true;
  return from[from.length - 1] === to[to.length - 1];
}

function pour(tubes: Tube[], fromIdx: number, toIdx: number): Tube[] {
  const next = tubes.map(t => [...t]);
  const from = next[fromIdx];
  const to = next[toIdx];
  const color = from[from.length - 1];

  while (from.length > 0 && from[from.length - 1] === color && to.length < CAPACITY) {
    to.push(from.pop()!);
  }

  return next;
}

function isSolved(tubes: Tube[]): boolean {
  return tubes.every(t => t.length === 0 || (t.length === CAPACITY && t.every(c => c === t[0])));
}

export function useWaterSort(difficulty: Difficulty) {
  const [level, setLevel] = useState(1);
  const [tubes, setTubes] = useState<Tube[]>(() => generatePuzzle(CONFIGS[difficulty].colors, CONFIGS[difficulty].tubes));
  const [selected, setSelected] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [history, setHistory] = useState<Tube[][]>([]);

  const newPuzzle = useCallback((diff: Difficulty, lvl: number) => {
    const { colors, tubes: numTubes } = CONFIGS[diff];
    setTubes(generatePuzzle(colors, numTubes));
    setSelected(null);
    setWon(false);
    setHistory([]);
  }, []);

  const handleTube = useCallback((idx: number) => {
    if (won) return;

    if (selected === null) {
      if (tubes[idx].length > 0) setSelected(idx);
      return;
    }

    if (selected === idx) {
      setSelected(null);
      return;
    }

    if (canPour(tubes[selected], tubes[idx])) {
      setHistory(h => [...h, tubes.map(t => [...t])]);
      const next = pour(tubes, selected, idx);
      setTubes(next);
      setSelected(null);
      if (isSolved(next)) {
        setWon(true);
        const newLevel = level + 1;
        setLevel(newLevel);
        const best = storage.watersort.getHighestLevel(difficulty);
        if (newLevel > best) storage.watersort.setHighestLevel(difficulty, newLevel);
      }
    } else {
      setSelected(idx);
    }
  }, [won, selected, tubes, level, difficulty]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setTubes(prev);
    setHistory(h => h.slice(0, -1));
    setSelected(null);
  }, [history]);

  const restart = useCallback(() => {
    newPuzzle(difficulty, level);
  }, [difficulty, level, newPuzzle]);

  const nextLevel = useCallback(() => {
    newPuzzle(difficulty, level);
  }, [difficulty, level, newPuzzle]);

  return {
    tubes,
    selected,
    won,
    level,
    handleTube,
    undo,
    restart,
    nextLevel,
    canUndo: history.length > 0,
  };
}
