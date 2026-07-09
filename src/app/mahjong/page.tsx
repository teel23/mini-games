'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import { storage } from '@/lib/storage';
import { haptic } from '@/lib/haptics';
import { playTick, playSuccess, playWin, playError } from '@/lib/sounds';

const ACCENT = '#0ea5e9';
const FACES = ['🐉', '🌸', '🎋', '☀️', '🌙', '🍀', '🔔', '💎', '🎲', '⭐', '🦋'];

interface Slot { id: number; layer: number; r: number; c: number; face: string; removed: boolean; }

// Layout: layer 0 is an 8x4 base, layer 1 a 6x2 cap centered on top → 44 tiles (22 pairs).
function buildSlots(): Omit<Slot, 'face' | 'removed'>[] {
  const slots: Omit<Slot, 'face' | 'removed'>[] = [];
  let id = 0;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 8; c++)
      slots.push({ id: id++, layer: 0, r, c });
  for (let r = 1; r <= 2; r++)
    for (let c = 1; c <= 6; c++)
      slots.push({ id: id++, layer: 1, r, c });
  return slots;
}

function isFree(s: { layer: number; r: number; c: number }, active: { layer: number; r: number; c: number }[]): boolean {
  const covered = active.some(a => a.layer === s.layer + 1 && a.r === s.r && a.c === s.c);
  if (covered) return false;
  const leftBlocked = active.some(a => a.layer === s.layer && a.r === s.r && a.c === s.c - 1);
  const rightBlocked = active.some(a => a.layer === s.layer && a.r === s.r && a.c === s.c + 1);
  return !leftBlocked || !rightBlocked;
}

// Reverse-generate a guaranteed-solvable board: repeatedly remove two FREE tiles
// (assigning them a matching face) until the board is empty.
function generate(): Slot[] {
  const base = buildSlots();
  for (let attempt = 0; attempt < 300; attempt++) {
    const active = base.map(s => ({ ...s }));
    const faceById = new Map<number, string>();
    let pairIdx = 0;
    let ok = true;
    while (active.length > 0) {
      const free = active.filter(s => isFree(s, active));
      if (free.length < 2) { ok = false; break; }
      // pick two distinct random free tiles
      const i = Math.floor(Math.random() * free.length);
      let j = Math.floor(Math.random() * free.length);
      while (j === i) j = Math.floor(Math.random() * free.length);
      const a = free[i], b = free[j];
      const face = FACES[pairIdx % FACES.length];
      pairIdx++;
      faceById.set(a.id, face);
      faceById.set(b.id, face);
      const rm = new Set([a.id, b.id]);
      for (let k = active.length - 1; k >= 0; k--) if (rm.has(active[k].id)) active.splice(k, 1);
    }
    if (ok) return base.map(s => ({ ...s, face: faceById.get(s.id)!, removed: false }));
  }
  // Fallback (practically unreachable): faces round-robin.
  return base.map((s, i) => ({ ...s, face: FACES[Math.floor(i / 2) % FACES.length], removed: false }));
}

export default function MahjongPage() {
  const [tiles, setTiles] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);
  const startRef = useRef<number>(Date.now());

  const reset = useCallback(() => {
    setTiles(generate());
    setSelected(null);
    setWon(false);
    setElapsed(0);
    startRef.current = Date.now();
  }, []);

  useEffect(() => {
    setGamesWon(storage.mahjong.getGamesWon());
    reset();
  }, [reset]);

  useEffect(() => {
    if (won) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [won]);

  const active = tiles.filter(t => !t.removed);
  const freeIds = new Set(active.filter(t => isFree(t, active)).map(t => t.id));

  const noMoves = !won && active.length > 0 && (() => {
    const freeTiles = active.filter(t => freeIds.has(t.id));
    const seen = new Set<string>();
    for (const t of freeTiles) {
      if (seen.has(t.face)) return false; // a matchable free pair exists
      seen.add(t.face);
    }
    return true;
  })();

  const click = (id: number) => {
    if (won || !freeIds.has(id)) return;
    if (selected === null) { setSelected(id); playTick(); haptic.light(); return; }
    if (selected === id) { setSelected(null); return; }
    const a = tiles.find(t => t.id === selected)!;
    const b = tiles.find(t => t.id === id)!;
    if (a.face === b.face) {
      const next = tiles.map(t => (t.id === a.id || t.id === b.id) ? { ...t, removed: true } : t);
      setTiles(next);
      setSelected(null);
      playSuccess();
      haptic.medium();
      if (next.every(t => t.removed)) {
        setWon(true);
        setConfetti(true);
        haptic.win();
        playWin();
        setTimeout(() => setConfetti(false), 2100);
        const w = storage.mahjong.getGamesWon() + 1;
        storage.mahjong.setGamesWon(w);
        setGamesWon(w);
        const time = Math.floor((Date.now() - startRef.current) / 1000);
        if (time < storage.mahjong.getBestTime()) storage.mahjong.setBestTime(time);
      }
    } else {
      setSelected(id);
      playTick();
    }
  };

  const shuffle = () => {
    // Escape hatch: redeal remaining faces onto remaining slots.
    const faces = active.map(t => t.face);
    for (let i = faces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [faces[i], faces[j]] = [faces[j], faces[i]];
    }
    let k = 0;
    setTiles(tiles.map(t => t.removed ? t : { ...t, face: faces[k++] }));
    setSelected(null);
    playError();
  };

  const TW = 38, TH = 50, OFF = 6;
  const boardW = 8 * TW + OFF;
  const boardH = 4 * TH + OFF;

  return (
    <>
      <ConfettiOverlay active={confetti} />
      <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #0ea5e911 0%, transparent 60%)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
          <Link href="/" className="text-2xl">←</Link>
          <span className="font-bold text-white text-lg">Mahjong</span>
          <span className="text-sm" style={{ color: '#888' }}>🏆 {gamesWon}</span>
        </div>

        <div className="text-center py-2 text-sm" style={{ color: '#888' }}>
          {`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`} · {active.length} tiles left
        </div>

        <div className="flex-1 flex items-center justify-center px-2">
          <div style={{ position: 'relative', width: boardW, height: boardH, transform: 'scale(min(1, 1))' }}>
            {tiles.filter(t => !t.removed).sort((a, b) => a.layer - b.layer).map(t => {
              const free = freeIds.has(t.id);
              const isSel = selected === t.id;
              const x = t.c * TW - t.layer * OFF;
              const y = t.r * TH - t.layer * OFF;
              return (
                <button key={t.id} onClick={() => click(t.id)}
                  style={{
                    position: 'absolute',
                    left: x, top: y, width: TW - 2, height: TH - 2,
                    zIndex: t.layer * 10 + t.r,
                    background: isSel ? ACCENT : free ? '#f8fafc' : '#cbd5e1',
                    color: '#111',
                    border: `1px solid ${isSel ? '#fff' : '#94a3b8'}`,
                    borderRadius: 6,
                    boxShadow: `${OFF / 2}px ${OFF / 2}px 0 #475569`,
                    fontSize: 20,
                    opacity: free ? 1 : 0.75,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    touchAction: 'manipulation',
                  }}>
                  {t.face}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center gap-2 pb-4">
          <button onClick={reset} className="px-5 py-3 rounded-xl font-semibold text-sm"
            style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #2e2e2e', minHeight: 48 }}>
            ↺ New Board
          </button>
          {noMoves && (
            <button onClick={shuffle} className="px-5 py-3 rounded-xl font-semibold text-sm text-white"
              style={{ background: ACCENT, minHeight: 48 }}>
              🔀 Shuffle (no moves)
            </button>
          )}
        </div>

        {won && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
              <h2 className="text-2xl font-bold text-white">Board cleared! 🀄</h2>
              <p className="text-3xl font-bold" style={{ color: ACCENT }}>{`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`}</p>
              <button onClick={reset} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: ACCENT, minHeight: 48 }}>
                Play Again
              </button>
              <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
