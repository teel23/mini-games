'use client';

import { useState } from 'react';
import { useSudoku, Difficulty, GameMode } from '@/hooks/useSudoku';
import PauseMenu from '@/components/PauseMenu';
import Link from 'next/link';

const ACCENT = '#a78bfa';

export default function SudokuPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [mode, setMode] = useState<GameMode>('random');
  const game = useSudoku(difficulty, mode);

  if (!game.userGrid || !game.puzzle) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <p style={{ color: '#888' }}>Generating puzzle...</p>
      </div>
    );
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      {game.paused && (
        <PauseMenu onResume={() => game.setPaused(false)} onRestart={game.restart} accentColor={ACCENT} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => game.setPaused(true)} className="text-2xl" style={{ color: '#888' }}>⏸</button>
        <span className="font-bold text-white text-lg">Sudoku</span>
        <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 flex gap-2">
        <div className="flex gap-0.5 rounded-xl overflow-hidden border flex-1" style={{ borderColor: '#2e2e2e' }}>
          {(['easy','medium','hard','expert'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className="flex-1 py-2 text-xs font-semibold capitalize"
              style={{ background: difficulty === d ? ACCENT : '#1a1a1a', color: difficulty === d ? '#fff' : '#888' }}
            >
              {d === 'expert' ? 'X' : d[0].toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 rounded-xl overflow-hidden border" style={{ borderColor: '#2e2e2e' }}>
          {(['random','daily'] as GameMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-2 text-xs font-semibold capitalize"
              style={{ background: mode === m ? ACCENT : '#1a1a1a', color: mode === m ? '#fff' : '#888' }}
            >
              {m === 'daily' ? '📅' : '🎲'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-around px-4 pb-2">
        <div className="text-center">
          <div className="font-bold" style={{ color: ACCENT }}>{formatTime(game.elapsed)}</div>
          <div className="text-xs" style={{ color: '#888' }}>Time</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-white">{game.mistakes}</div>
          <div className="text-xs" style={{ color: '#888' }}>Mistakes</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-white">{game.streak}</div>
          <div className="text-xs" style={{ color: '#888' }}>Streak</div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex justify-center px-2">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)',
            border: `2px solid ${ACCENT}`,
            borderRadius: 8,
            overflow: 'hidden',
            width: '100%',
            maxWidth: 380,
          }}
        >
          {game.userGrid.map((row, r) =>
            row.map((val, c) => {
              const given = game.puzzle![r][c] !== 0;
              const highlight = game.getHighlight(r, c);
              const isWrong = !given && val !== 0 && game.solution && val !== game.solution[r][c];

              const borderRight = (c + 1) % 3 === 0 && c < 8 ? `2px solid ${ACCENT}` : '1px solid #2e2e2e';
              const borderBottom = (r + 1) % 3 === 0 && r < 8 ? `2px solid ${ACCENT}` : '1px solid #2e2e2e';

              let bg = '#0f0f0f';
              if (highlight === 'selected') bg = ACCENT + '44';
              else if (highlight === 'same') bg = ACCENT + '22';
              else if (highlight === 'related') bg = '#1a1a1a';

              const cellNotes = game.notes[r][c];

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => game.selectCell(r, c)}
                  className="aspect-square flex items-center justify-center select-none cursor-pointer relative"
                  style={{
                    background: bg,
                    borderRight,
                    borderBottom,
                    fontSize: val > 0 ? 18 : 8,
                    fontWeight: given ? 700 : 400,
                    color: given ? '#f0f0f0' : isWrong ? '#ef4444' : ACCENT,
                  }}
                >
                  {val > 0 ? val : cellNotes.size > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, width: '90%', height: '90%' }}>
                      {[1,2,3,4,5,6,7,8,9].map(n => (
                        <span key={n} style={{ textAlign: 'center', fontSize: 7, color: '#888', lineHeight: 1.4 }}>
                          {cellNotes.has(n) ? n : ''}
                        </span>
                      ))}
                    </div>
                  ) : ''}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Number pad */}
      <div className="px-4 mt-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={game.toggleNotes}
            className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: game.notesMode ? ACCENT + '33' : '#1a1a1a',
              border: `1px solid ${game.notesMode ? ACCENT : '#2e2e2e'}`,
              color: game.notesMode ? ACCENT : '#888',
            }}
          >
            ✏️ Notes {game.notesMode ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => game.inputNumber(0)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', color: '#888' }}
          >
            Erase
          </button>
        </div>
        <div className="grid grid-cols-9 gap-1.5">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button
              key={n}
              onClick={() => game.inputNumber(n)}
              className="aspect-square rounded-xl font-bold text-lg flex items-center justify-center"
              style={{ background: '#1a1a1a', color: ACCENT, border: `1px solid #2e2e2e` }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Win overlay */}
      {game.won && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">Solved! 🎉</h2>
            <p className="text-3xl font-bold" style={{ color: ACCENT }}>{formatTime(game.elapsed)}</p>
            <button onClick={game.restart} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: ACCENT }}>
              New Puzzle
            </button>
            <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
          </div>
        </div>
      )}
    </div>
  );
}
