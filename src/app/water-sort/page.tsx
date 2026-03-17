'use client';

import { useState, useRef } from 'react';
import { useWaterSort, Difficulty } from '@/hooks/useWaterSort';
import PauseMenu from '@/components/PauseMenu';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import Link from 'next/link';
import { haptic } from '@/lib/haptics';
import { playTick, playWin } from '@/lib/sounds';

const ACCENT = '#06b6d4';
const CAPACITY = 4;

export default function WaterSortPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [paused, setPaused] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pouringFrom, setPouringFrom] = useState<number | null>(null);
  const prevWon = useRef(false);
  const game = useWaterSort(difficulty);

  const tubesPerRow = Math.ceil(game.tubes.length / 2);

  const handleTube = (idx: number) => {
    const wasSelected = game.selected === idx;
    const couldPour = game.selected !== null && game.selected !== idx;

    if (couldPour) {
      setPouringFrom(game.selected);
      haptic.light();
      playTick();
      setTimeout(() => setPouringFrom(null), 280);
    }

    game.handleTube(idx);

    if (game.won && !prevWon.current) {
      prevWon.current = true;
      setShowConfetti(true);
      haptic.win();
      playWin();
      setTimeout(() => setShowConfetti(false), 2100);
    }
  };

  if (!game.won && prevWon.current) prevWon.current = false;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #06b6d411 0%, transparent 60%)' }}>
      <ConfettiOverlay active={showConfetti} />
      {paused && (
        <PauseMenu onResume={() => setPaused(false)} onRestart={game.restart} accentColor={ACCENT} />
      )}

      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => setPaused(true)} className="text-2xl" style={{ color: '#888' }}>⏸</button>
        <span className="font-bold text-white text-lg">Water Sort</span>
        <span className="font-semibold" style={{ color: ACCENT }}>Lv {game.level}</span>
      </div>

      <div className="px-4 py-3 flex gap-2">
        <div className="flex gap-1 rounded-xl overflow-hidden border flex-1" style={{ borderColor: '#2e2e2e' }}>
          {(['easy','medium','hard'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className="flex-1 py-2 text-xs font-semibold capitalize"
              style={{ background: difficulty === d ? ACCENT : '#1a1a1a', color: difficulty === d ? '#fff' : '#888' }}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          onClick={game.undo}
          disabled={!game.canUndo}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: game.canUndo ? '#1a1a1a' : '#111', color: game.canUndo ? '#f0f0f0' : '#444', border: '1px solid #2e2e2e' }}
        >
          ↩ Undo
        </button>
        <button
          onClick={game.restart}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: '#1a1a1a', color: '#888', border: '1px solid #2e2e2e' }}
        >
          ↺
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-2">
        <div className="flex flex-col gap-6">
          {[0, 1].map(rowIdx => {
            const start = rowIdx * tubesPerRow;
            const end = Math.min(start + tubesPerRow, game.tubes.length);
            return (
              <div key={rowIdx} className="flex gap-3 justify-center">
                {game.tubes.slice(start, end).map((tube, i) => {
                  const idx = start + i;
                  const isSelected = game.selected === idx;
                  const isPouring = pouringFrom === idx;
                  return (
                    <TubeComponent
                      key={idx}
                      tube={tube}
                      isSelected={isSelected}
                      isPouring={isPouring}
                      onClick={() => handleTube(idx)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {game.won && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">Level Clear! 🎉</h2>
            <p className="font-bold text-lg" style={{ color: ACCENT }}>Level {game.level - 1} done</p>
            <button onClick={game.nextLevel} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: ACCENT }}>
              Next Level
            </button>
            <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function TubeComponent({
  tube, isSelected, isPouring, onClick,
}: {
  tube: string[]; isSelected: boolean; isPouring: boolean; onClick: () => void;
}) {
  const slots = Array.from({ length: CAPACITY }, (_, i) => {
    const displayIdx = CAPACITY - 1 - i;
    return tube[displayIdx] ?? null;
  });

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Pour drip animation */}
      {isPouring && tube.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: tube[tube.length - 1],
            animation: 'pourDrip 0.25s ease-in forwards',
            zIndex: 10,
          }}
        />
      )}
      <button
        onClick={onClick}
        className="relative flex flex-col rounded-b-full rounded-t-lg overflow-hidden"
        style={{
          width: 44,
          height: 160,
          border: `2px solid ${isSelected ? '#fff' : '#3a3a3a'}`,
          background: '#111',
          transform: isSelected ? 'translateY(-8px)' : 'none',
          transition: 'transform 0.15s ease, border-color 0.15s',
          padding: 0,
        }}
      >
        {slots.map((color, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              width: '100%',
              background: color ?? 'transparent',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </button>
    </div>
  );
}
