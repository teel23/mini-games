'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import GameCard from '@/components/GameCard';
import { storage } from '@/lib/storage';
import { getTodayString } from '@/lib/dateUtils';

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
  { name: 'Nonogram', emoji: '🖼️', href: '/nonogram', accent: '#14b8a6' },
  { name: 'Lights Out', emoji: '💡', href: '/lights-out', accent: '#fbbf24' },
  { name: 'Grouping', emoji: '🧠', href: '/grouping', accent: '#a3e635' },
  { name: 'Snake', emoji: '🐍', href: '/snake', accent: '#16a34a' },
  { name: 'Memory', emoji: '🎴', href: '/memory', accent: '#fb7185' },
  { name: 'Mahjong', emoji: '🀄', href: '/mahjong', accent: '#0ea5e9' },
  { name: 'Flow', emoji: '🔗', href: '/flow', accent: '#ec4899' },
];

interface CardStat { stat?: string; statLabel?: string; done?: boolean; }

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Home() {
  const [stats, setStats] = useState<CardStat[]>(GAMES.map(() => ({})));
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('minigames:sound:enabled');
    setSoundEnabled(stored !== 'false');
  }, []);

  useEffect(() => {
    const today = getTodayString();

    const bestAcross = (vals: number[]) => Math.min(...vals);
    const msBest = bestAcross([
      storage.minesweeper.getBestTime('easy'),
      storage.minesweeper.getBestTime('medium'),
      storage.minesweeper.getBestTime('hard'),
    ]);
    const sdBest = bestAcross([
      storage.sudoku.getBestTime('easy'),
      storage.sudoku.getBestTime('medium'),
      storage.sudoku.getBestTime('hard'),
      storage.sudoku.getBestTime('expert'),
    ]);

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

    const num = (n: number, label: string): CardStat => n > 0 ? { stat: String(n), statLabel: label } : {};

    setStats([
      num(tttWins, 'wins vs AI'),
      best2048 > 0 ? { stat: best2048.toLocaleString(), statLabel: 'best' } : {},
      { stat: String(wordleStreak), statLabel: 'day streak', done: storage.wordle.getLastPlayedDate() === today },
      { stat: String(storage.minesweeper.getDailyStreak()), statLabel: 'streak', done: storage.minesweeper.getLastDaily() === today, ...(msBest < Infinity ? {} : {}) },
      { stat: String(storage.sudoku.getDailyStreak()), statLabel: 'streak', done: storage.sudoku.getLastDaily() === today },
      bbBest > 0 ? { stat: bbBest.toLocaleString(), statLabel: 'best' } : {},
      wsLevel > 0 ? { stat: `Lvl ${wsLevel}`, statLabel: 'reached' } : {},
      num(solWon, 'wins'),
      num(storage.hangman.getWins(), 'wins'),
      num(storage.dotsboxes.getWins(), 'wins vs AI'),
      num(storage.battleship.getWins(), 'wins vs AI'),
      num(storage.checkers.getWins(), 'wins vs AI'),
      num(storage.chess.getWins(), 'wins vs AI'),
      { stat: String(storage.nonogram.getDailyStreak()), statLabel: 'streak', done: storage.nonogram.getLastDaily() === today },
      { stat: String(storage.lightsout.getDailyStreak()), statLabel: 'streak', done: storage.lightsout.getLastDaily() === today },
      { stat: String(storage.grouping.getDailyStreak()), statLabel: 'streak', done: storage.grouping.getLastDaily() === today },
      num(storage.snake.getBestScore(), 'best'),
      storage.memory.getBestMoves() < Infinity ? { stat: String(storage.memory.getBestMoves()), statLabel: 'best moves' } : {},
      num(storage.mahjong.getGamesWon(), 'wins'),
      num(storage.flow.getHighestLevel(), 'level'),
    ]);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('minigames:sound:enabled', next ? 'true' : 'false');
  };

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 text-center relative">
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
            <span style={{ marginRight: 8 }}>🎮</span>Mini Games
          </h1>
          <p style={{ fontSize: '0.9rem', marginTop: 6, color: '#aaa' }}>
            20 games · No accounts · No tracking
          </p>
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            style={{
              position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
              fontSize: '1.3rem', color: soundEnabled ? '#f0f0f0' : '#555',
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
            }}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <Link
            href="/stats"
            title="All-time stats"
            style={{
              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
              fontSize: '1.3rem', padding: 4, textDecoration: 'none',
            }}
          >
            📊
          </Link>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
          className="sm:!grid-cols-3"
        >
          {GAMES.map((game, i) => {
            const s = stats[i];
            const hasData = s?.stat !== undefined;
            return (
              <GameCard
                key={game.href}
                name={game.name}
                emoji={game.emoji}
                href={game.href}
                accent={game.accent}
                stat={hasData ? s.stat : 'Play now →'}
                statLabel={hasData ? s.statLabel : undefined}
                accentStat={!hasData}
                done={s?.done}
                index={i}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
