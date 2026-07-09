'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { storage } from '@/lib/storage';

interface StatRow {
  game: string;
  emoji: string;
  accent: string;
  entries: { label: string; value: string }[];
}

function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function n(v: number): string {
  return v > 0 ? v.toLocaleString() : '—';
}

export default function StatsPage() {
  const [rows, setRows] = useState<StatRow[]>([]);

  useEffect(() => {
    const s = storage;
    const built: StatRow[] = [
      { game: 'Tic-Tac-Toe', emoji: '✕', accent: '#60a5fa', entries: [
        { label: 'Wins vs AI', value: n(s.tictactoe.getWinsVsAI()) },
      ]},
      { game: '2048', emoji: '🟧', accent: '#f97316', entries: [
        { label: 'Best 4×4', value: n(s['2048'].getBestScore('4x4')) },
        { label: 'Best 5×5', value: n(s['2048'].getBestScore('5x5')) },
      ]},
      { game: 'Wordle', emoji: '🟩', accent: '#22c55e', entries: [
        { label: 'Daily streak', value: n(s.wordle.getDailyStreak()) },
        { label: 'Best streak', value: n(s.wordle.getBestStreak()) },
        { label: 'Games played', value: n(s.wordle.getGamesPlayed()) },
        { label: 'Wins', value: n(s.wordle.getWins()) },
      ]},
      { game: 'Minesweeper', emoji: '💣', accent: '#ef4444', entries: [
        { label: 'Best easy', value: fmtTime(s.minesweeper.getBestTime('easy')) },
        { label: 'Best medium', value: fmtTime(s.minesweeper.getBestTime('medium')) },
        { label: 'Best hard', value: fmtTime(s.minesweeper.getBestTime('hard')) },
        { label: 'Daily streak', value: n(s.minesweeper.getDailyStreak()) },
      ]},
      { game: 'Sudoku', emoji: '🔢', accent: '#a78bfa', entries: [
        { label: 'Best easy', value: fmtTime(s.sudoku.getBestTime('easy')) },
        { label: 'Best medium', value: fmtTime(s.sudoku.getBestTime('medium')) },
        { label: 'Best hard', value: fmtTime(s.sudoku.getBestTime('hard')) },
        { label: 'Best expert', value: fmtTime(s.sudoku.getBestTime('expert')) },
        { label: 'Daily streak', value: n(s.sudoku.getDailyStreak()) },
      ]},
      { game: 'Block Blast', emoji: '🟨', accent: '#eab308', entries: [
        { label: 'Best score', value: n(s.blockblast.getBestScore()) },
      ]},
      { game: 'Water Sort', emoji: '💧', accent: '#06b6d4', entries: [
        { label: 'Easy level', value: n(s.watersort.getHighestLevel('easy')) },
        { label: 'Medium level', value: n(s.watersort.getHighestLevel('medium')) },
        { label: 'Hard level', value: n(s.watersort.getHighestLevel('hard')) },
      ]},
      { game: 'Solitaire', emoji: '🃏', accent: '#10b981', entries: [
        { label: 'Games won', value: n(s.solitaire.getGamesWon()) },
        { label: 'Best time', value: fmtTime(s.solitaire.getBestTime()) },
      ]},
      { game: 'Hangman', emoji: '🪢', accent: '#f43f5e', entries: [
        { label: 'Wins', value: n(s.hangman.getWins()) },
        { label: 'Best streak', value: n(s.hangman.getBestStreak()) },
      ]},
      { game: 'Dots & Boxes', emoji: '⬜', accent: '#8b5cf6', entries: [
        { label: 'Wins vs AI', value: n(s.dotsboxes.getWins()) },
      ]},
      { game: 'Battleship', emoji: '🚢', accent: '#06b6d4', entries: [
        { label: 'Wins vs AI', value: n(s.battleship.getWins()) },
      ]},
      { game: 'Checkers', emoji: '⬤', accent: '#dc2626', entries: [
        { label: 'Wins vs AI', value: n(s.checkers.getWins()) },
      ]},
      { game: 'Chess', emoji: '♟', accent: '#f59e0b', entries: [
        { label: 'Wins vs AI', value: n(s.chess.getWins()) },
      ]},
      { game: 'Nonogram', emoji: '🖼️', accent: '#14b8a6', entries: [
        { label: 'Daily streak', value: n(s.nonogram.getDailyStreak()) },
        { label: 'Best streak', value: n(s.nonogram.getBestStreak()) },
      ]},
      { game: 'Lights Out', emoji: '💡', accent: '#fbbf24', entries: [
        { label: 'Daily streak', value: n(s.lightsout.getDailyStreak()) },
        { label: 'Best streak', value: n(s.lightsout.getBestStreak()) },
      ]},
      { game: 'Grouping', emoji: '🧠', accent: '#a3e635', entries: [
        { label: 'Daily streak', value: n(s.grouping.getDailyStreak()) },
        { label: 'Best streak', value: n(s.grouping.getBestStreak()) },
      ]},
      { game: 'Snake', emoji: '🐍', accent: '#16a34a', entries: [
        { label: 'Best score', value: n(s.snake.getBestScore()) },
      ]},
      { game: 'Memory', emoji: '🎴', accent: '#fb7185', entries: [
        { label: 'Best moves', value: isFinite(s.memory.getBestMoves()) ? String(s.memory.getBestMoves()) : '—' },
      ]},
      { game: 'Mahjong', emoji: '🀄', accent: '#0ea5e9', entries: [
        { label: 'Games won', value: n(s.mahjong.getGamesWon()) },
        { label: 'Best time', value: fmtTime(s.mahjong.getBestTime()) },
      ]},
      { game: 'Flow', emoji: '🔗', accent: '#ec4899', entries: [
        { label: 'Highest level', value: n(s.flow.getHighestLevel()) },
      ]},
    ];
    setRows(built);
  }, []);

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" style={{ color: '#aaa', fontSize: '0.9rem', fontWeight: 700 }}>← Home</Link>
        </div>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#fff', marginBottom: 4 }}>
          📊 All-Time Stats
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: 24 }}>
          Records across all 20 games — stored only on this device.
        </p>

        <div className="flex flex-col gap-3">
          {rows.map(row => (
            <div
              key={row.game}
              style={{
                borderRadius: 16,
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${row.accent}33`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: '1.1rem' }}>{row.emoji}</span>
                <span style={{ fontWeight: 800, color: row.accent }}>{row.game}</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {row.entries.map(e => (
                  <div key={e.label} style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: '#999' }}>{e.label}: </span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
