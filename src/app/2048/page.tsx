'use client';

import { useState, useEffect, useCallback } from 'react';
import { use2048, getTileStyle, BoardMode } from '@/hooks/use2048';
import PauseMenu from '@/components/PauseMenu';
import Link from 'next/link';

const ACCENT = '#f97316';

export default function Game2048() {
  const [boardMode, setBoardMode] = useState<BoardMode>('4x4');
  const { grid, score, bestScore, gameOver, paused, setPaused, doMove, restart, onTouchStart, onTouchEnd } = use2048(boardMode);

  const handleKey = useCallback((e: KeyboardEvent) => {
    const map: Record<string, Parameters<typeof doMove>[0]> = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    };
    if (map[e.key]) { e.preventDefault(); doMove(map[e.key]); }
  }, [doMove]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const size = grid.length;
  const gap = size === 4 ? 8 : 6;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #f9731611 0%, transparent 60%)' }}>
      {paused && (
        <PauseMenu
          onResume={() => setPaused(false)}
          onRestart={restart}
          accentColor={ACCENT}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => setPaused(true)} className="text-2xl" style={{ color: '#888' }}>⏸</button>
        <span className="font-bold text-white text-lg">2048</span>
        <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
      </div>

      {/* Score + Mode */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <div className="flex gap-3">
          <ScoreBox label="Score" value={score} />
          <ScoreBox label="Best" value={bestScore} accent={ACCENT} />
        </div>
        <div className="flex gap-1 rounded-xl overflow-hidden border" style={{ borderColor: '#2e2e2e' }}>
          {(['4x4', '5x5'] as BoardMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setBoardMode(m); restart(); }}
              className="px-3 py-2 text-sm font-semibold transition-all"
              style={{
                background: boardMode === m ? ACCENT : '#1a1a1a',
                color: boardMode === m ? '#000' : '#888',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div
        className="flex-1 flex items-center justify-center p-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="rounded-2xl p-2 w-full"
          style={{
            background: '#1a1a1a',
            maxWidth: 380,
            display: 'grid',
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gap,
          }}
        >
          {grid.flat().map((val, i) => {
            const style = getTileStyle(val);
            return (
              <div
                key={i}
                className="aspect-square flex items-center justify-center rounded-xl font-bold transition-all"
                style={{
                  ...style,
                  fontSize: val >= 1000 ? (size === 5 ? 14 : 18) : val >= 100 ? (size === 5 ? 18 : 22) : (size === 5 ? 22 : 28),
                }}
              >
                {val > 0 ? val : ''}
              </div>
            );
          })}
        </div>
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">Game Over</h2>
            <p className="text-4xl font-bold" style={{ color: ACCENT }}>{score.toLocaleString()}</p>
            <p className="text-sm" style={{ color: '#888' }}>Best: {bestScore.toLocaleString()}</p>
            <button
              onClick={restart}
              className="w-full py-3 rounded-xl font-bold text-black"
              style={{ background: ACCENT }}
            >
              Try Again
            </button>
            <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
          </div>
        </div>
      )}

      <div className="pb-6 text-center text-xs" style={{ color: '#555' }}>
        Swipe to move tiles
      </div>
    </div>
  );
}

function ScoreBox({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl px-4 py-2" style={{ background: '#1a1a1a', minWidth: 80 }}>
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888' }}>{label}</span>
      <span className="text-xl font-bold" style={{ color: accent ?? '#f0f0f0' }}>{value.toLocaleString()}</span>
    </div>
  );
}
