'use client';

import { useState, useCallback, useRef } from 'react';
import { useBlockBlast } from '@/hooks/useBlockBlast';
import PauseMenu from '@/components/PauseMenu';
import Link from 'next/link';

const ACCENT = '#eab308';
const SIZE = 10;
const CELL_PX = 34;

export default function BlockBlastPage() {
  const game = useBlockBlast();
  const [paused, setPaused] = useState(false);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const ghostCells = hoverCell ? new Set(game.getGhost(hoverCell[0], hoverCell[1]).map(([r,c]) => `${r}-${c}`)) : new Set<string>();

  const handleCellClick = useCallback((r: number, c: number) => {
    game.placePiece(r, c);
    setHoverCell(null);
  }, [game]);

  // Touch support: compute grid cell from touch coordinates
  const handleTouchOnCell = useCallback((e: React.TouchEvent, r: number, c: number) => {
    if (game.selectedPiece !== null) {
      setHoverCell([r, c]);
    }
  }, [game.selectedPiece]);

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #eab30811 0%, transparent 60%)' }}>
      {paused && (
        <PauseMenu onResume={() => setPaused(false)} onRestart={game.restart} accentColor={ACCENT} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => setPaused(true)} className="text-2xl" style={{ color: '#888' }}>⏸</button>
        <span className="font-bold text-white text-lg">Block Blast</span>
        <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
      </div>

      {/* Score */}
      <div className="flex justify-around px-4 py-3">
        <div className="text-center">
          <div className="font-bold text-2xl" style={{ color: ACCENT }}>{game.score.toLocaleString()}</div>
          <div className="text-xs" style={{ color: '#888' }}>Score</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-xl text-white">{game.bestScore.toLocaleString()}</div>
          <div className="text-xs" style={{ color: '#888' }}>Best</div>
        </div>
      </div>

      {/* Board */}
      <div className="flex justify-center px-2 overflow-x-auto">
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SIZE}, ${CELL_PX}px)`,
            gap: 2,
            background: '#1a1a1a',
            borderRadius: 12,
            padding: 8,
          }}
        >
          {Array.from({ length: SIZE }, (_, r) =>
            Array.from({ length: SIZE }, (_, c) => {
              const key = `${r}-${c}`;
              const isGhost = ghostCells.has(key);
              const cellVal = game.grid[r][c];
              return (
                <div
                  key={key}
                  onClick={() => handleCellClick(r, c)}
                  onMouseEnter={() => setHoverCell([r, c])}
                  onMouseLeave={() => setHoverCell(null)}
                  onTouchStart={(e) => handleTouchOnCell(e, r, c)}
                  className="rounded cursor-pointer"
                  style={{
                    width: CELL_PX,
                    height: CELL_PX,
                    background: cellVal ?? (isGhost ? (game.pieces[game.selectedPiece!]?.color ?? '#888') + '55' : '#242424'),
                    border: isGhost ? `2px solid ${game.pieces[game.selectedPiece!]?.color ?? '#888'}` : '1px solid #2e2e2e',
                    borderRadius: 4,
                    transition: 'background 0.1s',
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Pieces */}
      <div className="px-4 mt-4 flex justify-around">
        {game.pieces.map((piece, idx) => {
          if (!piece) return <div key={idx} style={{ width: 90, height: 90 }} />;
          const maxR = Math.max(...piece.cells.map(([r]) => r));
          const maxC = Math.max(...piece.cells.map(([, c]) => c));
          const cellSet = new Set(piece.cells.map(([r,c]) => `${r}-${c}`));
          const isSelected = game.selectedPiece === idx;

          return (
            <button
              key={idx}
              onClick={() => game.selectPiece(idx)}
              className="relative rounded-xl p-2"
              style={{
                background: isSelected ? piece.color + '22' : '#1a1a1a',
                border: `2px solid ${isSelected ? piece.color : '#2e2e2e'}`,
                width: 90, height: 90,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${maxC + 1}, 16px)`,
                  gap: 2,
                }}
              >
                {Array.from({ length: maxR + 1 }, (_, r) =>
                  Array.from({ length: maxC + 1 }, (_, c) => (
                    <div
                      key={`${r}-${c}`}
                      style={{
                        width: 16, height: 16,
                        background: cellSet.has(`${r}-${c}`) ? piece.color : 'transparent',
                        borderRadius: 3,
                      }}
                    />
                  ))
                )}
              </div>
            </button>
          );
        })}
      </div>

      {game.selectedPiece !== null && (
        <p className="text-center text-xs mt-2" style={{ color: '#888' }}>
          Tap the grid to place
        </p>
      )}

      {/* Game Over */}
      {game.gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">Game Over</h2>
            <p className="text-4xl font-bold" style={{ color: ACCENT }}>{game.score.toLocaleString()}</p>
            <p className="text-sm" style={{ color: '#888' }}>Best: {game.bestScore.toLocaleString()}</p>
            <button onClick={game.restart} className="w-full py-3 rounded-xl font-bold text-black" style={{ background: ACCENT }}>
              Play Again
            </button>
            <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
          </div>
        </div>
      )}
    </div>
  );
}
