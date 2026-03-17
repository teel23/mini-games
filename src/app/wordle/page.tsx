'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWordle, LetterState, GameMode } from '@/hooks/useWordle';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import Link from 'next/link';
import { haptic } from '@/lib/haptics';
import { playTick, playWin, playError } from '@/lib/sounds';

const ACCENT = '#22c55e';
const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

function stateColor(state: LetterState | undefined): string {
  if (state === 'correct') return '#22c55e';
  if (state === 'present') return '#ca8a04';
  if (state === 'absent') return '#3a3a3a';
  return '#2e2e2e';
}

export default function WordlePage() {
  const [mode, setMode] = useState<GameMode>('daily');
  const game = useWordle(mode);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevGameOver = useRef(false);
  useEffect(() => {
    if (game.gameOver && !prevGameOver.current) {
      prevGameOver.current = true;
      if (game.won) { setShowConfetti(true); haptic.win(); playWin(); setTimeout(() => setShowConfetti(false), 2100); }
      else { haptic.error(); playError(); }
    }
    if (!game.gameOver) prevGameOver.current = false;
  }, [game.gameOver, game.won]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') { game.submitGuess(); haptic.light(); }
    else if (e.key === 'Backspace') { game.deleteLetter(); haptic.light(); }
    else if (/^[a-zA-Z]$/.test(e.key)) game.addLetter(e.key.toUpperCase());
  }, [game]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const [copied, setCopied] = useState(false);
  const handleShare = () => {
    navigator.clipboard.writeText(game.shareText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
<>
      <ConfettiOverlay active={showConfetti} />
      <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #22c55e11 0%, transparent 60%)', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <Link href="/" className="text-2xl">←</Link>
        <span className="font-bold text-white text-lg">Wordle</span>
        <div className="flex gap-1 rounded-xl overflow-hidden border" style={{ borderColor: '#2e2e2e' }}>
          {(['daily', 'random'] as GameMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1.5 text-xs font-semibold transition-all capitalize"
              style={{ background: mode === m ? ACCENT : '#1a1a1a', color: mode === m ? '#000' : '#888' }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Streak (daily) */}
      {mode === 'daily' && (
        <div className="flex justify-center gap-6 py-3">
          <div className="text-center">
            <div className="font-bold text-lg" style={{ color: ACCENT }}>{game.streak}</div>
            <div className="text-xs" style={{ color: '#888' }}>Streak</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-white">{game.bestStreak}</div>
            <div className="text-xs" style={{ color: '#888' }}>Best</div>
          </div>
        </div>
      )}

      {/* Error */}
      {game.error && (
        <div className="mx-4 text-center py-2 px-4 rounded-xl text-sm font-semibold" style={{ background: '#3a3a3a', color: '#f0f0f0' }}>
          {game.error}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center px-4 py-2">
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 6 }).map((_, rowIdx) => {
            const guess = game.guesses[rowIdx];
            const isCurrentRow = rowIdx === game.guesses.length && !game.gameOver;
            const currentWord = isCurrentRow ? game.currentInput.padEnd(5, ' ') : '';

            return (
              <div key={rowIdx} className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, colIdx) => {
                  const letter = guess ? guess.word[colIdx] : isCurrentRow ? currentWord[colIdx]?.trim() : '';
                  const state = guess?.states[colIdx];
                  const bg = guess ? stateColor(state) : letter ? '#3a3a3a' : '#1a1a1a';
                  const border = guess ? 'transparent' : letter ? '#888' : '#2e2e2e';

                  return (
                    <div
                      key={colIdx}
                      className="w-14 h-14 flex items-center justify-center font-bold text-xl rounded-lg text-white"
                      style={{ background: bg, border: `2px solid ${border}`, transition: 'background 0.2s' }}
                    >
                      {letter || ''}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Result banner */}
      {game.gameOver && (
        <div className="mx-4 mb-2 rounded-xl p-4 text-center" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
          {game.won ? (
            <p className="font-bold text-lg" style={{ color: ACCENT }}>
              {['Genius!','Magnificent!','Impressive!','Splendid!','Great!','Phew!'][Math.min(game.guesses.length - 1, 5)]}
            </p>
          ) : (
            <p className="font-bold text-lg text-white">{game.target}</p>
          )}
          <div className="flex gap-2 justify-center mt-3">
            {mode === 'daily' && game.won && (
              <button
                onClick={handleShare}
                className="px-4 py-2 rounded-lg font-semibold text-sm text-black"
                style={{ background: ACCENT }}
              >
                {copied ? 'Copied!' : 'Share'}
              </button>
            )}
            {mode === 'random' && (
              <button
                onClick={game.restart}
                className="px-4 py-2 rounded-lg font-semibold text-sm text-black"
                style={{ background: ACCENT }}
              >
                Play Again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Keyboard */}
      <div className="px-2 pb-4 flex flex-col gap-1.5">
        {KEYBOARD_ROWS.map((row, i) => (
          <div key={i} className="flex justify-center gap-1">
            {row.map(key => {
              const state = game.letterMap[key];
              const isWide = key === 'ENTER' || key === '⌫';
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'ENTER') { game.submitGuess(); haptic.light(); }
                    else if (key === '⌫') { game.deleteLetter(); haptic.light(); }
                    else { game.addLetter(key); haptic.light(); playTick(); }
                  }}
                  className="flex items-center justify-center font-bold rounded-lg select-none active:opacity-70 transition-opacity"
                  style={{
                    width: isWide ? 56 : 34,
                    height: 48,
                    fontSize: isWide ? 11 : 14,
                    background: state ? stateColor(state) : '#2e2e2e',
                    color: state && state !== 'unknown' ? '#fff' : '#f0f0f0',
                    flexShrink: 0,
                  }}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
