'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import { storage } from '@/lib/storage';
import { haptic } from '@/lib/haptics';
import { playTick, playSuccess, playWin } from '@/lib/sounds';

const ACCENT = '#ec4899';
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f97316', '#ec4899'];

type Cell = string; // "r,c"
interface Pair { color: number; a: Cell; b: Cell; }
interface Level { size: number; pairs: Pair[]; }

const key = (r: number, c: number): Cell => `${r},${c}`;
const parse = (s: Cell): [number, number] => { const [r, c] = s.split(',').map(Number); return [r, c]; };
const adjacent = (p: Cell, q: Cell) => {
  const [r1, c1] = parse(p), [r2, c2] = parse(q);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
};

// Serpentine path through the grid, cut into contiguous segments (each >= 2 cells).
// Every cell is used and each segment is a valid path → guaranteed solvable + full coverage.
function generateLevel(level: number): Level {
  const size = Math.min(5 + Math.floor((level - 1) / 3), 7);
  const order: Cell[] = [];
  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) for (let c = 0; c < size; c++) order.push(key(r, c));
    else for (let c = size - 1; c >= 0; c--) order.push(key(r, c));
  }
  const total = size * size;
  const numColors = Math.min(size, COLORS.length);
  // segment lengths: each >= 2, summing to total
  const lengths: number[] = Array(numColors).fill(2);
  let remaining = total - numColors * 2;
  while (remaining > 0) {
    const i = Math.floor(Math.random() * numColors);
    lengths[i]++;
    remaining--;
  }
  const pairs: Pair[] = [];
  let idx = 0;
  for (let s = 0; s < numColors; s++) {
    const seg = order.slice(idx, idx + lengths[s]);
    idx += lengths[s];
    pairs.push({ color: s, a: seg[0], b: seg[seg.length - 1] });
  }
  return { size, pairs };
}

export default function FlowPage() {
  const [level, setLevel] = useState(1);
  const [puzzle, setPuzzle] = useState<Level>(() => generateLevel(1));
  const [paths, setPaths] = useState<Record<number, Cell[]>>({});
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const drawing = useRef<number | null>(null);
  const pathsRef = useRef<Record<number, Cell[]>>({});

  const setPathsBoth = (p: Record<number, Cell[]>) => { pathsRef.current = p; setPaths(p); };

  const loadLevel = useCallback((lvl: number) => {
    setPuzzle(generateLevel(lvl));
    setPathsBoth({});
    setWon(false);
    drawing.current = null;
  }, []);

  useEffect(() => { setBest(storage.flow.getHighestLevel()); }, []);
  useEffect(() => { loadLevel(level); }, [level, loadLevel]);

  const endpointColor = useCallback((cell: Cell): number | null => {
    for (const p of puzzle.pairs) if (p.a === cell || p.b === cell) return p.color;
    return null;
  }, [puzzle]);

  const otherEndpoint = useCallback((color: number, cell: Cell): Cell => {
    const p = puzzle.pairs.find(x => x.color === color)!;
    return p.a === cell ? p.b : p.a;
  }, [puzzle]);

  const ownerOf = (cell: Cell, p: Record<number, Cell[]>): number | null => {
    for (const k of Object.keys(p)) if (p[+k].includes(cell)) return +k;
    return null;
  };

  const cellFromPoint = (x: number, y: number): Cell | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (el && el.dataset && el.dataset.cell) return el.dataset.cell;
    return null;
  };

  const startAt = (cell: Cell) => {
    const epColor = endpointColor(cell);
    const next = { ...pathsRef.current };
    if (epColor !== null) {
      drawing.current = epColor;
      next[epColor] = [cell];
      setPathsBoth(next);
      haptic.light();
      return;
    }
    const owner = ownerOf(cell, pathsRef.current);
    if (owner !== null) {
      drawing.current = owner;
      const arr = next[owner];
      const i = arr.indexOf(cell);
      next[owner] = arr.slice(0, i + 1);
      setPathsBoth(next);
    }
  };

  const extendTo = (cell: Cell) => {
    const color = drawing.current;
    if (color === null) return;
    const path = pathsRef.current[color] || [];
    if (path.length === 0) return;
    const last = path[path.length - 1];
    if (cell === last) return;
    if (!adjacent(cell, last)) return;

    // backtrack within own path
    const ownIdx = path.indexOf(cell);
    if (ownIdx >= 0) {
      const next = { ...pathsRef.current, [color]: path.slice(0, ownIdx + 1) };
      setPathsBoth(next);
      return;
    }

    const ep = endpointColor(cell);
    if (ep !== null && ep !== color) return; // can't cross another color's endpoint
    if (ep === color && cell !== otherEndpoint(color, path[0])) return; // own start endpoint, ignore

    // remove cell from any other color's path (overwrite)
    const next: Record<number, Cell[]> = {};
    for (const k of Object.keys(pathsRef.current)) {
      const ck = +k;
      if (ck === color) continue;
      const arr = pathsRef.current[ck];
      const i = arr.indexOf(cell);
      next[ck] = i >= 0 ? arr.slice(0, i) : arr;
    }
    next[color] = [...path, cell];
    setPathsBoth(next);
    playTick();

    // complete?
    if (ep === color) {
      drawing.current = null;
      playSuccess();
      haptic.medium();
      checkWin(next);
    }
  };

  const checkWin = (p: Record<number, Cell[]>) => {
    // all pairs connected
    for (const pr of puzzle.pairs) {
      const arr = p[pr.color];
      if (!arr || arr.length < 2) return;
      const ends = [arr[0], arr[arr.length - 1]];
      if (!(ends.includes(pr.a) && ends.includes(pr.b))) return;
    }
    // full coverage
    const covered = new Set<Cell>();
    for (const k of Object.keys(p)) p[+k].forEach(c => covered.add(c));
    if (covered.size !== puzzle.size * puzzle.size) return;

    setWon(true);
    setConfetti(true);
    haptic.win();
    playWin();
    setTimeout(() => setConfetti(false), 2100);
    const newLevel = level + 1;
    if (newLevel - 1 > storage.flow.getHighestLevel()) {
      storage.flow.setHighestLevel(newLevel - 1);
      setBest(newLevel - 1);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell && !won) startAt(cell);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (drawing.current === null) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell) extendTo(cell);
  };
  const onPointerUp = () => { drawing.current = null; };

  const cellColor = (cell: Cell): { bg: string; dot: boolean } => {
    const ep = endpointColor(cell);
    const owner = ownerOf(cell, paths);
    if (ep !== null) return { bg: COLORS[ep], dot: true };
    if (owner !== null) return { bg: COLORS[owner] + '88', dot: false };
    return { bg: '#161616', dot: false };
  };

  const connectedCount = puzzle.pairs.filter(pr => {
    const arr = paths[pr.color];
    if (!arr || arr.length < 2) return false;
    const ends = [arr[0], arr[arr.length - 1]];
    return ends.includes(pr.a) && ends.includes(pr.b);
  }).length;

  return (
    <>
      <ConfettiOverlay active={confetti} />
      <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #ec489911 0%, transparent 60%)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
          <Link href="/" className="text-2xl">←</Link>
          <span className="font-bold text-white text-lg">Flow</span>
          <span className="text-sm" style={{ color: '#888' }}>Best: Lvl {best}</span>
        </div>

        <div className="text-center py-2 text-sm" style={{ color: '#888' }}>
          Level <span style={{ color: ACCENT, fontWeight: 700 }}>{level}</span> · Connect all pairs · {connectedCount}/{puzzle.pairs.length} done
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`,
              gap: 3,
              width: '100%',
              maxWidth: 360,
              aspectRatio: '1',
              touchAction: 'none',
            }}
          >
            {Array.from({ length: puzzle.size * puzzle.size }, (_, i) => {
              const r = Math.floor(i / puzzle.size), c = i % puzzle.size;
              const cell = key(r, c);
              const { bg, dot } = cellColor(cell);
              return (
                <div key={cell} data-cell={cell}
                  className="rounded-lg flex items-center justify-center"
                  style={{ background: dot ? '#161616' : bg, border: '1px solid #2e2e2e', touchAction: 'none' }}>
                  {dot && <div style={{ width: '62%', height: '62%', borderRadius: '50%', background: bg }} />}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={() => loadLevel(level)} className="px-5 py-3 rounded-xl font-semibold text-sm"
              style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #2e2e2e', minHeight: 48 }}>
              ↺ Reset
            </button>
          </div>
        </div>

        {won && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
              <h2 className="text-2xl font-bold text-white">Level {level} done! 🔗</h2>
              <button onClick={() => setLevel(l => l + 1)} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: ACCENT, minHeight: 48 }}>
                Next Level →
              </button>
              <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
