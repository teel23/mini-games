'use client';

import { useState } from 'react';
import { useChess, ChessMode, ChessDifficulty, pieceSymbol } from '@/hooks/useChess';
import Link from 'next/link';

const ACCENT = '#f59e0b';

export default function ChessPage() {
  const game = useChess();

  if (!game.started) return <Setup game={game} />;
  return <GameView game={game} />;
}

function Setup({ game }: { game: ReturnType<typeof useChess> }) {
  const [mode, setMode] = useState<ChessMode>('ai');
  const [diff, setDiff] = useState<ChessDifficulty>('medium');

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <Link href="/" className="text-2xl">←</Link>
        <span className="font-bold text-white text-lg">Chess</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-6xl">♟</div>
        <div className="w-full max-w-xs flex flex-col gap-6">
          <div>
            <p className="text-sm mb-3" style={{ color: '#888' }}>Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {(['ai', 'pvp'] as ChessMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)} className="py-3 rounded-xl font-semibold text-sm"
                  style={{ background: mode === m ? ACCENT : '#1a1a1a', color: mode === m ? '#000' : '#f0f0f0', border: `1px solid ${mode === m ? ACCENT : '#2e2e2e'}`, minHeight: 44 }}>
                  {m === 'ai' ? 'vs AI' : 'vs Friend'}
                </button>
              ))}
            </div>
          </div>
          {mode === 'ai' && (
            <div>
              <p className="text-sm mb-3" style={{ color: '#888' }}>Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as ChessDifficulty[]).map(d => (
                  <button key={d} onClick={() => setDiff(d)} className="py-3 rounded-xl font-semibold text-sm capitalize"
                    style={{ background: diff === d ? ACCENT : '#1a1a1a', color: diff === d ? '#000' : '#f0f0f0', border: `1px solid ${diff === d ? ACCENT : '#2e2e2e'}`, minHeight: 44 }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => game.start(mode, diff)} className="w-full py-4 rounded-xl font-bold text-black" style={{ background: ACCENT, minHeight: 48 }}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}

function GameView({ game }: { game: ReturnType<typeof useChess> }) {
  const cellSize = Math.min(Math.floor(360 / 8), 44);

  const turnLabel = game.gameOver
    ? ''
    : game.aiThinking
    ? 'AI thinking...'
    : game.mode === 'pvp'
    ? `${game.currentPlayer}'s turn`
    : game.currentPlayer === 'white' ? 'Your turn' : '';

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => game.setStarted(false)} className="text-2xl">←</button>
        <span className="font-bold text-white text-lg">Chess</span>
        <span className="text-sm" style={{ color: '#888' }}>
          {game.mode === 'ai' ? game.difficulty : 'PvP'}
        </span>
      </div>

      {/* Captured pieces - black's captures */}
      <div className="px-4 pt-2 flex gap-0.5 flex-wrap min-h-[24px]">
        {game.captured.white.map((p, i) => (
          <span key={i} style={{ fontSize: 16 }}>{pieceSymbol(p)}</span>
        ))}
      </div>

      {/* Turn / Check indicator */}
      {!game.gameOver && (
        <div className="text-center py-1">
          <span className="text-sm font-semibold" style={{ color: game.inCheck ? '#ef4444' : ACCENT }}>
            {game.inCheck ? 'Check!' : turnLabel}
          </span>
        </div>
      )}

      {/* Board */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, ${cellSize}px)`,
          border: '2px solid #444',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          {Array.from({ length: 64 }, (_, idx) => {
            const r = Math.floor(idx / 8);
            const c = idx % 8;
            const isLight = (r + c) % 2 === 0;
            const piece = game.board[idx];
            const isSelected = game.selected === idx;
            const isValidTarget = game.validTargets.has(idx);
            const isKingInCheck = game.inCheck && idx === game.kingIdx;

            return (
              <div
                key={idx}
                onClick={() => game.handleCellClick(idx)}
                className="flex items-center justify-center cursor-pointer select-none"
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: isKingInCheck ? '#ef444466' : isSelected ? '#f59e0b66' : isValidTarget ? '#22c55e33' : isLight ? '#e8d5b5' : '#b08968',
                  fontSize: cellSize * 0.7,
                  lineHeight: 1,
                }}
              >
                {piece && pieceSymbol(piece)}
                {!piece && isValidTarget && (
                  <div style={{
                    width: cellSize * 0.25,
                    height: cellSize * 0.25,
                    borderRadius: '50%',
                    background: '#22c55e88',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Captured pieces - white's captures */}
      <div className="px-4 pb-2 flex gap-0.5 flex-wrap min-h-[24px]">
        {game.captured.black.map((p, i) => (
          <span key={i} style={{ fontSize: 16 }}>{pieceSymbol(p)}</span>
        ))}
      </div>

      {/* Game over */}
      {game.gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">
              {game.result === 'checkmate'
                ? game.winner === 'white'
                  ? (game.mode === 'pvp' ? 'White Wins!' : 'You Win!')
                  : (game.mode === 'pvp' ? 'Black Wins!' : 'AI Wins!')
                : 'Stalemate!'}
            </h2>
            <p className="text-sm" style={{ color: '#888' }}>
              {game.result === 'checkmate' ? 'Checkmate' : 'Draw by stalemate'}
            </p>
            <button onClick={game.restart} className="w-full py-3 rounded-xl font-bold text-black" style={{ background: ACCENT, minHeight: 48 }}>
              Play Again
            </button>
            <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
          </div>
        </div>
      )}
    </div>
  );
}
