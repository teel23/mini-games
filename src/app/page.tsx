'use client';

import { useEffect, useState } from 'react';
import GameCard from '@/components/GameCard';
import { storage } from '@/lib/storage';

const GAMES = [
  { name: 'Tic-Tac-Toe', emoji: '✕', href: '/tic-tac-toe', accent: '#60a5fa' },
  { name: '2048', emoji: '🟧', href: '/2048', accent: '#f97316' },
  { name: 'Wordle', emoji: '🟩', href: '/wordle', accent: '#22c55e' },
  { name: 'Minesweeper', emoji: '💣', href: '/minesweeper', accent: '#ef4444' },
  { name: 'Sudoku', emoji: '🔢', href: '/sudoku', accent: '#a78bfa' },
  { name: 'Block Blast', emoji: '🟨', href: '/block-blast', accent: '#eab308' },
  { name: 'Water Sort', emoji: '💧', href: '/water-sort', accent: '#06b6d4' },
  { name: 'Solitaire', emoji: '🃏', href: '/solitaire', accent: '#10b981' },
  { name: 'Hangman', emoji: '🪢', href: '/hangman', accent: '#f43f5e' },
  { name: 'Dots & Boxes', emoji: '⬜', href: '/dots-boxes', accent: '#8b5cf6' },
  { name: 'Battleship', emoji: '🚢', href: '/battleship', accent: '#06b6d4' },
  { name: 'Checkers', emoji: '⬤', href: '/checkers', accent: '#dc2626' },
  { name: 'Chess', emoji: '♟', href: '/chess', accent: '#f59e0b' },
];

export default function Home() {
  const [stats, setStats] = useState<{ stat?: string; statLabel?: string }[]>(
    GAMES.map(() => ({}))
  );

  useEffect(() => {
    const tttWins = storage.tictactoe.getWinsVsAI();
    const best2048 = storage['2048'].getBestScore('4x4');
    const wordleStreak = storage.wordle.getDailyStreak();
    const bbBest = storage.blockblast.getBestScore();
    const solWon = storage.solitaire.getGamesWon();
    const wsLevel = Math.max(
      storage.watersort.getHighestLevel('easy'),
      storage.watersort.getHighestLevel('medium'),
      storage.watersort.getHighestLevel('hard')
    );
    const hangmanWins = storage.hangman.getWins();

    setStats([
      tttWins > 0 ? { stat: String(tttWins), statLabel: 'wins vs AI' } : {},
      best2048 > 0 ? { stat: best2048.toLocaleString(), statLabel: 'best' } : {},
      wordleStreak > 0 ? { stat: String(wordleStreak), statLabel: 'day streak' } : {},
      {}, // minesweeper
      {}, // sudoku
      bbBest > 0 ? { stat: bbBest.toLocaleString(), statLabel: 'best' } : {},
      wsLevel > 0 ? { stat: `Lvl ${wsLevel}`, statLabel: 'reached' } : {},
      solWon > 0 ? { stat: String(solWon), statLabel: 'wins' } : {},
      hangmanWins > 0 ? { stat: String(hangmanWins), statLabel: 'wins' } : {},
      {}, // dots & boxes
      {}, // battleship
      {}, // checkers
      {}, // chess
    ]);
  }, []);

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
            <span style={{ marginRight: 8 }}>🎮</span>Mini Games
          </h1>
          <p style={{ fontSize: '0.9rem', marginTop: 6, color: '#aaa' }}>
            13 games · No accounts · No tracking
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
        className="sm:!grid-cols-3"
        >
          {GAMES.map((game, i) => (
            <GameCard
              key={game.href}
              name={game.name}
              emoji={game.emoji}
              href={game.href}
              accent={game.accent}
              stat={stats[i]?.stat}
              statLabel={stats[i]?.statLabel}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
