'use client';

import { useState, useRef, useCallback } from 'react';
import { useMinesweeper, Difficulty, GameMode } from '@/hooks/useMinesweeper';
import PauseMenu from '@/components/PauseMenu';
import Link from 'next/link';

const ACCENT = '#ef4444';

const CELL_COLORS: Record<number, string> = {
  1: '#60a5fa', 2: '#22c55e', 3: '#ef4444', 4: '#7c3aed',
  5: '#dc2626', 6: '#06b6d4', 7: '#000', 8: '#888',
};

export default function MinesweeperPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [mode, setMode] = useState<GameMode>('random');

  const game = useMinesweeper(difficulty, mode);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback((r: number, c: number) => {
    longPressTimer.current = setTimeout(() => {
      game.handleLongPress(r, c);
      longPressTimer.current = null;
    }, 500);
  }, [game]);

  const handleTouchEnd = useCallback((r: number, c: number, e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      game.handleClick(r, c);
    }
  }, [game]);

  const { config } = game;
  const isHard = difficulty === 'hard';

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #ef444411 0%, transparent 60%)' }}>
      {game.paused && (
        <PauseMenu onResume={() => game.setPaused(false)} onRestart={game.restart} accentColor={ACCENT} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => game.setPaused(true)} className="text-2xl" style={{ color: '#888' }}>⏸</button>
        <span className="font-bold text-white text-lg">Minesweeper</span>
        <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 flex gap-3">
        <div className="flex gap-1 rounded-xl overflow-hidden border flex-1" style={{ borderColor: '#2e2e2e' }}>
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => { setDifficulty(d); game.restart(); }}
              className="flex-1 py-2 text-xs font-semibold capitalize transition-all"
              style={{ background: difficulty === d ? ACCENT : '#1a1a1a', color: difficulty === d ? '#fff' : '#888' }}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl overflow-hidden border" style={{ borderColor: '#2e2e2e' }}>
          {(['random', 'daily'] as GameMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); game.restart(); }}
              className="px-3 py-2 text-xs font-semibold capitalize transition-all"
              style={{ background: mode === m ? ACCENT : '#1a1a1a', color: mode === m ? '#fff' : '#888' }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex justify-around px-4 pb-3">
        <div className="text-center">
          <div className="font-bold text-lg" style={{ color: ACCENT }}>💣 {game.minesLeft}</div>
          <div className="text-xs" style={{ color: '#888' }}>Mines</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-lg text-white">⏱ {game.elapsed}s</div>
          <div className="text-xs" style={{ color: '#888' }}>Time</div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto px-2 pb-4" onContextMenu={e => e.preventDefault()}>
        {!game.grid ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <p className="text-4xl mb-3">💣</p>
              <p style={{ color: '#888' }}>Tap a cell to start</p>
              <p className="text-xs mt-1" style={{ color: '#555' }}>Long-press to flag</p>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${config.cols}, ${isHard ? 28 : difficulty === 'medium' ? 30 : 36}px)`,
              gap: 2,
              overflowX: 'auto',
              width: 'fit-content',
              margin: '0 auto',
            }}
          >
            {game.grid.flat().map((cell, idx) => {
              const r = Math.floor(idx / config.cols);
              const c = idx % config.cols;
              const sz = isHard ? 28 : difficulty === 'medium' ? 30 : 36;

              let bg = '#1a1a1a';
              let content: string = '';
              let textColor = '#f0f0f0';

              if (cell.state === 'revealed') {
                bg = '#242424';
                if (cell.mine) { bg = '#7f1d1d'; content = '💣'; }
                else if (cell.adjacent > 0) {
                  content = String(cell.adjacent);
                  textColor = CELL_COLORS[cell.adjacent] ?? '#fff';
                }
              } else if (cell.state === 'flagged') {
                content = '🚩';
              }

              return (
                <div
                  key={idx}
                  onClick={() => cell.state === 'revealed' ? game.handleChord(r, c) : game.handleClick(r, c)}
                  onContextMenu={e => { e.preventDefault(); game.handleLongPress(r, c); }}
                  onTouchStart={() => handleTouchStart(r, c)}
                  onTouchEnd={e => handleTouchEnd(r, c, e)}
                  className="flex items-center justify-center rounded font-bold select-none"
                  style={{
                    width: sz,
                    height: sz,
                    background: bg,
                    border: `1px solid ${cell.state === 'revealed' ? '#333' : '#3a3a3a'}`,
                    fontSize: sz < 28 ? 10 : 14,
                    color: textColor,
                    cursor: 'pointer',
                  }}
                >
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Result */}
      {(game.won || game.gameOver) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">{game.won ? '🎉 Clear!' : '💥 Boom!'}</h2>
            {game.won && <p className="text-3xl font-bold" style={{ color: ACCENT }}>{game.elapsed}s</p>}
            <button onClick={game.restart} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: ACCENT }}>
              {game.won ? 'Play Again' : 'Try Again'}
            </button>
            <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
          </div>
        </div>
      )}
    </div>
  );
}
