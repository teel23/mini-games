'use client';

import { useState, useRef, useCallback } from 'react';
import { useSolitaire, DrawMode, Card, cardColor, cardLabel, suitSymbol } from '@/hooks/useSolitaire';
import PauseMenu from '@/components/PauseMenu';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import Link from 'next/link';
import { haptic } from '@/lib/haptics';
import { playTick, playWin } from '@/lib/sounds';

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
    <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #10b98111 0%, transparent 60%)' }}>
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
                    minHeight: 44,
                  }}
                >
                  Draw {m}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => onStart(mode)} className="w-full py-4 rounded-xl font-bold text-white" style={{ background: ACCENT, minHeight: 48 }}>
            Deal Cards
          </button>
        </div>
      </div>
    </div>
  );
}

function CardView({ card, small, selected, dragging }: { card: Card; small?: boolean; selected?: boolean; dragging?: boolean }) {
  const red = cardColor(card) === 'red';
  const w = small ? 44 : 52;
  const h = small ? 62 : 74;
  return (
    <div
      className="rounded-lg flex flex-col justify-between select-none"
      style={{
        width: w, height: h,
        background: selected ? '#2a4a3a' : '#fff',
        border: `2px solid ${selected ? ACCENT : '#ccc'}`,
        padding: '3px 4px',
        flexShrink: 0,
        position: 'relative',
        minHeight: 44,
        opacity: dragging ? 0.4 : 1,
        boxShadow: selected ? `0 0 0 2px ${ACCENT}` : 'none',
      }}
    >
      <span style={{ fontSize: small ? 11 : 13, color: red ? '#dc2626' : '#1a1a1a', fontWeight: 700, lineHeight: 1 }}>
        {card.rank === 1 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank}
        {suitSymbol(card.suit)}
      </span>
      <span style={{ fontSize: small ? 18 : 22, textAlign: 'center', color: red ? '#dc2626' : '#1a1a1a', lineHeight: 1 }}>
        {suitSymbol(card.suit)}
      </span>
    </div>
  );
}

function FaceDownCard({ small, dragging }: { small?: boolean; dragging?: boolean }) {
  const w = small ? 44 : 52;
  const h = small ? 62 : 74;
  return (
    <div
      className="rounded-lg"
      style={{ width: w, height: h, background: '#1e40af', border: '2px solid #2563eb', flexShrink: 0, minHeight: 44, opacity: dragging ? 0.4 : 1 }}
    />
  );
}

function EmptySlot({ small, label, highlight }: { small?: boolean; label?: string; highlight?: boolean }) {
  const w = small ? 44 : 52;
  const h = small ? 62 : 74;
  return (
    <div
      className="rounded-lg flex items-center justify-center"
      style={{
        width: w, height: h,
        border: `2px dashed ${highlight ? ACCENT : '#2e2e2e'}`,
        flexShrink: 0, minHeight: 44,
        boxShadow: highlight ? `0 0 8px ${ACCENT}44` : 'none',
      }}
    >
      {label && <span style={{ fontSize: 16, color: highlight ? ACCENT : '#444' }}>{label}</span>}
    </div>
  );
}

interface DragState {
  cards: Card[];
  sourceKey: string; // 'waste' | 'tableau-N'
  x: number;
  y: number;
  pointerId: number;
}

interface PendingDrag {
  sourceKey: string;
  cards: Card[];
  startX: number;
  startY: number;
  pointerId: number;
}

function Game({ drawMode, onBack }: { drawMode: DrawMode; onBack: () => void }) {
  const game = useSolitaire(drawMode);
  const { state, selected } = game;

  // Use both state (for rendering) and a ref (for synchronous handler access).
  // This avoids the React race condition where onPointerUp fires before the
  // re-render caused by onPointerDown's setDrag() call, leaving the parent
  // handler as `undefined` and swallowing the drag-end event.
  const [drag, _setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const setDrag = (value: DragState | null) => {
    dragRef.current = value;
    _setDrag(value);
  };

  // Pending drag: touch started but hasn't moved past the threshold yet.
  // Stored as a ref so it's available synchronously in pointer handlers.
  const pendingDragRef = useRef<PendingDrag | null>(null);

  // Set to true after a real drag ends so that the subsequent onClick
  // synthetic event doesn't double-fire the move logic.
  const dragEndedRef = useRef(false);

  const [dragOver, setDragOver] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevWon = useRef(false);

  if (state.won && !prevWon.current) {
    prevWon.current = true;
    setShowConfetti(true);
    haptic.win();
    playWin();
    setTimeout(() => setShowConfetti(false), 2100);
  }
  if (!state.won) prevWon.current = false;

  const isWasteSelected = selected?.source === 'waste';
  const isTableauSelected = (col: number, idx: number) =>
    selected?.source === 'tableau' && selected.col === col && selected.cardIdx !== undefined && idx >= selected.cardIdx;

  // Record drag intent without touching React state. Also captures the
  // pointer on the element so we keep receiving pointer events if the
  // finger slides off the source element before the threshold is reached.
  const prepareDrag = useCallback((
    sourceKey: string,
    cards: Card[],
    x: number,
    y: number,
    pointerId: number,
    el: Element,
  ) => {
    pendingDragRef.current = { sourceKey, cards, startX: x, startY: y, pointerId };
    try { (el as HTMLElement).setPointerCapture(pointerId); } catch (_) {}
  }, []);

  // Always registered — reads from refs to avoid stale closure issues.
  const handleDragMove = useCallback((x: number, y: number) => {
    const pending = pendingDragRef.current;
    const current = dragRef.current;

    if (pending && !current) {
      const dx = Math.abs(x - pending.startX);
      const dy = Math.abs(y - pending.startY);
      if (dx > 6 || dy > 6) {
        // Crossed threshold — begin the visual drag
        const newDrag: DragState = {
          cards: pending.cards,
          sourceKey: pending.sourceKey,
          x, y,
          pointerId: pending.pointerId,
        };
        pendingDragRef.current = null;
        dragRef.current = newDrag;
        _setDrag(newDrag);
        haptic.light();
      }
      return;
    }

    if (current) {
      const updated = { ...current, x, y };
      dragRef.current = updated;
      _setDrag(updated);
      const el = document.elementFromPoint(x, y);
      const pile = el?.closest('[data-pile]')?.getAttribute('data-pile') ?? null;
      setDragOver(pile);
    }
  }, []);

  // Always registered — reads dragRef.current synchronously, so it works
  // even when called from onPointerUp before React has re-rendered.
  const handleDragEnd = useCallback((x: number, y: number) => {
    pendingDragRef.current = null;
    const currentDrag = dragRef.current;
    if (!currentDrag) return;

    // Suppress the onClick that fires right after onPointerUp
    dragEndedRef.current = true;
    setTimeout(() => { dragEndedRef.current = false; }, 50);

    const el = document.elementFromPoint(x, y);
    const pileKey = el?.closest('[data-pile]')?.getAttribute('data-pile') ?? null;

    if (pileKey) {
      if (currentDrag.sourceKey === 'waste') {
        game.selectWaste();
      } else {
        const col = parseInt(currentDrag.sourceKey.split('-')[1]);
        const pile = state.tableau[col];
        const cardIdx = pile.length - currentDrag.cards.length;
        game.selectTableauCard(col, cardIdx);
      }
      if (pileKey.startsWith('foundation-')) {
        const fi = parseInt(pileKey.split('-')[1]);
        game.moveToFoundation(fi);
      } else if (pileKey.startsWith('tableau-')) {
        const toCol = parseInt(pileKey.split('-')[1]);
        game.moveToTableau(toCol);
        haptic.light();
        playTick();
      }
    }

    dragRef.current = null;
    _setDrag(null);
    setDragOver(null);
  }, [game, state.tableau]);

  const handleDragCancel = useCallback(() => {
    pendingDragRef.current = null;
    dragRef.current = null;
    _setDrag(null);
    setDragOver(null);
  }, []);

  const handleFoundationClick = (fi: number) => {
    if (dragEndedRef.current) return;
    if (selected) { game.moveToFoundation(fi); haptic.light(); playTick(); }
  };

  const handleTableauPileClick = (col: number) => {
    if (dragEndedRef.current) return;
    if (selected) { game.moveToTableau(col); haptic.light(); playTick(); }
  };

  const handleTableauCardClick = (col: number, cardIdx: number) => {
    if (dragEndedRef.current) return;
    if (selected && selected.source !== 'tableau') {
      game.moveToTableau(col);
      haptic.light();
      playTick();
    } else {
      game.selectTableauCard(col, cardIdx);
    }
  };

  const CARD_W = 52;
  const CARD_H = 74;

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at center top, #10b98111 0%, transparent 60%)',
        userSelect: 'none',
        // Prevent page scroll while dragging; allow normal pan otherwise
        touchAction: drag ? 'none' : 'pan-y',
      }}
      onPointerMove={e => handleDragMove(e.clientX, e.clientY)}
      onPointerUp={e => handleDragEnd(e.clientX, e.clientY)}
      onPointerCancel={handleDragCancel}
    >
      <ConfettiOverlay active={showConfetti} />
      {game.paused && (
        <PauseMenu onResume={() => game.setPaused(false)} onRestart={game.restart} accentColor={ACCENT} />
      )}

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
        <div className="flex gap-1">
          <div onClick={game.drawFromStock} className="cursor-pointer" style={{ minWidth: 52, minHeight: 74 }}>
            {state.stock.length > 0 ? <FaceDownCard /> : (
              <div className="rounded-lg flex items-center justify-center text-xl"
                style={{ width: 52, height: 74, border: '2px dashed #2e2e2e', color: '#555' }}>↺</div>
            )}
          </div>
          <div
            onClick={() => { if (!dragEndedRef.current) game.selectWaste(); }}
            onPointerDown={state.waste.length > 0 ? e => {
              prepareDrag(
                'waste',
                [state.waste[state.waste.length - 1]],
                e.clientX, e.clientY, e.pointerId, e.currentTarget,
              );
            } : undefined}
            className="cursor-pointer"
          >
            {state.waste.length > 0
              ? <CardView card={state.waste[state.waste.length - 1]} selected={isWasteSelected} dragging={drag?.sourceKey === 'waste'} />
              : <EmptySlot />}
          </div>
        </div>

        <div className="flex gap-1">
          {state.foundations.map((f, fi) => (
            <div
              key={fi}
              data-pile={`foundation-${fi}`}
              onClick={() => handleFoundationClick(fi)}
              className="cursor-pointer"
            >
              {f.length > 0
                ? <CardView card={f[f.length - 1]} small />
                : <EmptySlot small label={['♥','♦','♣','♠'][fi]} highlight={dragOver === `foundation-${fi}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 px-1 pb-4">
        <div className="flex gap-1 h-full">
          {state.tableau.map((pile, col) => {
            const isHighlighted = dragOver === `tableau-${col}`;
            return (
              <div
                key={col}
                data-pile={`tableau-${col}`}
                className="flex-1 relative cursor-pointer"
                style={{ minWidth: 44 }}
                onClick={() => handleTableauPileClick(col)}
              >
                {pile.length === 0 ? (
                  <EmptySlot highlight={isHighlighted} />
                ) : (
                  <div className="relative">
                    {pile.map((card, cardIdx) => {
                      const isDragSource = drag?.sourceKey === `tableau-${col}` &&
                        cardIdx >= pile.length - drag.cards.length;
                      return (
                        <div
                          key={card.id}
                          className="absolute cursor-pointer"
                          style={{ top: cardIdx * 20, zIndex: cardIdx }}
                          onClick={e => { e.stopPropagation(); handleTableauCardClick(col, cardIdx); }}
                          onDoubleClick={() => { game.selectTableauCard(col, cardIdx); game.moveToFoundation(0); }}
                          onPointerDown={card.faceUp ? e => {
                            e.stopPropagation();
                            const dragCards = pile.slice(cardIdx);
                            if (dragCards.every(c => c.faceUp)) {
                              prepareDrag(
                                `tableau-${col}`,
                                dragCards,
                                e.clientX, e.clientY, e.pointerId, e.currentTarget,
                              );
                            }
                          } : undefined}
                        >
                          {card.faceUp
                            ? <CardView card={card} selected={isTableauSelected(col, cardIdx)} dragging={isDragSource} />
                            : <FaceDownCard dragging={isDragSource} />}
                        </div>
                      );
                    })}
                    {/* Highlight target at top of pile */}
                    {isHighlighted && (
                      <div style={{
                        position: 'absolute',
                        top: pile.length * 20,
                        width: 52, height: 4,
                        background: ACCENT,
                        borderRadius: 2,
                        zIndex: 100,
                      }} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag ghost */}
      {drag && (
        <div
          style={{
            position: 'fixed',
            left: drag.x - CARD_W / 2,
            top: drag.y - CARD_H / 4,
            zIndex: 1000,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
          }}
        >
          {drag.cards.map((card, i) => (
            <div key={card.id} style={{ position: i === 0 ? 'relative' : 'absolute', top: i * 20 }}>
              <CardView card={card} />
            </div>
          ))}
        </div>
      )}

      {state.won && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <h2 className="text-2xl font-bold text-white">You Win! 🎉</h2>
            <p className="text-sm" style={{ color: '#888' }}>Total wins: {game.gamesWon}</p>
            <button onClick={game.restart} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: ACCENT, minHeight: 48 }}>
              Deal Again
            </button>
            <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
          </div>
        </div>
      )}
    </div>
  );
}
