'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import { storage } from '@/lib/storage';
import { seededRng, getDailySeed, getTodayString, nextStreak } from '@/lib/dateUtils';
import { haptic } from '@/lib/haptics';
import { playTick, playError, playWin, playSuccess } from '@/lib/sounds';

const ACCENT = '#a3e635';
type Mode = 'daily' | 'random';

interface Category { name: string; emojis: string[]; color: string; }

const POOL: Category[] = [
  { name: 'Fruit', emojis: ['🍎', '🍌', '🍇', '🍊'], color: '#f97316' },
  { name: 'Pets', emojis: ['🐶', '🐱', '🐹', '🐰'], color: '#60a5fa' },
  { name: 'Faces', emojis: ['😀', '😎', '😭', '😡'], color: '#eab308' },
  { name: 'Sports', emojis: ['⚽', '🏀', '🏈', '⚾'], color: '#22c55e' },
  { name: 'Weather', emojis: ['☀️', '🌧️', '❄️', '⚡'], color: '#06b6d4' },
  { name: 'Travel', emojis: ['🚗', '✈️', '🚀', '🚲'], color: '#a78bfa' },
  { name: 'Food', emojis: ['🍕', '🍔', '🌮', '🍣'], color: '#ef4444' },
  { name: 'Music', emojis: ['🎸', '🎹', '🎺', '🥁'], color: '#ec4899' },
  { name: 'Sea life', emojis: ['🐟', '🐬', '🐳', '🦈'], color: '#14b8a6' },
  { name: 'Space', emojis: ['🌙', '⭐', '☄️', '🪐'], color: '#8b5cf6' },
  { name: 'Plants', emojis: ['🌵', '🌻', '🌲', '🍀'], color: '#10b981' },
  { name: 'Hands', emojis: ['👍', '👎', '👏', '🙌'], color: '#f59e0b' },
];

interface Tile { emoji: string; cat: number; }

function buildGame(rng: () => number): { tiles: Tile[]; cats: Category[] } {
  const order = POOL.map((_, i) => i).sort(() => rng() - 0.5);
  const chosen = order.slice(0, 4);
  const cats = chosen.map(i => POOL[i]);
  const tiles: Tile[] = [];
  cats.forEach((cat, ci) => cat.emojis.forEach(e => tiles.push({ emoji: e, cat: ci })));
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return { tiles, cats };
}

const MAX_MISTAKES = 4;

export default function GroupingPage() {
  const [mode, setMode] = useState<Mode>('daily');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [solved, setSolved] = useState<number[]>([]); // category indices solved
  const [selected, setSelected] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [confetti, setConfetti] = useState(false);

  const newGame = useCallback((m: Mode) => {
    const rng = m === 'daily' ? seededRng(getDailySeed() * 97 + 13) : seededRng(Math.floor(Math.random() * 1e9));
    const g = buildGame(rng);
    setTiles(g.tiles);
    setCats(g.cats);
    setSolved([]);
    setSelected([]);
    setMistakes(0);
  }, []);

  useEffect(() => {
    setStreak(storage.grouping.getDailyStreak());
    newGame(mode);
  }, [mode, newGame]);

  const won = cats.length > 0 && solved.length === 4;
  const lost = mistakes >= MAX_MISTAKES && !won;
  const over = won || lost;

  const toggle = (emoji: string) => {
    if (over) return;
    setSelected(prev => {
      if (prev.includes(emoji)) return prev.filter(e => e !== emoji);
      if (prev.length >= 4) return prev;
      playTick();
      haptic.light();
      return [...prev, emoji];
    });
  };

  const submit = () => {
    if (selected.length !== 4 || over) return;
    const catIdx = tiles.find(t => t.emoji === selected[0])!.cat;
    const allSame = selected.every(e => tiles.find(t => t.emoji === e)!.cat === catIdx);
    if (allSame) {
      const nextSolved = [...solved, catIdx];
      setSolved(nextSolved);
      setSelected([]);
      playSuccess();
      haptic.medium();
      if (nextSolved.length === 4) {
        setConfetti(true);
        haptic.win();
        playWin();
        setTimeout(() => setConfetti(false), 2100);
        if (mode === 'daily') {
          const today = getTodayString();
          if (storage.grouping.getLastDaily() !== today) {
            const ns = nextStreak(storage.grouping.getLastDaily(), storage.grouping.getDailyStreak());
            const nb = Math.max(storage.grouping.getBestStreak(), ns);
            storage.grouping.setDailyStreak(ns);
            storage.grouping.setBestStreak(nb);
            storage.grouping.setLastDaily(today);
            setStreak(ns);
          }
        }
      }
    } else {
      setMistakes(m => {
        const nm = m + 1;
        if (nm >= MAX_MISTAKES && mode === 'daily') {
          const today = getTodayString();
          if (storage.grouping.getLastDaily() !== today) {
            storage.grouping.setDailyStreak(0);
            storage.grouping.setLastDaily(today);
            setStreak(0);
          }
        }
        return nm;
      });
      setSelected([]);
      playError();
      haptic.error();
    }
  };

  const remaining = tiles.filter(t => !solved.includes(t.cat));

  return (
    <>
      <ConfettiOverlay active={confetti} />
      <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #a3e63511 0%, transparent 60%)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
          <Link href="/" className="text-2xl">←</Link>
          <span className="font-bold text-white text-lg">Grouping</span>
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

        <div className="text-center text-sm mb-2" style={{ color: '#888' }}>
          Find the 4 groups of 4 · Mistakes: {mistakes}/{MAX_MISTAKES}
        </div>

        <div className="flex-1 flex flex-col items-center px-3 gap-2">
          {/* solved groups */}
          {solved.map(ci => (
            <div key={ci} className="w-full max-w-sm rounded-xl py-2 px-3 flex items-center justify-center gap-3"
              style={{ background: cats[ci].color + '33', border: `1px solid ${cats[ci].color}` }}>
              <span className="font-bold text-sm" style={{ color: cats[ci].color }}>{cats[ci].name}</span>
              <span className="text-2xl">{cats[ci].emojis.join(' ')}</span>
            </div>
          ))}

          {/* remaining tiles */}
          <div className="w-full max-w-sm grid grid-cols-4 gap-2">
            {remaining.map(t => {
              const isSel = selected.includes(t.emoji);
              return (
                <button key={t.emoji} onClick={() => toggle(t.emoji)}
                  className="aspect-square rounded-xl flex items-center justify-center"
                  style={{
                    background: isSel ? ACCENT : '#1a1a1a',
                    border: `2px solid ${isSel ? ACCENT : '#2e2e2e'}`,
                    fontSize: 30, touchAction: 'manipulation',
                  }}>
                  {t.emoji}
                </button>
              );
            })}
          </div>

          {!over && (
            <button onClick={submit} disabled={selected.length !== 4}
              className="mt-4 w-full max-w-sm py-3 rounded-xl font-bold"
              style={{ background: selected.length === 4 ? ACCENT : '#1a1a1a', color: selected.length === 4 ? '#000' : '#555', minHeight: 48 }}>
              Submit
            </button>
          )}
        </div>

        {over && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl p-6 flex flex-col items-center gap-3 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
              <h2 className="text-2xl font-bold text-white">{won ? 'All groups found! 🧠' : 'Out of guesses'}</h2>
              {!won && (
                <div className="flex flex-col gap-1 w-full">
                  {cats.map((cat, i) => (
                    <div key={i} className="text-center text-sm" style={{ color: cat.color }}>
                      {cat.name}: {cat.emojis.join(' ')}
                    </div>
                  ))}
                </div>
              )}
              {won && mode === 'daily' && <p className="font-bold" style={{ color: ACCENT }}>🔥 {streak} day streak</p>}
              <button onClick={() => newGame(mode)} className="w-full py-3 rounded-xl font-bold text-black" style={{ background: ACCENT, minHeight: 48 }}>
                {mode === 'daily' ? 'Play Random' : 'New Game'}
              </button>
              <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
