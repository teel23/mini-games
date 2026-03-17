'use client';

import { useState, useEffect, useRef } from 'react';
import { useHangman, HangmanMode, HangmanDifficulty } from '@/hooks/useHangman';
import Link from 'next/link';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import { haptic } from '@/lib/haptics';
import { playWin, playError } from '@/lib/sounds';

const ACCENT = '#f43f5e';

function HangmanSVG({ wrongCount }: { wrongCount: number }) {
  return (
    <svg width="160" height="180" viewBox="0 0 160 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Gallows - always shown */}
      <line x1="20" y1="170" x2="140" y2="170" stroke="#666" strokeWidth="3" />
      <line x1="40" y1="170" x2="40" y2="20" stroke="#666" strokeWidth="3" />
      <line x1="40" y1="20" x2="100" y2="20" stroke="#666" strokeWidth="3" />
      <line x1="100" y1="20" x2="100" y2="40" stroke="#666" strokeWidth="3" />
      {/* Head */}
      {wrongCount >= 1 && <circle cx="100" cy="55" r="15" stroke="#f0f0f0" strokeWidth="2.5" />}
      {/* Body */}
      {wrongCount >= 2 && <line x1="100" y1="70" x2="100" y2="115" stroke="#f0f0f0" strokeWidth="2.5" />}
      {/* Left arm */}
      {wrongCount >= 3 && <line x1="100" y1="82" x2="75" y2="100" stroke="#f0f0f0" strokeWidth="2.5" />}
      {/* Right arm */}
      {wrongCount >= 4 && <line x1="100" y1="82" x2="125" y2="100" stroke="#f0f0f0" strokeWidth="2.5" />}
      {/* Left leg */}
      {wrongCount >= 5 && <line x1="100" y1="115" x2="78" y2="145" stroke="#f0f0f0" strokeWidth="2.5" />}
      {/* Right leg */}
      {wrongCount >= 6 && <line x1="100" y1="115" x2="122" y2="145" stroke="#f0f0f0" strokeWidth="2.5" />}
    </svg>
  );
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function HangmanPage() {
  const game = useHangman();
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

  return (
    <>
      <ConfettiOverlay active={showConfetti} />
      {!game.started ? <Setup game={game} /> : <GameView game={game} />}
    </>
  );
}

function Setup({ game }: { game: ReturnType<typeof useHangman> }) {
  const [mode, setMode] = useState<HangmanMode>('ai');
  const [diff, setDiff] = useState<HangmanDifficulty>('medium');
  const [pvpWord, setPvpWord] = useState('');
  const [showWord, setShowWord] = useState(false);

  const handleStart = () => {
    if (mode === 'ai') {
      game.startAIGame(diff);
    } else {
      if (pvpWord.trim().length < 2) return;
      game.startPVPGame(pvpWord.trim());
    }
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <Link href="/" className="text-2xl">←</Link>
        <span className="font-bold text-white text-lg">Hangman</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <HangmanSVG wrongCount={0} />

        <div className="w-full max-w-xs flex flex-col gap-6">
          <div>
            <p className="text-sm mb-3" style={{ color: '#888' }}>Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {(['ai', 'pvp'] as HangmanMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="py-3 rounded-xl font-semibold text-sm"
                  style={{
                    background: mode === m ? ACCENT : '#1a1a1a',
                    color: mode === m ? '#fff' : '#f0f0f0',
                    border: `1px solid ${mode === m ? ACCENT : '#2e2e2e'}`,
                    minHeight: 44,
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
                {(['easy', 'medium', 'hard'] as HangmanDifficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDiff(d)}
                    className="py-3 rounded-xl font-semibold text-sm capitalize"
                    style={{
                      background: diff === d ? ACCENT : '#1a1a1a',
                      color: diff === d ? '#fff' : '#f0f0f0',
                      border: `1px solid ${diff === d ? ACCENT : '#2e2e2e'}`,
                      minHeight: 44,
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'pvp' && (
            <div>
              <p className="text-sm mb-3" style={{ color: '#888' }}>Player 1: Enter a secret word</p>
              <div className="relative">
                <input
                  type={showWord ? 'text' : 'password'}
                  value={pvpWord}
                  onChange={e => setPvpWord(e.target.value.replace(/[^a-zA-Z ]/g, ''))}
                  placeholder="Secret word..."
                  className="w-full py-3 px-4 rounded-xl text-white text-lg"
                  style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', outline: 'none' }}
                  autoComplete="off"
                />
                <button
                  onClick={() => setShowWord(!showWord)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: '#888' }}
                >
                  {showWord ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleStart}
            className="w-full py-4 rounded-xl font-bold text-white"
            style={{ background: ACCENT, minHeight: 48 }}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}

function GameView({ game }: { game: ReturnType<typeof useHangman> }) {
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => game.setStarted(false)} className="text-2xl">←</button>
        <span className="font-bold text-white text-lg">Hangman</span>
        <div className="text-sm" style={{ color: '#888' }}>
          {game.mode === 'ai' && <span>Wins: {game.winsVsAI}</span>}
        </div>
      </div>

      {/* Category */}
      {game.category && (
        <div className="text-center py-2">
          <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: ACCENT + '22', color: ACCENT }}>
            {game.category}
          </span>
        </div>
      )}

      {/* Hangman drawing */}
      <div className="flex justify-center py-4">
        <HangmanSVG wrongCount={game.wrongCount} />
      </div>

      {/* Wrong count indicator */}
      <div className="text-center mb-2">
        <span className="text-sm" style={{ color: '#888' }}>
          {game.wrongCount} / {game.maxWrong} wrong
        </span>
      </div>

      {/* Word display */}
      <div className="flex justify-center gap-2 px-4 mb-4 flex-wrap">
        {game.revealedWord.map((ch, i) => (
          <div
            key={i}
            className="flex items-center justify-center font-bold text-2xl"
            style={{
              width: 40,
              height: 48,
              borderBottom: ch === ' ' ? 'none' : `3px solid ${game.gameOver && !game.won && ch === '_' ? ACCENT : '#f0f0f0'}`,
              color: game.gameOver && !game.won && ch === '_' ? ACCENT : '#f0f0f0',
            }}
          >
            {ch === '_' && game.gameOver && !game.won
              ? game.secretWord[i]
              : ch === '_' ? '' : ch}
          </div>
        ))}
      </div>

      {/* Wrong letters */}
      {game.wrongLetters.length > 0 && (
        <div className="flex justify-center gap-1 px-4 mb-4 flex-wrap">
          {game.wrongLetters.map(l => (
            <span key={l} className="text-sm font-semibold px-2 py-1 rounded" style={{ background: '#3a1a1a', color: '#ef4444' }}>
              {l}
            </span>
          ))}
        </div>
      )}

      {/* Alphabet buttons */}
      {!game.gameOver && (
        <div className="px-3 mt-auto pb-6">
          <div className="grid grid-cols-9 gap-1.5">
            {ALPHABET.map(letter => {
              const guessed = game.guessedLetters.has(letter);
              const isCorrect = guessed && game.secretWord.includes(letter);
              const isWrong = guessed && !game.secretWord.includes(letter);
              return (
                <button
                  key={letter}
                  onClick={() => game.guessLetter(letter)}
                  disabled={guessed}
                  className="flex items-center justify-center font-bold rounded-lg select-none"
                  style={{
                    minHeight: 44,
                    minWidth: 32,
                    fontSize: 16,
                    background: isCorrect ? '#22c55e33' : isWrong ? '#ef444433' : '#1a1a1a',
                    color: isCorrect ? '#22c55e' : isWrong ? '#555' : '#f0f0f0',
                    border: `1px solid ${isCorrect ? '#22c55e' : isWrong ? '#333' : '#2e2e2e'}`,
                    opacity: guessed ? 0.5 : 1,
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Game over modal */}
      {game.gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">{game.won ? 'You Win!' : 'Game Over'}</h2>
            <p className="text-lg font-bold tracking-widest" style={{ color: ACCENT }}>{game.secretWord}</p>
            {game.mode === 'ai' && game.won && (
              <p className="text-sm" style={{ color: '#888' }}>Streak: {game.currentStreak + 1}</p>
            )}
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
