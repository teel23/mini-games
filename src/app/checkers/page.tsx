'use client';

import { useState } from 'react';
import { useCheckers, CKMode, CKDifficulty } from '@/hooks/useCheckers';
import Link from 'next/link';

const ACCENT = '#dc2626';
const P1_COLOR = '#dc2626';
const P2_COLOR = '#1a1a1a';

export default function CheckersPage() {
  const game = useCheckers();

  if (!game.started) return <Setup game={game} />;
  return <GameView game={game} />;
}

function Setup({ game }: { game: ReturnType<typeof useCheckers> }) {
  const [mode, setMode] = useState<CKMode>('ai');
  const [diff, setDiff] = useState<CKDifficulty>('medium');

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <Link href="/" className="text-2xl">←</Link>
        <span className="font-bold text-white text-lg">Checkers</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-6xl">⬤</div>
        <div className="w-full max-w-xs flex flex-col gap-6">
          <div>
            <p className="text-sm mb-3" style={{ color: '#888' }}>Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {(['ai', 'pvp'] as CKMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)} className="py-3 rounded-xl font-semibold text-sm"
                  style={{ background: mode === m ? ACCENT : '#1a1a1a', color: '#fff', border: `1px solid ${mode === m ? ACCENT : '#2e2e2e'}`, minHeight: 44 }}>
                  {m === 'ai' ? 'vs AI' : 'vs Friend'}
                </button>
              ))}
            </div>
          </div>
          {mode === 'ai' && (
            <div>
              <p className="text-sm mb-3" style={{ color: '#888' }}>Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as CKDifficulty[]).map(d => (
                  <button key={d} onClick={() => setDiff(d)} className="py-3 rounded-xl font-semibold text-sm capitalize"
                    style={{ background: diff === d ? ACCENT : '#1a1a1a', color: '#fff', border: `1px solid ${diff === d ? ACCENT : '#2e2e2e'}`, minHeight: 44 }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => game.start(mode, diff)} className="w-full py-4 rounded-xl font-bold text-white" style={{ background: ACCENT, minHeight: 48 }}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}

function GameView({ game }: { game: ReturnType<typeof useCheckers> }) {
  const cellSize = Math.min(Math.floor(360 / 8), 44);

  const turnLabel = game.gameOver
    ? ''
    : game.aiThinking
    ? 'AI thinking...'
    : game.mode === 'pvp'
    ? `Player ${game.currentPlayer}'s turn`
    : game.currentPlayer === 1 ? 'Your turn' : 'AI\'s turn';

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => game.setStarted(false)} className="text-2xl">←</button>
        <span className="font-bold text-white text-lg">Checkers</span>
        <span className="text-sm" style={{ color: '#888' }}>
          {game.mode === 'ai' ? game.difficulty : 'PvP'}
        </span>
      </div>

      {!game.gameOver && (
        <div className="text-center py-3">
          <span className="text-sm font-semibold" style={{ color: game.currentPlayer === 1 ? P1_COLOR : '#aaa' }}>
            {turnLabel}
          </span>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-4">
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, ${cellSize}px)`,
          border: '2px solid #444',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {Array.from({ length: 64 }, (_, idx) => {
            const r = Math.floor(idx / 8);
            const c = idx % 8;
            const isDark = (r + c) % 2 === 1;
            const piece = game.board[idx];
            const isSelected = game.selected === idx;
            const isValidTarget = game.validTargets.has(idx);

            return (
              <div
                key={idx}
                onClick={() => game.handleCellClick(idx)}
                className="flex items-center justify-center cursor-pointer select-none"
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: isSelected ? '#4ade8066' : isValidTarget ? '#22c55e33' : isDark ? '#5c4033' : '#d4a76a',
                }}
              >
                {piece && (
                  <div style={{
                    width: cellSize * 0.75,
                    height: cellSize * 0.75,
                    borderRadius: '50%',
                    background: piece.player === 1 ? P1_COLOR : P2_COLOR,
                    border: `3px solid ${piece.player === 1 ? '#fca5a5' : '#666'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 0 8px #4ade80' : '0 2px 4px rgba(0,0,0,0.3)',
                    fontSize: cellSize * 0.35,
                    color: piece.player === 1 ? '#fff' : '#ccc',
                    fontWeight: 700,
                  }}>
                    {piece.type === 'king' ? 'K' : ''}
                  </div>
                )}
                {!piece && isValidTarget && (
                  <div style={{
                    width: cellSize * 0.3,
                    height: cellSize * 0.3,
                    borderRadius: '50%',
                    background: '#22c55e88',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {game.gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">
              {game.winner === 1 ? (game.mode === 'pvp' ? 'Player 1 Wins!' : 'You Win!') : (game.mode === 'pvp' ? 'Player 2 Wins!' : 'AI Wins!')}
            </h2>
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
