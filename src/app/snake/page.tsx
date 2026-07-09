'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { storage } from '@/lib/storage';
import { haptic } from '@/lib/haptics';
import { playTick, playError } from '@/lib/sounds';

const ACCENT = '#16a34a';
const SIZE = 15;
const SPEED = 140; // ms per step

type Pt = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';

const DELTAS: Record<Dir, Pt> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function randomFood(snake: Pt[]): Pt {
  let p: Pt;
  do {
    p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
  } while (snake.some(s => s.x === p.x && s.y === p.y));
  return p;
}

export default function SnakePage() {
  const [snake, setSnake] = useState<Pt[]>([{ x: 7, y: 7 }]);
  const [food, setFood] = useState<Pt>({ x: 4, y: 4 });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);

  const dirRef = useRef<Dir>('right');
  const nextDirRef = useRef<Dir>('right');
  const snakeRef = useRef<Pt[]>(snake);
  const foodRef = useRef<Pt>(food);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { setBest(storage.snake.getBestScore()); }, []);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);

  const reset = useCallback(() => {
    const init = [{ x: 7, y: 7 }];
    setSnake(init);
    snakeRef.current = init;
    setFood(randomFood(init));
    setScore(0);
    setOver(false);
    dirRef.current = 'right';
    nextDirRef.current = 'right';
  }, []);

  const start = useCallback(() => {
    reset();
    setRunning(true);
  }, [reset]);

  const step = useCallback(() => {
    const dir = nextDirRef.current;
    dirRef.current = dir;
    const cur = snakeRef.current;
    const head = cur[0];
    const nh = { x: head.x + DELTAS[dir].x, y: head.y + DELTAS[dir].y };
    // wall or self collision
    if (nh.x < 0 || nh.x >= SIZE || nh.y < 0 || nh.y >= SIZE || cur.some(s => s.x === nh.x && s.y === nh.y)) {
      setRunning(false);
      setOver(true);
      haptic.error();
      playError();
      setScore(s => {
        if (s > storage.snake.getBestScore()) { storage.snake.setBestScore(s); setBest(s); }
        return s;
      });
      return;
    }
    const ate = nh.x === foodRef.current.x && nh.y === foodRef.current.y;
    const next = [nh, ...cur];
    if (!ate) next.pop();
    else {
      setScore(s => s + 1);
      haptic.light();
      playTick();
      setFood(randomFood(next));
    }
    snakeRef.current = next;
    setSnake(next);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(step, SPEED);
    return () => clearInterval(id);
  }, [running, step]);

  const turn = useCallback((d: Dir) => {
    if (d === OPPOSITE[dirRef.current]) return; // can't reverse
    nextDirRef.current = d;
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      if (map[e.key]) { e.preventDefault(); turn(map[e.key]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left');
    else turn(dy > 0 ? 'down' : 'up');
    touchStart.current = null;
  };

  const cellOf = (x: number, y: number): string => {
    if (snake.some(s => s.x === x && s.y === y)) {
      const isHead = snake[0].x === x && snake[0].y === y;
      return isHead ? '#4ade80' : ACCENT;
    }
    if (food.x === x && food.y === y) return '#ef4444';
    return '#161616';
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #16a34a11 0%, transparent 60%)' }}>
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <Link href="/" className="text-2xl">←</Link>
        <span className="font-bold text-white text-lg">Snake</span>
        <span className="text-sm" style={{ color: '#888' }}>Best: {best}</span>
      </div>

      <div className="text-center py-2">
        <span className="text-2xl font-bold" style={{ color: ACCENT }}>{score}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gap: 1,
            width: '100%',
            maxWidth: 360,
            aspectRatio: '1',
            background: '#2e2e2e',
            border: `2px solid ${ACCENT}55`,
            borderRadius: 8,
            padding: 1,
            touchAction: 'none',
          }}
        >
          {Array.from({ length: SIZE * SIZE }, (_, i) => {
            const x = i % SIZE, y = Math.floor(i / SIZE);
            return <div key={i} style={{ background: cellOf(x, y), borderRadius: 2 }} />;
          })}
        </div>

        {!running && (
          <button onClick={start} className="mt-6 px-8 py-3 rounded-xl font-bold text-white" style={{ background: ACCENT, minHeight: 48 }}>
            {over ? 'Play Again' : 'Start'}
          </button>
        )}
        {over && <p className="mt-3 text-sm" style={{ color: '#888' }}>Game over · scored {score}</p>}

        {/* D-pad for touch */}
        {running && (
          <div className="mt-6 grid grid-cols-3 gap-2" style={{ width: 180 }}>
            <div />
            <button onClick={() => turn('up')} className="py-3 rounded-xl font-bold" style={{ background: '#1a1a1a', color: ACCENT, border: '1px solid #2e2e2e' }}>▲</button>
            <div />
            <button onClick={() => turn('left')} className="py-3 rounded-xl font-bold" style={{ background: '#1a1a1a', color: ACCENT, border: '1px solid #2e2e2e' }}>◀</button>
            <button onClick={() => turn('down')} className="py-3 rounded-xl font-bold" style={{ background: '#1a1a1a', color: ACCENT, border: '1px solid #2e2e2e' }}>▼</button>
            <button onClick={() => turn('right')} className="py-3 rounded-xl font-bold" style={{ background: '#1a1a1a', color: ACCENT, border: '1px solid #2e2e2e' }}>▶</button>
          </div>
        )}
      </div>
    </div>
  );
}
