'use client';

import { useState } from 'react';
import { useSolitaire, DrawMode, Card, cardColor, cardLabel, suitSymbol } from '@/hooks/useSolitaire';
import PauseMenu from '@/components/PauseMenu';
import Link from 'next/link';

const ACCENT = '#10b981';

export default function SolitairePage() {
  const [drawMode, setDrawMode] = useState<DrawMode>(1);
  const [started, setStarted] = useState(false);

  if (!started) {
    return <Setup onStart={(mode) => { setDrawMode(mode); setStarted(true); }} />;
  }

  return <Game drawMode={drawMode} onBack={() => setStarted(false)} />;
}

function Setup({ onStart }: { onStart: (mode: DrawMode) => void }) {
  const [mode, setMode] = useState<DrawMode>(1);
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
        <Link href="/" className="text-2xl">←</Link>
        <span className="font-bold text-white text-lg">Solitaire</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-6xl">🃏</div>
        <div className="w-full max-w-xs flex flex-col gap-6">
          <div>
            <p className="text-sm mb-3" style={{ color: '#888' }}>Draw Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {([1, 3] as DrawMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="py-3 rounded-xl font-semibold text-sm"
                  style={{
                    background: mode === m ? ACCENT : '#1a1a1a',
                    color: mode === m ? '#fff' : '#f0f0f0',
                    border: `1px solid ${mode === m ? ACCENT : '#2e2e2e'}`,
                  }}
                >
                  Draw {m}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => onStart(mode)}
            className="w-full py-4 rounded-xl font-bold text-white"
            style={{ background: ACCENT }}
          >
            Deal Cards
          </button>
        </div>
      </div>
    </div>
  );
}

function CardView({ card, small, selected }: { card: Card; small?: boolean; selected?: boolean }) {
  const red = cardColor(card) === 'red';
  const w = small ? 36 : 48;
  const h = small ? 52 : 68;
  return (
    <div
      className="rounded-lg flex flex-col justify-between select-none"
      style={{
        width: w, height: h,
        background: selected ? '#2a4a3a' : '#fff',
        border: `2px solid ${selected ? ACCENT : '#ccc'}`,
        padding: '2px 4px',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <span style={{ fontSize: small ? 9 : 11, color: red ? '#dc2626' : '#1a1a1a', fontWeight: 700, lineHeight: 1 }}>
        {card.rank === 1 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank}
        {suitSymbol(card.suit)}
      </span>
      <span style={{ fontSize: small ? 16 : 20, textAlign: 'center', color: red ? '#dc2626' : '#1a1a1a', lineHeight: 1 }}>
        {suitSymbol(card.suit)}
      </span>
    </div>
  );
}

function FaceDownCard({ small }: { small?: boolean }) {
  const w = small ? 36 : 48;
  const h = small ? 52 : 68;
  return (
    <div
      className="rounded-lg"
      style={{ width: w, height: h, background: '#1e40af', border: '2px solid #2563eb', flexShrink: 0 }}
    />
  );
}

function EmptySlot({ small, label }: { small?: boolean; label?: string }) {
  const w = small ? 36 : 48;
  const h = small ? 52 : 68;
  return (
    <div
      className="rounded-lg flex items-center justify-center"
      style={{ width: w, height: h, border: '2px dashed #2e2e2e', flexShrink: 0 }}
    >
      {label && <span style={{ fontSize: 14, color: '#444' }}>{label}</span>}
    </div>
  );
}

function Game({ drawMode, onBack }: { drawMode: DrawMode; onBack: () => void }) {
  const game = useSolitaire(drawMode);
  const { state, selected } = game;

  const isWasteSelected = selected?.source === 'waste';
  const isTableauSelected = (col: number, idx: number) =>
    selected?.source === 'tableau' && selected.col === col && selected.cardIdx !== undefined && idx >= selected.cardIdx;

  const handleFoundationClick = (fi: number) => {
    if (selected) game.moveToFoundation(fi);
  };

  const handleTableauPileClick = (col: number) => {
    if (selected) {
      game.moveToTableau(col);
    }
  };

  const handleTableauCardClick = (col: number, cardIdx: number) => {
    if (selected && selected.source !== 'tableau') {
      game.moveToTableau(col);
    } else {
      game.selectTableauCard(col, cardIdx);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f0f' }}>
      {game.paused && (
        <PauseMenu onResume={() => game.setPaused(false)} onRestart={game.restart} accentColor={ACCENT} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: '#2e2e2e' }}>
        <button onClick={() => game.setPaused(true)} className="text-xl" style={{ color: '#888' }}>⏸</button>
        <div className="flex gap-3 text-sm" style={{ color: '#888' }}>
          <span>Moves: {state.moves}</span>
          <span>Won: {game.gamesWon}</span>
        </div>
        <button onClick={game.autoMoveToFoundation} className="text-xs font-semibold px-2 py-1 rounded" style={{ background: ACCENT + '22', color: ACCENT }}>Auto</button>
      </div>

      {/* Top area: stock, waste, foundations */}
      <div className="px-2 py-2 flex items-center justify-between">
        {/* Stock */}
        <div className="flex gap-1">
          <div onClick={game.drawFromStock} className="cursor-pointer">
            {state.stock.length > 0 ? <FaceDownCard /> : (
              <div className="rounded-lg flex items-center justify-center text-xl"
                style={{ width: 48, height: 68, border: '2px dashed #2e2e2e', color: '#555' }}>↺</div>
            )}
          </div>
          {/* Waste */}
          <div onClick={game.selectWaste} className="cursor-pointer">
            {state.waste.length > 0
              ? <CardView card={state.waste[state.waste.length - 1]} selected={isWasteSelected} />
              : <EmptySlot />}
          </div>
        </div>

        {/* Foundations */}
        <div className="flex gap-1">
          {state.foundations.map((f, fi) => (
            <div key={fi} onClick={() => handleFoundationClick(fi)} className="cursor-pointer">
              {f.length > 0
                ? <CardView card={f[f.length - 1]} small />
                : <EmptySlot small label={['♥','♦','♣','♠'][fi]} />}
            </div>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 px-1 pb-4">
        <div className="flex gap-1 h-full">
          {state.tableau.map((pile, col) => (
            <div
              key={col}
              className="flex-1 relative cursor-pointer"
              style={{ minWidth: 44 }}
              onClick={() => handleTableauPileClick(col)}
            >
              {pile.length === 0 ? (
                <EmptySlot />
              ) : (
                <div className="relative">
                  {pile.map((card, cardIdx) => (
                    <div
                      key={card.id}
                      className="absolute cursor-pointer"
                      style={{ top: cardIdx * 20, zIndex: cardIdx }}
                      onClick={e => { e.stopPropagation(); handleTableauCardClick(col, cardIdx); }}
                      onDoubleClick={() => { game.selectTableauCard(col, cardIdx); game.moveToFoundation(0); }}
                    >
                      {card.faceUp
                        ? <CardView card={card} selected={isTableauSelected(col, cardIdx)} />
                        : <FaceDownCard />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Win */}
      {state.won && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">You Win! 🎉</h2>
            <p className="text-sm" style={{ color: '#888' }}>Total wins: {game.gamesWon}</p>
            <button onClick={game.restart} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: ACCENT }}>
              Deal Again
            </button>
            <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
          </div>
        </div>
      )}
    </div>
  );
}
