'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import { storage } from '@/lib/storage';
import { haptic } from '@/lib/haptics';
import { playTick, playSuccess, playWin } from '@/lib/sounds';

const ACCENT = '#fb7185';
const FACES = ['🍎', '🚀', '🌟', '🎸', '🐶', '🍕', '⚽', '🌵'];

interface Card { id: number; face: string; flipped: boolean; matched: boolean; }

function buildDeck(): Card[] {
  const pairs = [...FACES, ...FACES];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((face, id) => ({ id, face, flipped: false, matched: false }));
}

export default function MemoryPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState<number>(Infinity);
  const [won, setWon] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [locked, setLocked] = useState(false);
  const firstRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setCards(buildDeck());
    setMoves(0);
    setWon(false);
    setLocked(false);
    firstRef.current = null;
  }, []);

  useEffect(() => {
    setBest(storage.memory.getBestMoves());
    reset();
  }, [reset]);

  const flip = (id: number) => {
    if (locked || won) return;
    setCards(prev => {
      const card = prev.find(c => c.id === id);
      if (!card || card.flipped || card.matched) return prev;
      const next = prev.map(c => c.id === id ? { ...c, flipped: true } : c);
      haptic.light();
      playTick();

      if (firstRef.current === null) {
        firstRef.current = id;
        return next;
      }

      // second card
      const firstId = firstRef.current;
      firstRef.current = null;
      setMoves(m => m + 1);
      const first = next.find(c => c.id === firstId)!;
      const second = next.find(c => c.id === id)!;

      if (first.face === second.face) {
        const matched = next.map(c => (c.id === firstId || c.id === id) ? { ...c, matched: true } : c);
        playSuccess();
        haptic.medium();
        if (matched.every(c => c.matched)) {
          setWon(true);
          setConfetti(true);
          haptic.win();
          playWin();
          setTimeout(() => setConfetti(false), 2100);
          setMoves(m => {
            const finalMoves = m; // already incremented above in this batch
            if (finalMoves < storage.memory.getBestMoves()) { storage.memory.setBestMoves(finalMoves); setBest(finalMoves); }
            return m;
          });
        }
        return matched;
      }

      // no match — flip both back after delay
      setLocked(true);
      setTimeout(() => {
        setCards(cur => cur.map(c => (c.id === firstId || c.id === id) ? { ...c, flipped: false } : c));
        setLocked(false);
      }, 800);
      return next;
    });
  };

  return (
    <>
      <ConfettiOverlay active={confetti} />
      <div className="min-h-dvh flex flex-col" style={{ background: 'radial-gradient(ellipse at center top, #fb718511 0%, transparent 60%)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#2e2e2e' }}>
          <Link href="/" className="text-2xl">←</Link>
          <span className="font-bold text-white text-lg">Memory Match</span>
          <span className="text-sm" style={{ color: '#888' }}>Best: {best === Infinity ? '—' : best}</span>
        </div>

        <div className="text-center py-3 text-sm" style={{ color: '#888' }}>
          Moves: <span style={{ color: ACCENT, fontWeight: 700 }}>{moves}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="grid grid-cols-4 gap-2" style={{ width: '100%', maxWidth: 340 }}>
            {cards.map(card => {
              const show = card.flipped || card.matched;
              return (
                <button key={card.id} onClick={() => flip(card.id)}
                  className="aspect-square rounded-xl flex items-center justify-center"
                  style={{
                    background: show ? (card.matched ? ACCENT + '33' : '#1f1f1f') : ACCENT,
                    border: `2px solid ${card.matched ? ACCENT : '#2e2e2e'}`,
                    fontSize: 30,
                    opacity: card.matched ? 0.7 : 1,
                    touchAction: 'manipulation',
                    transition: 'background 0.2s',
                  }}>
                  {show ? card.face : ''}
                </button>
              );
            })}
          </div>
          <button onClick={reset} className="mt-8 px-6 py-3 rounded-xl font-bold"
            style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #2e2e2e', minHeight: 48 }}>
            Shuffle & Restart
          </button>
        </div>

        {won && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4 w-72" style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}>
              <h2 className="text-2xl font-bold text-white">Matched! 🎴</h2>
              <p className="text-sm" style={{ color: '#888' }}>Cleared in {moves} moves</p>
              <button onClick={reset} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: ACCENT, minHeight: 48 }}>
                Play Again
              </button>
              <Link href="/" className="text-sm" style={{ color: '#888' }}>Home</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
