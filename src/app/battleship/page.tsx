'use client';

import { useState } from 'react';
import { useBattleship, BSMode, BSDifficulty, BSSize, CellState } from '@/hooks/useBattleship';
import Link from 'next/link';

const ACCENT = '#06b6d4';

function cellColor(state: CellState, isOwn: boolean): string {
  switch (state) {
    case 'ship': return isOwn ? '#3b82f6' : 'transparent';
    case 'hit': return '#ef4444';
    case 'miss': return '#4a4a4a';
    case 'sunk': return '#991b1b';
    default: return '#1a1a1a';
  }
}

function cellContent(state: CellState): string {
  if (state === 'hit') return '✕';
  if (state === 'miss') return '·';
  if (state === 'sunk') return '✕';
  return '';
}

export default function BattleshipPage() {
  const game = useBattleship();

  if (!game.started) return <Setup game={game} />;
  if (game.phase === 'setup') return <ShipPlacement game={game} />;
  if (game.pvpPhase === 'p2pass') return <PassScreen game={game} />;
  return <BattleView game={game} />;
}

function Setup({ game }: { game: ReturnType<typeof useBattleship> }) {
  const [mode, setMode] = useState<BSMode>('ai');
  const [diff, setDiff] = useState<BSDifficulty>('medium');
  const [size, setSize] = useState<BSSize>('medium');

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <Link href="/" className="text-2xl">←</Link>
        <span className="font-bold text-white text-lg">Battleship</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-6xl">🚢</div>
        <div className="w-full max-w-xs flex flex-col gap-6">
          <div>
            <p className="text-sm mb-3" style={{ color: '#888' }}>Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {(['ai', 'pvp'] as BSMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)} className="py-3 rounded-xl font-semibold text-sm"
                  style={{ background: mode === m ? ACCENT : '#1a1a1a', color: '#fff', border: `1px solid ${mode === m ? ACCENT : '#2e2e2e'}`, minHeight: 44 }}>
                  {m === 'ai' ? 'vs AI' : 'vs Friend'}
                </button>
              ))}
            </div>
          </div>
          {mode === 'ai' && (
            <div>
              <p className="text-sm mb-3" style={{ color: '#888' }}>Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as BSDifficulty[]).map(d => (
                  <button key={d} onClick={() => setDiff(d)} className="py-3 rounded-xl font-semibold text-sm capitalize"
                    style={{ background: diff === d ? ACCENT : '#1a1a1a', color: '#fff', border: `1px solid ${diff === d ? ACCENT : '#2e2e2e'}`, minHeight: 44 }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-sm mb-3" style={{ color: '#888' }}>Board Size</p>
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as BSSize[]).map(s => (
                <button key={s} onClick={() => setSize(s)} className="py-3 rounded-xl font-semibold text-sm capitalize"
                  style={{ background: size === s ? ACCENT : '#1a1a1a', color: '#fff', border: `1px solid ${size === s ? ACCENT : '#2e2e2e'}`, minHeight: 44 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => game.init(mode, diff, size)} className="w-full py-4 rounded-xl font-bold text-white" style={{ background: ACCENT, minHeight: 48 }}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}

function PassScreen({ game }: { game: ReturnType<typeof useBattleship> }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center" style={{ background: '#0f0f0f' }}>
      <h2 className="text-xl font-bold text-white mb-4">Pass to Player 2</h2>
      <p className="text-sm mb-6" style={{ color: '#888' }}>Player 2 needs to place their ships</p>
      <button onClick={game.confirmP2Pass} className="px-8 py-4 rounded-xl font-bold text-white" style={{ background: ACCENT, minHeight: 48 }}>
        Ready
      </button>
    </div>
  );
}

function ShipPlacement({ game }: { game: ReturnType<typeof useBattleship> }) {
  const cellSize = Math.min(Math.floor(340 / game.size), 40);
  const currentShipLen = game.shipLengths[game.placingShipIdx];

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => game.setStarted(false)} className="text-2xl">←</button>
        <span className="font-bold text-white text-lg">Place Ships</span>
        <span className="text-sm" style={{ color: '#888' }}>{game.pvpPhase === 'p2setup' ? 'P2' : game.pvpPhase === 'p1setup' ? 'P1' : ''}</span>
      </div>

      {currentShipLen && (
        <div className="text-center py-3">
          <span className="text-sm" style={{ color: '#888' }}>
            Ship {game.placingShipIdx + 1}/{game.shipLengths.length} (length {currentShipLen})
            {' · '}
          </span>
          <button onClick={game.toggleHorizontal} className="text-sm font-semibold" style={{ color: ACCENT }}>
            {game.horizontal ? 'Horizontal ↔' : 'Vertical ↕'}
          </button>
        </div>
      )}

      <div className="flex justify-center px-4 py-4">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${game.size}, ${cellSize}px)`, gap: 2 }}>
          {game.setupGrid.map((row, r) =>
            row.map((cell, c) => (
              <div key={`${r}-${c}`}
                onClick={() => game.placeShipAtSetup(r, c)}
                className="flex items-center justify-center rounded cursor-pointer select-none"
                style={{
                  width: cellSize, height: cellSize,
                  background: cell === 'ship' ? '#3b82f6' : '#1a1a1a',
                  border: '1px solid #2e2e2e',
                }}>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="px-4 mt-4">
        <button onClick={game.randomSetup} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: '#333', minHeight: 48 }}>
          Random Placement
        </button>
      </div>
    </div>
  );
}

function BattleView({ game }: { game: ReturnType<typeof useBattleship> }) {
  const cellSize = Math.min(Math.floor(340 / game.size), 34);
  const isGameOver = game.phase === 'gameover';

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => game.setStarted(false)} className="text-2xl">←</button>
        <span className="font-bold text-white text-lg">Battleship</span>
        <span className="text-sm" style={{ color: '#888' }}>{game.size}x{game.size}</span>
      </div>

      {/* Turn indicator */}
      {!isGameOver && (
        <div className="text-center py-2">
          <span className="text-sm font-semibold" style={{ color: ACCENT }}>
            {game.aiThinking ? 'AI firing...' : game.currentTurn === 1 ? 'Tap to fire' : 'Opponent\'s turn'}
          </span>
        </div>
      )}

      {/* Opponent's board (where you fire) */}
      <div className="px-4 mb-2">
        <p className="text-xs mb-1 font-semibold" style={{ color: '#888' }}>
          {game.mode === 'pvp' ? 'Opponent' : 'Enemy Waters'}
        </p>
        <div className="flex justify-center">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${game.size}, ${cellSize}px)`, gap: 1 }}>
            {game.opponentView.map((row, r) =>
              row.map((cell, c) => (
                <div key={`o-${r}-${c}`}
                  onClick={() => game.fireAt(r, c)}
                  className="flex items-center justify-center rounded-sm cursor-pointer select-none font-bold"
                  style={{
                    width: cellSize, height: cellSize,
                    background: cellColor(cell, false),
                    border: '1px solid #2e2e2e',
                    fontSize: cellSize < 28 ? 10 : 14,
                    color: cell === 'hit' || cell === 'sunk' ? '#fff' : '#666',
                  }}>
                  {cellContent(cell)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Your board */}
      <div className="px-4">
        <p className="text-xs mb-1 font-semibold" style={{ color: '#888' }}>Your Fleet</p>
        <div className="flex justify-center">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${game.size}, ${cellSize}px)`, gap: 1 }}>
            {game.playerBoard.grid.map((row, r) =>
              row.map((cell, c) => {
                const viewState = game.playerView[r]?.[c];
                const displayState = viewState === 'hit' || viewState === 'miss' || viewState === 'sunk' ? viewState : cell;
                return (
                  <div key={`p-${r}-${c}`}
                    className="flex items-center justify-center rounded-sm select-none font-bold"
                    style={{
                      width: cellSize, height: cellSize,
                      background: cellColor(displayState, true),
                      border: '1px solid #2e2e2e',
                      fontSize: cellSize < 28 ? 10 : 14,
                      color: displayState === 'hit' || displayState === 'sunk' ? '#fff' : '#666',
                    }}>
                    {cellContent(displayState)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Game over */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">
              {game.winner === 1 ? (game.mode === 'pvp' ? 'Player 1 Wins!' : 'You Win!') : (game.mode === 'pvp' ? 'Player 2 Wins!' : 'AI Wins!')}
            </h2>
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
