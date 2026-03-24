'use client';

import { useState, useEffect, useRef } from 'react';
import { useDotsBoxes, DBMode, DBDifficulty, DBSize } from '@/hooks/useDotsBoxes';
import Link from 'next/link';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import { haptic } from '@/lib/haptics';
import { playWin, playError } from '@/lib/sounds';

const ACCENT = '#8b5cf6';
const P1_COLOR = '#60a5fa';
const P2_COLOR = '#f97316';

export default function DotsBoxesPage() {
  const game = useDotsBoxes();
  const [showConfetti, setShowConfetti] = useState(false);
  const prevGameOver = useRef(false);
  useEffect(() => {
    if (game.gameOver && !prevGameOver.current) {
      prevGameOver.current = true;
      const humanWon = game.scores[0] > game.scores[1];
      if (humanWon) { setShowConfetti(true); haptic.win(); playWin(); setTimeout(() => setShowConfetti(false), 2100); }
      else { haptic.error(); playError(); }
    }
    if (!game.gameOver) prevGameOver.current = false;
  }, [game.gameOver, game.scores]);

  return (
    <>
      <ConfettiOverlay active={showConfetti} />
      {!game.started ? <Setup game={game} /> : <GameView game={game} />}
    </>
  );
}

function Setup({ game }: { game: ReturnType<typeof useDotsBoxes> }) {
  const [mode, setMode] = useState<DBMode>('ai');
  const [diff, setDiff] = useState<DBDifficulty>('medium');
  const [size, setSize] = useState<DBSize>('small');

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <Link href="/" className="text-2xl">←</Link>
        <span className="font-bold text-white text-lg">Dots & Boxes</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-6xl">⬜</div>

        <div className="w-full max-w-xs flex flex-col gap-6">
          <div>
            <p className="text-sm mb-3" style={{ color: '#888' }}>Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {(['ai', 'pvp'] as DBMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="py-3 rounded-xl font-semibold text-sm"
                  style={{ background: mode === m ? ACCENT : '#1a1a1a', color: mode === m ? '#fff' : '#f0f0f0', border: `1px solid ${mode === m ? ACCENT : '#2e2e2e'}`, minHeight: 44 }}>
                  {m === 'ai' ? 'vs AI' : 'vs Friend'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'ai' && (
            <div>
              <p className="text-sm mb-3" style={{ color: '#888' }}>Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as DBDifficulty[]).map(d => (
                  <button key={d} onClick={() => setDiff(d)}
                    className="py-3 rounded-xl font-semibold text-sm capitalize"
                    style={{ background: diff === d ? ACCENT : '#1a1a1a', color: diff === d ? '#fff' : '#f0f0f0', border: `1px solid ${diff === d ? ACCENT : '#2e2e2e'}`, minHeight: 44 }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm mb-3" style={{ color: '#888' }}>Grid Size</p>
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as DBSize[]).map(s => (
                <button key={s} onClick={() => setSize(s)}
                  className="py-3 rounded-xl font-semibold text-sm capitalize"
                  style={{ background: size === s ? ACCENT : '#1a1a1a', color: size === s ? '#fff' : '#f0f0f0', border: `1px solid ${size === s ? ACCENT : '#2e2e2e'}`, minHeight: 44 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => game.start(mode, diff, size)}
            className="w-full py-4 rounded-xl font-bold text-white"
            style={{ background: ACCENT, minHeight: 48 }}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}

function GameView({ game }: { game: ReturnType<typeof useDotsBoxes> }) {
  const { rows, cols } = game;
  const dotSize = 10;
  const lineThickness = 6;
  // Calculate cell size based on grid size to fit on mobile
  const maxBoardWidth = 340;
  const cellSize = Math.min(Math.floor(maxBoardWidth / cols), 60);
  const hitArea = 36; // Extra padding for touch — brings hit target to 42px total

  const turnLabel = game.mode === 'pvp'
    ? `Player ${game.currentPlayer}'s turn`
    : game.currentPlayer === 1 ? 'Your turn' : 'AI thinking...';

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => game.setStarted(false)} className="text-2xl">←</button>
        <span className="font-bold text-white text-lg">Dots & Boxes</span>
        <span className="text-sm" style={{ color: '#888' }}>{rows}x{cols}</span>
      </div>

      {/* Scores */}
      <div className="flex justify-around px-4 py-3">
        <div className="text-center">
          <div className="font-bold text-2xl" style={{ color: P1_COLOR }}>{game.scores[0]}</div>
          <div className="text-xs" style={{ color: game.currentPlayer === 1 ? P1_COLOR : '#888' }}>
            {game.mode === 'pvp' ? 'P1' : 'You'}
          </div>
        </div>
        <div className="text-center">
          <div className="font-bold text-2xl" style={{ color: P2_COLOR }}>{game.scores[1]}</div>
          <div className="text-xs" style={{ color: game.currentPlayer === 2 ? P2_COLOR : '#888' }}>
            {game.mode === 'pvp' ? 'P2' : 'AI'}
          </div>
        </div>
      </div>

      {/* Turn indicator */}
      {!game.gameOver && (
        <div className="text-center pb-2">
          <span className="text-sm font-semibold" style={{ color: game.currentPlayer === 1 ? P1_COLOR : P2_COLOR }}>
            {turnLabel}
          </span>
        </div>
      )}

      {/* Board */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div style={{ position: 'relative', width: cols * cellSize + dotSize, height: rows * cellSize + dotSize, touchAction: 'manipulation' }}>
          {/* Boxes */}
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const owner = game.boxOwner.get(`${r}-${c}`);
              if (!owner) return null;
              const color = owner === 1 ? P1_COLOR : P2_COLOR;
              return (
                <div key={`box-${r}-${c}`} style={{
                  position: 'absolute',
                  left: c * cellSize + dotSize / 2,
                  top: r * cellSize + dotSize / 2,
                  width: cellSize,
                  height: cellSize,
                  background: color + '66',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: color,
                }}>
                  {owner === 1 ? (game.mode === 'pvp' ? 'P1' : 'You') : (game.mode === 'pvp' ? 'P2' : 'AI')}
                </div>
              );
            })
          )}

          {/* Horizontal lines */}
          {Array.from({ length: rows + 1 }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const key = `${r}-${c}-h`;
              const claimed = game.claimedLines.has(key);
              const owner = game.lineOwner.get(key);
              const color = claimed ? (owner === 1 ? P1_COLOR : P2_COLOR) : 'transparent';
              return (
                <div
                  key={`h-${r}-${c}`}
                  onClick={() => !claimed && game.claimLine({ r, c, dir: 'h' })}
                  style={{
                    position: 'absolute',
                    left: c * cellSize + dotSize / 2,
                    top: r * cellSize + dotSize / 2 - hitArea / 2,
                    width: cellSize,
                    height: hitArea + lineThickness,
                    cursor: claimed ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 2,
                  }}
                >
                  <div style={{
                    width: '100%',
                    height: lineThickness,
                    background: claimed ? color : '#2e2e2e',
                    borderRadius: 3,
                    transition: 'background 0.15s',
                  }} />
                </div>
              );
            })
          )}

          {/* Vertical lines */}
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols + 1 }, (_, c) => {
              const key = `${r}-${c}-v`;
              const claimed = game.claimedLines.has(key);
              const owner = game.lineOwner.get(key);
              const color = claimed ? (owner === 1 ? P1_COLOR : P2_COLOR) : 'transparent';
              return (
                <div
                  key={`v-${r}-${c}`}
                  onClick={() => !claimed && game.claimLine({ r, c, dir: 'v' })}
                  style={{
                    position: 'absolute',
                    left: c * cellSize + dotSize / 2 - hitArea / 2,
                    top: r * cellSize + dotSize / 2,
                    width: hitArea + lineThickness,
                    height: cellSize,
                    cursor: claimed ? 'default' : 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  <div style={{
                    width: lineThickness,
                    height: '100%',
                    background: claimed ? color : '#2e2e2e',
                    borderRadius: 3,
                    transition: 'background 0.15s',
                  }} />
                </div>
              );
            })
          )}

          {/* Dots */}
          {Array.from({ length: rows + 1 }, (_, r) =>
            Array.from({ length: cols + 1 }, (_, c) => (
              <div key={`dot-${r}-${c}`} style={{
                position: 'absolute',
                left: c * cellSize,
                top: r * cellSize,
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                background: '#f0f0f0',
                zIndex: 3,
              }} />
            ))
          )}
        </div>
      </div>

      {/* Game over */}
      {game.gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">
              {game.scores[0] > game.scores[1]
                ? (game.mode === 'pvp' ? 'Player 1 Wins!' : 'You Win!')
                : game.scores[1] > game.scores[0]
                ? (game.mode === 'pvp' ? 'Player 2 Wins!' : 'AI Wins!')
                : 'Draw!'}
            </h2>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: P1_COLOR }}>{game.scores[0]}</div>
                <div className="text-xs" style={{ color: '#888' }}>{game.mode === 'pvp' ? 'P1' : 'You'}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: P2_COLOR }}>{game.scores[1]}</div>
                <div className="text-xs" style={{ color: '#888' }}>{game.mode === 'pvp' ? 'P2' : 'AI'}</div>
              </div>
            </div>
            <button onClick={game.restart} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: ACCENT, minHeight: 48 }}>
              Play Again
            </button>
            <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
          </div>
        </div>
      )}
    </div>
  );
}
