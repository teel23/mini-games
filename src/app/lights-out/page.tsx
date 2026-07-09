'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import { storage } from '@/lib/storage';
import { seededRng, getDailySeed, getTodayString, nextStreak } from '@/lib/dateUtils';
import { haptic } from '@/lib/haptics';
import { playTick, playWin } from '@/lib/sounds';

const ACCENT = '#fbbf24';
const SIZE = 5;

type Grid = boolean[][];
type Mode = 'daily' | 'random';

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
}

function toggle(grid: Grid, r: number, c: number): Grid {
  const next = grid.map(row => [...row]);
  for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) next[nr][nc] = !next[nr][nc];
  }
  return next;
}

// Build a solvable puzzle by toggling from an all-off board (guaranteed solvable).
function generate(rng: () => number): Grid {
  let grid = emptyGrid();
  const taps = 6 + Math.floor(rng() * 6);
  for (let i = 0; i < taps; i++) {
    grid = toggle(grid, Math.floor(rng() * SIZE), Math.floor(rng() * SIZE));
  }
  // Avoid an already-solved board.
  if (grid.every(row => row.every(c => !c))) grid = toggle(grid, 2, 2);
  return grid;
}

export default function LightsOutPage() {
  const [mode, setMode] = useState<Mode>('daily');
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [streak, setStreak] = useState(0);
  const [confetti, setConfetti] = useState(false);

  const newGame = useCallback((m: Mode) => {
    const rng = m === 'daily'
      ? seededRng(getDailySeed() * 31 + 7)
      : seededRng(Math.floor(Math.random() * 1e9));
    setGrid(generate(rng));
    setMoves(0);
    setWon(false);
  }, []);

  useEffect(() => {
    setStreak(storage.lightsout.getDailyStreak());
    newGame(mode);
  }, [mode, newGame]);

  const tap = (r: number, c: number) => {
    if (won) return;
    const next = toggle(grid, r, c);
    setGrid(next);
    setMoves(m => m + 1);
    haptic.light();
    playTick();
    if (next.every(row => row.every(cell => !cell))) {
      setWon(true);
      setConfetti(true);
      haptic.win();
      playWin();
      setTimeout(() => setConfetti(false), 2100);
      if (mode === 'daily') {
        const today = getTodayString();
        if (storage.lightsout.getLastDaily() !== today) {
          const ns = nextStreak(storage.lightsout.getLastDaily(), storage.lightsout.getDailyStreak());
          const nb = Math.max(storage.lightsout.getBestStreak(), ns);
          storage.lightsout.setDailyStreak(ns);
          storage.lightsout.setBestStreak(nb);
          storage.lightsout.setLastDaily(today);
          setStreak(ns);
        }
      }
    }
  };

  return (
    <>
      <ConfettiOverlay active={confetti} />
      <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #fbbf2411 0%, transparent 60%)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
          <Link href="/" className="text-2xl">←</Link>
          <span className="font-bold text-white text-lg">Lights Out</span>
          <span className="text-sm" style={{ color: '#888' }}>🔥 {streak}</span>
        </div>

        <div className="px-4 py-3 flex justify-center gap-0.5 rounded-xl overflow-hidden">
          {(['random', 'daily'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} className="px-5 py-2 text-sm font-semibold capitalize"
              style={{ background: mode === m ? ACCENT : '#1a1a1a', color: mode === m ? '#000' : '#888', minHeight: 44, borderRadius: 10 }}>
              {m === 'daily' ? '📅 Daily' : '🎲 Random'}
            </button>
          ))}
        </div>

        <div className="text-center text-sm mb-2" style={{ color: '#888' }}>
          Turn every light off · Moves: <span style={{ color: ACCENT }}>{moves}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 8, width: '100%', maxWidth: 340 }}>
            {grid.map((row, r) =>
              row.map((on, c) => (
                <button key={`${r}-${c}`} onClick={() => tap(r, c)}
                  className="aspect-square rounded-2xl transition-all"
                  style={{
                    background: on ? ACCENT : '#1a1a1a',
                    border: `2px solid ${on ? ACCENT : '#2e2e2e'}`,
                    boxShadow: on ? `0 0 18px ${ACCENT}88` : 'none',
                  }} />
              ))
            )}
          </div>
          <button onClick={() => newGame(mode)} className="mt-8 px-6 py-3 rounded-xl font-bold"
            style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #2e2e2e', minHeight: 48 }}>
            New Board
          </button>
        </div>

        {won && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
              <h2 className="text-2xl font-bold text-white">Lights Out! 💡</h2>
              <p className="text-sm" style={{ color: '#888' }}>Solved in {moves} moves</p>
              {mode === 'daily' && <p className="font-bold" style={{ color: ACCENT }}>🔥 {streak} day streak</p>}
              <button onClick={() => newGame(mode)} className="w-full py-3 rounded-xl font-bold text-black" style={{ background: ACCENT, minHeight: 48 }}>
                {mode === 'daily' ? 'Play Random' : 'New Board'}
              </button>
              <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
