'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { storage } from '@/lib/storage';

export type BSMode = 'ai' | 'pvp';
export type BSDifficulty = 'easy' | 'medium' | 'hard';
export type BSSize = 'small' | 'medium' | 'large';

const SIZE_MAP = { small: 6, medium: 8, large: 10 };
const SHIPS_MAP: Record<BSSize, number[]> = {
  small: [3, 2, 2],
  medium: [4, 3, 2, 2],
  large: [5, 4, 3, 2, 2],
};

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';
export type Phase = 'setup' | 'battle' | 'gameover';
// pvp sub-phases: setup passing + per-turn device passing
export type PvpPhase = 'p1setup' | 'p2pass' | 'p2setup' | 'battle' | 'pass1' | 'pass2' | null;

export interface Ship {
  cells: [number, number][];
  sunk: boolean;
}

export interface BoardState {
  grid: CellState[][];
  ships: Ship[];
}

function emptyGrid(size: number): CellState[][] {
  return Array.from({ length: size }, () => Array(size).fill('empty'));
}

function canPlaceShip(grid: CellState[][], row: number, col: number, length: number, horizontal: boolean, size: number): boolean {
  for (let i = 0; i < length; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (r >= size || c >= size || grid[r][c] !== 'empty') return false;
  }
  return true;
}

function placeShipOnGrid(grid: CellState[][], row: number, col: number, length: number, horizontal: boolean): { grid: CellState[][]; ship: Ship } {
  const newGrid = grid.map(r => [...r]);
  const cells: [number, number][] = [];
  for (let i = 0; i < length; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    newGrid[r][c] = 'ship';
    cells.push([r, c]);
  }
  return { grid: newGrid, ship: { cells, sunk: false } };
}

function randomPlacement(size: number, shipLengths: number[]): BoardState {
  let grid = emptyGrid(size);
  const ships: Ship[] = [];
  for (const len of shipLengths) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 1000) {
      const horizontal = Math.random() < 0.5;
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      if (canPlaceShip(grid, r, c, len, horizontal, size)) {
        const result = placeShipOnGrid(grid, r, c, len, horizontal);
        grid = result.grid;
        ships.push(result.ship);
        placed = true;
      }
      attempts++;
    }
  }
  return { grid, ships };
}

function checkSunk(ship: Ship, grid: CellState[][]): boolean {
  return ship.cells.every(([r, c]) => grid[r][c] === 'hit' || grid[r][c] === 'sunk');
}

// Apply a shot at (row,col) against defenderBoard, updating both the defender
// board and the attacker's view. Returns new board + view + whether all ships sunk.
function applyShot(defenderBoard: BoardState, attackerView: CellState[][], row: number, col: number) {
  const newView = attackerView.map(r => [...r]);
  const newBoard: BoardState = { grid: defenderBoard.grid.map(r => [...r]), ships: defenderBoard.ships.map(s => ({ ...s })) };
  let hit = false;
  if (newBoard.grid[row][col] === 'ship') {
    hit = true;
    newView[row][col] = 'hit';
    newBoard.grid[row][col] = 'hit';
    for (const ship of newBoard.ships) {
      if (!ship.sunk && checkSunk(ship, newBoard.grid)) {
        ship.sunk = true;
        for (const [sr, sc] of ship.cells) newView[sr][sc] = 'sunk';
      }
    }
  } else {
    newView[row][col] = 'miss';
  }
  const allSunk = newBoard.ships.length > 0 && newBoard.ships.every(s => s.sunk);
  return { newBoard, newView, hit, allSunk };
}

export function useBattleship() {
  const [mode, setMode] = useState<BSMode | null>(null);
  const [difficulty, setDifficulty] = useState<BSDifficulty>('medium');
  const [boardSize, setBoardSize] = useState<BSSize>('medium');
  const [phase, setPhase] = useState<Phase>('setup');
  const [started, setStarted] = useState(false);

  // Two fleets: board1 = Player 1, board2 = Player 2 / AI
  const [board1, setBoard1] = useState<BoardState>({ grid: [], ships: [] });
  const [board2, setBoard2] = useState<BoardState>({ grid: [], ships: [] });
  // view1 = P1's shots on board2; view2 = P2/AI's shots on board1
  const [view1, setView1] = useState<CellState[][]>([]);
  const [view2, setView2] = useState<CellState[][]>([]);

  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [pvpPhase, setPvpPhase] = useState<PvpPhase>(null);
  const winRecorded = useRef(false);

  // Setup placement state
  const [placingShipIdx, setPlacingShipIdx] = useState(0);
  const [horizontal, setHorizontal] = useState(true);
  const [setupGrid, setSetupGrid] = useState<CellState[][]>([]);
  const [setupShips, setSetupShips] = useState<Ship[]>([]);

  // AI hunt mode
  const [aiHits, setAiHits] = useState<[number, number][]>([]);
  const [aiFired, setAiFired] = useState<Set<string>>(new Set());

  const size = SIZE_MAP[boardSize];
  const shipLengths = SHIPS_MAP[boardSize];

  const init = useCallback((m: BSMode, d: BSDifficulty, s: BSSize) => {
    setMode(m);
    setDifficulty(d);
    setBoardSize(s);
    setStarted(true);
    setPhase('setup');
    setWinner(null);
    winRecorded.current = false;
    setAiThinking(false);
    setAiHits([]);
    setAiFired(new Set());
    const sz = SIZE_MAP[s];
    setSetupGrid(emptyGrid(sz));
    setSetupShips([]);
    setPlacingShipIdx(0);
    setHorizontal(true);
    setCurrentTurn(1);
    setPvpPhase(m === 'pvp' ? 'p1setup' : null);
  }, []);

  // Finish placing a fleet (from either tap-placement or random) and advance.
  const commitFleet = useCallback((board: BoardState, m: BSMode, phaseNow: PvpPhase, sz: number, lengths: number[]) => {
    if (m === 'ai') {
      setBoard1(board);
      setBoard2(randomPlacement(sz, lengths));
      setView1(emptyGrid(sz));
      setView2(emptyGrid(sz));
      setPhase('battle');
      setCurrentTurn(1);
    } else if (phaseNow === 'p1setup') {
      setBoard1(board);
      setPvpPhase('p2pass');
      setSetupGrid(emptyGrid(sz));
      setSetupShips([]);
      setPlacingShipIdx(0);
    } else if (phaseNow === 'p2setup') {
      setBoard2(board);
      setView1(emptyGrid(sz));
      setView2(emptyGrid(sz));
      setPhase('battle');
      setCurrentTurn(1);
      setPvpPhase('battle');
    }
  }, []);

  const placeShipAtSetup = useCallback((row: number, col: number) => {
    const sl = shipLengths[placingShipIdx];
    if (!sl) return;
    if (!canPlaceShip(setupGrid, row, col, sl, horizontal, size)) return;
    const result = placeShipOnGrid(setupGrid, row, col, sl, horizontal);
    setSetupGrid(result.grid);
    const nextShips = [...setupShips, result.ship];
    setSetupShips(nextShips);
    const nextIdx = placingShipIdx + 1;
    setPlacingShipIdx(nextIdx);
    if (nextIdx >= shipLengths.length) {
      commitFleet({ grid: result.grid, ships: nextShips }, mode!, pvpPhase, size, shipLengths);
    }
  }, [shipLengths, placingShipIdx, horizontal, size, setupGrid, setupShips, mode, pvpPhase, commitFleet]);

  const randomSetup = useCallback(() => {
    const board = randomPlacement(size, shipLengths);
    setSetupGrid(board.grid);
    setSetupShips(board.ships);
    setPlacingShipIdx(shipLengths.length);
    commitFleet(board, mode!, pvpPhase, size, shipLengths);
  }, [size, shipLengths, mode, pvpPhase, commitFleet]);

  const recordWinIfNeeded = useCallback((w: 1 | 2, m: BSMode | null) => {
    if (winRecorded.current) return;
    winRecorded.current = true;
    if (m === 'ai' && w === 1) {
      storage.battleship.setWins(storage.battleship.getWins() + 1);
    }
  }, []);

  // Human fire (P1 in AI mode; current human in PVP mode).
  const fireAt = useCallback((row: number, col: number) => {
    if (phase !== 'battle' || winner || aiThinking) return;
    if (mode === 'pvp' && pvpPhase !== 'battle') return; // waiting on a pass screen
    const attacker = currentTurn;
    const defenderBoard = attacker === 1 ? board2 : board1;
    const attackerView = attacker === 1 ? view1 : view2;
    if (!attackerView[row] || attackerView[row][col] !== 'empty') return;

    const { newBoard, newView, allSunk } = applyShot(defenderBoard, attackerView, row, col);
    if (attacker === 1) { setBoard2(newBoard); setView1(newView); }
    else { setBoard1(newBoard); setView2(newView); }

    if (allSunk) {
      setWinner(attacker);
      setPhase('gameover');
      recordWinIfNeeded(attacker, mode);
      return;
    }

    const next: 1 | 2 = attacker === 1 ? 2 : 1;
    setCurrentTurn(next);
    if (mode === 'pvp') {
      setPvpPhase(next === 1 ? 'pass1' : 'pass2');
    }
  }, [phase, winner, aiThinking, mode, pvpPhase, currentTurn, board1, board2, view1, view2, recordWinIfNeeded]);

  // Confirm a between-turn pass (PVP): reveal the next player's screen.
  const confirmPass = useCallback(() => {
    setPvpPhase('battle');
  }, []);

  // AI firing (AI is player 2, fires at board1 via view2)
  useEffect(() => {
    if (mode !== 'ai' || currentTurn !== 2 || phase !== 'battle' || winner || aiThinking) return;
    setAiThinking(true);

    const timer = setTimeout(() => {
      let r: number, c: number;
      const fired = aiFired;

      if (difficulty === 'easy') {
        do { r = Math.floor(Math.random() * size); c = Math.floor(Math.random() * size); }
        while (fired.has(`${r}-${c}`));
      } else {
        if (aiHits.length > 0) {
          const candidates: [number, number][] = [];
          if (difficulty === 'hard' && aiHits.length >= 2) {
            const hitRows = aiHits.map(h => h[0]);
            const hitCols = aiHits.map(h => h[1]);
            const sameRow = hitRows.every(hr => hr === hitRows[0]);
            const sameCol = hitCols.every(hc => hc === hitCols[0]);
            if (sameRow) {
              const hr = hitRows[0];
              const minC = Math.min(...hitCols), maxC = Math.max(...hitCols);
              if (minC > 0 && !fired.has(`${hr}-${minC - 1}`)) candidates.push([hr, minC - 1]);
              if (maxC < size - 1 && !fired.has(`${hr}-${maxC + 1}`)) candidates.push([hr, maxC + 1]);
            } else if (sameCol) {
              const hc = hitCols[0];
              const minR = Math.min(...hitRows), maxR = Math.max(...hitRows);
              if (minR > 0 && !fired.has(`${minR - 1}-${hc}`)) candidates.push([minR - 1, hc]);
              if (maxR < size - 1 && !fired.has(`${maxR + 1}-${hc}`)) candidates.push([maxR + 1, hc]);
            }
          }
          if (candidates.length === 0) {
            for (const [hr, hc] of aiHits) {
              for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const nr = hr + dr, nc = hc + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && !fired.has(`${nr}-${nc}`)) candidates.push([nr, nc]);
              }
            }
          }
          if (candidates.length > 0) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            r = pick[0]; c = pick[1];
          } else {
            do { r = Math.floor(Math.random() * size); c = Math.floor(Math.random() * size); }
            while (fired.has(`${r}-${c}`));
          }
        } else if (difficulty === 'hard') {
          const candidates: [number, number][] = [];
          for (let i = 0; i < size; i++)
            for (let j = 0; j < size; j++)
              if ((i + j) % 2 === 0 && !fired.has(`${i}-${j}`)) candidates.push([i, j]);
          if (candidates.length > 0) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            r = pick[0]; c = pick[1];
          } else {
            do { r = Math.floor(Math.random() * size); c = Math.floor(Math.random() * size); }
            while (fired.has(`${r}-${c}`));
          }
        } else {
          do { r = Math.floor(Math.random() * size); c = Math.floor(Math.random() * size); }
          while (fired.has(`${r}-${c}`));
        }
      }

      const newFired = new Set(fired);
      newFired.add(`${r}-${c}`);
      setAiFired(newFired);

      const { newBoard, newView, hit, allSunk } = applyShot(board1, view2, r, c);
      setBoard1(newBoard);
      setView2(newView);
      if (hit) {
        // recompute hit list, dropping cells belonging to fully-sunk ships
        setAiHits(prev => {
          const next = [...prev, [r, c] as [number, number]];
          return next.filter(([hr, hc]) =>
            !newBoard.ships.some(s => s.sunk && s.cells.some(([sr, sc]) => sr === hr && sc === hc))
          );
        });
      }

      if (allSunk) {
        setWinner(2);
        setPhase('gameover');
        recordWinIfNeeded(2, 'ai');
        setAiThinking(false);
        return;
      }
      setCurrentTurn(1);
      setAiThinking(false);
    }, 600);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentTurn, phase, winner, difficulty, size, aiFired, aiHits, board1, view2]);

  const restart = useCallback(() => {
    if (mode) init(mode, difficulty, boardSize);
  }, [mode, difficulty, boardSize, init]);

  // ---- Derived view for the page ----
  // Who is currently looking at the screen: AI mode → always P1; PVP → currentTurn.
  const viewer: 1 | 2 = mode === 'pvp' ? currentTurn : 1;
  const fireView = viewer === 1 ? view1 : view2;             // grid the viewer fires at
  const ownFleet = viewer === 1 ? board1 : board2;            // viewer's own ships
  const incoming = viewer === 1 ? view2 : view1;              // shots taken at the viewer
  const ownDisplay: CellState[][] = ownFleet.grid.map((row, r) =>
    row.map((cell, c) => {
      const inc = incoming[r]?.[c];
      return inc === 'hit' || inc === 'miss' || inc === 'sunk' ? inc : cell;
    })
  );
  const awaitingPass = mode === 'pvp' && (pvpPhase === 'pass1' || pvpPhase === 'pass2');
  const passTarget: 1 | 2 = pvpPhase === 'pass1' ? 1 : 2;

  return {
    mode, difficulty, boardSize, phase, started, currentTurn, viewer, winner, aiThinking,
    fireView, ownDisplay,
    setupGrid, setupShips, placingShipIdx, horizontal, shipLengths, size,
    pvpPhase, awaitingPass, passTarget,
    init, placeShipAtSetup, randomSetup, fireAt, restart, setStarted, confirmPass,
    toggleHorizontal: () => setHorizontal(h => !h),
    confirmP2Pass: () => setPvpPhase('p2setup'),
  };
}
