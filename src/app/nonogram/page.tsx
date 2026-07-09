'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import { storage } from '@/lib/storage';
import { seededRng, getDailySeed, getTodayString, nextStreak } from '@/lib/dateUtils';
import { haptic } from '@/lib/haptics';
import { playTick, playFlag, playWin } from '@/lib/sounds';

const ACCENT = '#14b8a6';
const SIZE = 5;

type Cell = 'empty' | 'filled' | 'marked';
type Mode = 'daily' | 'random';

function generateSolution(rng: () => number): boolean[][] {
  let sol: boolean[][];
  do {
    sol = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => rng() < 0.55));
  } while (sol.every(row => row.every(c => !c)) || sol.every(row => row.every(c => c)));
  return sol;
}

function lineClues(line: boolean[]): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const v of line) {
    if (v) run++;
    else if (run > 0) { clues.push(run); run = 0; }
  }
  if (run > 0) clues.push(run);
  return clues.length ? clues : [0];
}

export default function NonogramPage() {
  const [mode, setMode] = useState<Mode>('daily');
  const [solution, setSolution] = useState<boolean[][]>(() => generateSolution(seededRng(1)));
  const [grid, setGrid] = useState<Cell[][]>(() => Array.from({ length: SIZE }, () => Array(SIZE).fill('empty')));
  const [tool, setTool] = useState<'fill' | 'mark'>('fill');
  const [won, setWon] = useState(false);
  const [streak, setStreak] = useState(0);
  const [confetti, setConfetti] = useState(false);

  const newGame = useCallback((m: Mode) => {
    const rng = m === 'daily' ? seededRng(getDailySeed() * 53 + 11) : seededRng(Math.floor(Math.random() * 1e9));
    setSolution(generateSolution(rng));
    setGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill('empty')));
    setWon(false);
  }, []);

  useEffect(() => {
    setStreak(storage.nonogram.getDailyStreak());
    newGame(mode);
  }, [mode, newGame]);

  const rowClues = solution.map(lineClues);
  const colClues = Array.from({ length: SIZE }, (_, c) => lineClues(solution.map(row => row[c])));

  const checkWin = (g: Cell[][]) =>
    solution.every((row, r) => row.every((sol, c) => sol === (g[r][c] === 'filled')));

  const tap = (r: number, c: number) => {
    if (won) return;
    setGrid(prev => {
      const next = prev.map(row => [...row]);
      const cur = next[r][c];
      if (tool === 'fill') next[r][c] = cur === 'filled' ? 'empty' : 'filled';
      else next[r][c] = cur === 'marked' ? 'empty' : 'marked';
      if (tool === 'fill') playTick(); else playFlag();
      haptic.light();
      if (checkWin(next)) {
        setWon(true);
        setConfetti(true);
        haptic.win();
        playWin();
        setTimeout(() => setConfetti(false), 2100);
        if (mode === 'daily') {
          const today = getTodayString();
          if (storage.nonogram.getLastDaily() !== today) {
            const ns = nextStreak(storage.nonogram.getLastDaily(), storage.nonogram.getDailyStreak());
            const nb = Math.max(storage.nonogram.getBestStreak(), ns);
            storage.nonogram.setDailyStreak(ns);
            storage.nonogram.setBestStreak(nb);
            storage.nonogram.setLastDaily(today);
            setStreak(ns);
          }
        }
      }
      return next;
    });
  };

  const cellPx = 46;
  const cluePx = 64;

  return (
    <>
      <ConfettiOverlay active={confetti} />
      <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #14b8a611 0%, transparent 60%)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
          <Link href="/" className="text-2xl">←</Link>
          <span className="font-bold text-white text-lg">Nonogram</span>
          <span className="text-sm" style={{ color: '#888' }}>🔥 {streak}</span>
        </div>

        <div className="px-4 py-3 flex justify-center gap-2">
          {(['random', 'daily'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} className="px-5 py-2 text-sm font-semibold"
              style={{ background: mode === m ? ACCENT : '#1a1a1a', color: mode === m ? '#000' : '#888', minHeight: 44, borderRadius: 10 }}>
              {m === 'daily' ? '📅 Daily' : '🎲 Random'}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <div style={{ display: 'grid', gridTemplateColumns: `${cluePx}px repeat(${SIZE}, ${cellPx}px)` }}>
            {/* top-left corner */}
            <div style={{ width: cluePx, height: cluePx }} />
            {/* column clues */}
            {colClues.map((clues, c) => (
              <div key={`cc-${c}`} className="flex flex-col items-center justify-end pb-1"
                style={{ height: cluePx, color: '#ccc', fontSize: 13, fontWeight: 700 }}>
                {clues.map((n, i) => <span key={i}>{n}</span>)}
              </div>
            ))}
            {/* rows */}
            {solution.map((_, r) => (
              <RowFragment key={`row-${r}`}>
                <div className="flex items-center justify-end pr-2 gap-1"
                  style={{ height: cellPx, color: '#ccc', fontSize: 13, fontWeight: 700 }}>
                  {rowClues[r].map((n, i) => <span key={i}>{n}</span>)}
                </div>
                {grid[r].map((cell, c) => (
                  <button key={`${r}-${c}`} onClick={() => tap(r, c)}
                    className="flex items-center justify-center"
                    style={{
                      width: cellPx, height: cellPx,
                      background: cell === 'filled' ? ACCENT : '#161616',
                      border: '1px solid #2e2e2e',
                      color: '#ef4444', fontSize: 18, fontWeight: 800,
                      touchAction: 'manipulation',
                    }}>
                    {cell === 'marked' ? '✕' : ''}
                  </button>
                ))}
              </RowFragment>
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={() => setTool('fill')} className="px-5 py-3 rounded-xl font-semibold text-sm"
              style={{ background: tool === 'fill' ? ACCENT : '#1a1a1a', color: tool === 'fill' ? '#000' : '#888', border: '1px solid #2e2e2e', minHeight: 48 }}>
              ◼ Fill
            </button>
            <button onClick={() => setTool('mark')} className="px-5 py-3 rounded-xl font-semibold text-sm"
              style={{ background: tool === 'mark' ? ACCENT : '#1a1a1a', color: tool === 'mark' ? '#000' : '#888', border: '1px solid #2e2e2e', minHeight: 48 }}>
              ✕ Mark
            </button>
            <button onClick={() => newGame(mode)} className="px-5 py-3 rounded-xl font-semibold text-sm"
              style={{ background: '#1a1a1a', color: '#888', border: '1px solid #2e2e2e', minHeight: 48 }}>
              ↺ Reset
            </button>
          </div>
        </div>

        {won && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
              <h2 className="text-2xl font-bold text-white">Picture complete! 🖼️</h2>
              {mode === 'daily' && <p className="font-bold" style={{ color: ACCENT }}>🔥 {streak} day streak</p>}
              <button onClick={() => newGame(mode)} className="w-full py-3 rounded-xl font-bold text-black" style={{ background: ACCENT, minHeight: 48 }}>
                {mode === 'daily' ? 'Play Random' : 'New Puzzle'}
              </button>
              <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function RowFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
