'use client';

import { useState } from 'react';
import { useTicTacToe, Mode, Difficulty } from '@/hooks/useTicTacToe';
import PauseMenu from '@/components/PauseMenu';
import Link from 'next/link';

const ACCENT = '#60a5fa';

export default function TicTacToePage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('hard');
  const [started, setStarted] = useState(false);

  const game = useTicTacToe(mode ?? 'ai', difficulty);

  if (!started) {
    return (
      <Setup
        onStart={(m, d) => {
          setMode(m);
          setDifficulty(d);
          setStarted(true);
        }}
      />
    );
  }

  return (
    <Game
      game={game}
      mode={mode!}
      difficulty={difficulty}
      onRestart={() => game.restart()}
      onBack={() => setStarted(false)}
    />
  );
}

function Setup({ onStart }: { onStart: (m: Mode, d: Difficulty) => void }) {
  const [mode, setMode] = useState<Mode>('ai');
  const [diff, setDiff] = useState<Difficulty>('hard');

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <Link href="/" className="text-2xl">←</Link>
        <span className="font-bold text-white text-lg">Tic-Tac-Toe</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-6xl">✕</div>

        <div className="w-full max-w-xs flex flex-col gap-6">
          <div>
            <p className="text-sm mb-3" style={{ color: '#888' }}>Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {(['ai', 'friend'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{
                    background: mode === m ? ACCENT : '#1a1a1a',
                    color: mode === m ? '#000' : '#f0f0f0',
                    border: `1px solid ${mode === m ? ACCENT : '#2e2e2e'}`,
                  }}
                >
                  {m === 'ai' ? 'vs AI' : 'vs Friend'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'ai' && (
            <div>
              <p className="text-sm mb-3" style={{ color: '#888' }}>Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDiff(d)}
                    className="py-3 rounded-xl font-semibold text-sm capitalize transition-all"
                    style={{
                      background: diff === d ? ACCENT : '#1a1a1a',
                      color: diff === d ? '#000' : '#f0f0f0',
                      border: `1px solid ${diff === d ? ACCENT : '#2e2e2e'}`,
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onStart(mode, diff)}
            className="w-full py-4 rounded-xl font-bold text-base text-black"
            style={{ background: ACCENT }}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}

function Game({
  game,
  mode,
  difficulty,
  onRestart,
  onBack,
}: {
  game: ReturnType<typeof useTicTacToe>;
  mode: Mode;
  difficulty: Difficulty;
  onRestart: () => void;
  onBack: () => void;
}) {
  const { board, currentPlayer, winResult, draw, winsVsAI, paused, setPaused, handleClick, restart } = game;

  const winLine = winResult?.line ?? [];

  const statusText = winResult
    ? winResult.winner === 'X'
      ? mode === 'ai' ? 'You win! 🎉' : 'X wins!'
      : mode === 'ai' ? 'AI wins' : 'O wins!'
    : draw
    ? "It's a draw!"
    : mode === 'ai' && currentPlayer === 'O'
    ? 'AI thinking...'
    : `${currentPlayer}'s turn`;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      {paused && (
        <PauseMenu
          onResume={() => setPaused(false)}
          onRestart={() => { restart(); }}
          accentColor={ACCENT}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => setPaused(true)} className="text-2xl" style={{ color: '#888' }}>⏸</button>
        <span className="font-bold text-white">Tic-Tac-Toe</span>
        {mode === 'ai' && (
          <span className="text-sm" style={{ color: '#888' }}>
            🏆 {winsVsAI}
          </span>
        )}
        {mode === 'friend' && <div className="w-8" />}
      </div>

      {/* Status */}
      <div className="text-center py-4">
        <span className="text-lg font-semibold" style={{ color: winResult || draw ? ACCENT : '#f0f0f0' }}>
          {statusText}
        </span>
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className="grid grid-cols-3 gap-2 w-full max-w-xs"
          style={{ maxWidth: 320 }}
        >
          {board.map((cell, i) => {
            const isWinCell = winLine.includes(i);
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                className="aspect-square rounded-2xl flex items-center justify-center text-5xl font-bold transition-all active:scale-95"
                style={{
                  background: isWinCell ? ACCENT + '33' : '#1a1a1a',
                  border: `2px solid ${isWinCell ? ACCENT : '#2e2e2e'}`,
                  color: cell === 'X' ? ACCENT : '#f0f0f0',
                }}
              >
                {cell}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom */}
      <div className="p-6 flex flex-col items-center gap-3">
        {(winResult || draw) && (
          <>
            <button
              onClick={restart}
              className="w-full max-w-xs py-3 rounded-xl font-bold text-black"
              style={{ background: ACCENT }}
            >
              Play Again
            </button>
            <button
              onClick={onBack}
              className="text-sm"
              style={{ color: '#888' }}
            >
              Change settings
            </button>
          </>
        )}
        {mode === 'ai' && (
          <p className="text-xs" style={{ color: '#555' }}>
            {difficulty === 'hard' ? 'Unbeatable AI (minimax)' : difficulty === 'medium' ? 'Medium AI' : 'Easy AI'}
          </p>
        )}
      </div>
    </div>
  );
}
