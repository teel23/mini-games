'use client';

import { useState, useCallback } from 'react';
import { storage } from '@/lib/storage';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Color = 'red' | 'black';

export interface Card {
  suit: Suit;
  rank: number; // 1=A, 11=J, 12=Q, 13=K
  faceUp: boolean;
  id: string;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_COLOR: Record<Suit, Color> = {
  hearts: 'red', diamonds: 'red', clubs: 'black', spades: 'black',
};
const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};

export function cardLabel(card: Card): string {
  const rankLabels: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  return (rankLabels[card.rank] ?? String(card.rank)) + SUIT_SYMBOL[card.suit];
}

export function suitSymbol(suit: Suit): string { return SUIT_SYMBOL[suit]; }
export function cardColor(card: Card): Color { return SUIT_COLOR[card.suit]; }

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, faceUp: false, id: `${suit}-${rank}` });
    }
  }
  return deck;
}

function shuffle(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function deal(deck: Card[]): { tableau: Card[][]; stock: Card[]; waste: Card[]; foundations: Card[][] } {
  const tableau: Card[][] = [];
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    const pile: Card[] = [];
    for (let row = 0; row <= col; row++) {
      pile.push({ ...deck[idx], faceUp: row === col });
      idx++;
    }
    tableau.push(pile);
  }
  const stock = deck.slice(idx).map(c => ({ ...c, faceUp: false }));
  return { tableau, stock, waste: [], foundations: [[], [], [], []] };
}

function canAddToTableau(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return card.rank === 13; // K on empty
  const top = pile[pile.length - 1];
  return top.faceUp && cardColor(card) !== cardColor(top) && card.rank === top.rank - 1;
}

function canAddToFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1; // A
  const top = foundation[foundation.length - 1];
  return card.suit === top.suit && card.rank === top.rank + 1;
}

export type DrawMode = 1 | 3;

export interface GameState {
  tableau: Card[][];
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  moves: number;
  elapsed: number;
  won: boolean;
}

export function useSolitaire(drawMode: DrawMode = 1) {
  const [state, setState] = useState<GameState>(() => {
    const deck = shuffle(createDeck());
    const { tableau, stock, waste, foundations } = deal(deck);
    return { tableau, stock, waste, foundations, moves: 0, elapsed: 0, won: false };
  });
  const [selected, setSelected] = useState<{ source: 'tableau' | 'waste'; col?: number; cardIdx?: number } | null>(null);
  const [paused, setPaused] = useState(false);
  const [bestTime, setBestTime] = useState(() => storage.solitaire.getBestTime());
  const [gamesWon, setGamesWon] = useState(() => storage.solitaire.getGamesWon());
  const startTime = useCallback(() => Date.now(), []);
  const startRef = { current: Date.now() };

  const drawFromStock = useCallback(() => {
    setState(prev => {
      if (prev.won) return prev;
      if (prev.stock.length === 0) {
        // Reset: flip waste back to stock
        return {
          ...prev,
          stock: prev.waste.map(c => ({ ...c, faceUp: false })).reverse(),
          waste: [],
          moves: prev.moves + 1,
        };
      }
      const drawn = prev.stock.slice(-drawMode).map(c => ({ ...c, faceUp: true }));
      return {
        ...prev,
        stock: prev.stock.slice(0, -drawMode),
        waste: [...prev.waste, ...drawn],
        moves: prev.moves + 1,
      };
    });
    setSelected(null);
  }, [drawMode]);

  const selectWaste = useCallback(() => {
    setState(prev => {
      if (prev.waste.length === 0) return prev;
      return prev;
    });
    setSelected(s => s?.source === 'waste' ? null : { source: 'waste' });
  }, []);

  const selectTableauCard = useCallback((col: number, cardIdx: number) => {
    setState(prev => {
      if (!prev.tableau[col][cardIdx]?.faceUp) {
        // Flip top face-down card
        if (cardIdx === prev.tableau[col].length - 1 && !prev.tableau[col][cardIdx].faceUp) {
          const next = { ...prev, tableau: prev.tableau.map((p, i) => i === col ? [...p] : p) };
          next.tableau[col][cardIdx] = { ...next.tableau[col][cardIdx], faceUp: true };
          return { ...next, moves: prev.moves + 1 };
        }
        return prev;
      }
      return prev;
    });
    setSelected(s => {
      if (s?.source === 'tableau' && s.col === col && s.cardIdx === cardIdx) return null;
      return { source: 'tableau', col, cardIdx };
    });
  }, []);

  const moveToFoundation = useCallback((foundIdx: number) => {
    setState(prev => {
      let card: Card | null = null;
      let sourceType: 'waste' | 'tableau' | null = null;
      let sourceCol = -1;

      if (selected?.source === 'waste' && prev.waste.length > 0) {
        card = prev.waste[prev.waste.length - 1];
        sourceType = 'waste';
      } else if (selected?.source === 'tableau' && selected.col !== undefined && selected.cardIdx !== undefined) {
        const pile = prev.tableau[selected.col];
        if (selected.cardIdx === pile.length - 1) {
          card = pile[pile.length - 1];
          sourceType = 'tableau';
          sourceCol = selected.col;
        }
      }

      if (!card || !sourceType) return prev;
      if (!canAddToFoundation(card, prev.foundations[foundIdx])) return prev;

      const next = {
        ...prev,
        foundations: prev.foundations.map((f, i) => i === foundIdx ? [...f, { ...card!, faceUp: true }] : f),
        moves: prev.moves + 1,
      };

      if (sourceType === 'waste') {
        next.waste = prev.waste.slice(0, -1);
      } else {
        next.tableau = prev.tableau.map((p, i) => {
          if (i !== sourceCol) return p;
          const np = p.slice(0, -1);
          if (np.length > 0 && !np[np.length - 1].faceUp) np[np.length - 1] = { ...np[np.length - 1], faceUp: true };
          return np;
        });
      }

      // Check win
      const won = next.foundations.every(f => f.length === 13);
      if (won) {
        next.won = true;
        const time = Math.floor((Date.now() - startRef.current) / 1000);
        const b = storage.solitaire.getBestTime();
        if (time < b) { storage.solitaire.setBestTime(time); setBestTime(time); }
        const w = storage.solitaire.getGamesWon() + 1;
        storage.solitaire.setGamesWon(w);
        setGamesWon(w);
      }

      return next;
    });
    setSelected(null);
  }, [selected, startRef]);

  const moveToTableau = useCallback((toCol: number) => {
    setState(prev => {
      if (!selected) return prev;

      let cards: Card[] = [];
      let sourceType: 'waste' | 'tableau' = selected.source;
      let sourceCol = selected.col ?? -1;

      if (sourceType === 'waste') {
        if (prev.waste.length === 0) return prev;
        cards = [prev.waste[prev.waste.length - 1]];
      } else if (sourceCol >= 0 && selected.cardIdx !== undefined) {
        cards = prev.tableau[sourceCol].slice(selected.cardIdx);
        if (cards.some(c => !c.faceUp)) return prev;
      }

      if (cards.length === 0) return prev;
      if (!canAddToTableau(cards[0], prev.tableau[toCol])) return prev;

      const next = {
        ...prev,
        tableau: prev.tableau.map((p, i) => {
          if (i === toCol) return [...p, ...cards.map(c => ({ ...c, faceUp: true }))];
          if (sourceType === 'tableau' && i === sourceCol) {
            const np = p.slice(0, selected.cardIdx);
            if (np.length > 0 && !np[np.length - 1].faceUp) np[np.length - 1] = { ...np[np.length - 1], faceUp: true };
            return np;
          }
          return p;
        }),
        moves: prev.moves + 1,
      };

      if (sourceType === 'waste') {
        next.waste = prev.waste.slice(0, -1);
      }

      return next;
    });
    setSelected(null);
  }, [selected]);

  // Auto-move top card to foundation
  const autoMoveToFoundation = useCallback(() => {
    setState(prev => {
      const next = { ...prev, tableau: prev.tableau.map(p => [...p]), foundations: prev.foundations.map(f => [...f]) };
      let moved = true;
      while (moved) {
        moved = false;
        // Check waste
        if (next.waste.length > 0) {
          const card = next.waste[next.waste.length - 1];
          for (let fi = 0; fi < 4; fi++) {
            if (canAddToFoundation(card, next.foundations[fi])) {
              next.foundations[fi] = [...next.foundations[fi], card];
              next.waste = next.waste.slice(0, -1);
              moved = true;
              break;
            }
          }
        }
        // Check tableau tops
        for (let col = 0; col < 7; col++) {
          const pile = next.tableau[col];
          if (pile.length === 0) continue;
          const card = pile[pile.length - 1];
          if (!card.faceUp) continue;
          for (let fi = 0; fi < 4; fi++) {
            if (canAddToFoundation(card, next.foundations[fi])) {
              next.foundations[fi] = [...next.foundations[fi], card];
              next.tableau[col] = pile.slice(0, -1);
              if (next.tableau[col].length > 0 && !next.tableau[col][next.tableau[col].length - 1].faceUp) {
                next.tableau[col][next.tableau[col].length - 1] = { ...next.tableau[col][next.tableau[col].length - 1], faceUp: true };
              }
              moved = true;
              break;
            }
          }
        }
      }
      next.moves = prev.moves + 1;
      const won = next.foundations.every(f => f.length === 13);
      if (won) next.won = true;
      return next;
    });
  }, []);

  const restart = useCallback(() => {
    const deck = shuffle(createDeck());
    const { tableau, stock, waste, foundations } = deal(deck);
    setState({ tableau, stock, waste, foundations, moves: 0, elapsed: 0, won: false });
    setSelected(null);
    setPaused(false);
  }, []);

  return {
    state,
    selected,
    paused,
    bestTime,
    gamesWon,
    setPaused,
    drawFromStock,
    selectWaste,
    selectTableauCard,
    moveToFoundation,
    moveToTableau,
    autoMoveToFoundation,
    restart,
    cardLabel,
    suitSymbol,
    cardColor,
  };
}
