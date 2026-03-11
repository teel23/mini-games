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

    setStats([
      tttWins > 0 ? { stat: String(tttWins), statLabel: 'wins vs AI' } : {},
      best2048 > 0 ? { stat: best2048.toLocaleString(), statLabel: 'best' } : {},
      wordleStreak > 0 ? { stat: String(wordleStreak), statLabel: 'day streak' } : {},
      {}, // minesweeper — best time varies by difficulty, skip for now
      {}, // sudoku
      bbBest > 0 ? { stat: bbBest.toLocaleString(), statLabel: 'best' } : {},
      wsLevel > 0 ? { stat: `Lvl ${wsLevel}`, statLabel: 'reached' } : {},
      solWon > 0 ? { stat: String(solWon), statLabel: 'wins' } : {},
    ]);
  }, []);

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100dvh' }}>
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Mini Games</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>C2T Builds · No accounts · No tracking</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((game, i) => (
            <GameCard
              key={game.href}
              name={game.name}
              emoji={game.emoji}
              href={game.href}
              accent={game.accent}
              stat={stats[i]?.stat}
              statLabel={stats[i]?.statLabel}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
