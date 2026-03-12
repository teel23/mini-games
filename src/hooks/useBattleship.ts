'use client';

import { useState, useCallback, useEffect } from 'react';

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

export function useBattleship() {
  const [mode, setMode] = useState<BSMode | null>(null);
  const [difficulty, setDifficulty] = useState<BSDifficulty>('medium');
  const [boardSize, setBoardSize] = useState<BSSize>('medium');
  const [phase, setPhase] = useState<Phase>('setup');
  const [started, setStarted] = useState(false);

  // Player boards
  const [playerBoard, setPlayerBoard] = useState<BoardState>({ grid: [], ships: [] });
  const [opponentBoard, setOpponentBoard] = useState<BoardState>({ grid: [], ships: [] });
  // What the player can see of opponent's board
  const [opponentView, setOpponentView] = useState<CellState[][]>([]);
  // What opponent can see of player's board
  const [playerView, setPlayerView] = useState<CellState[][]>([]);

  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  // PVP: track which player is placing and if we need to hide
  const [pvpPhase, setPvpPhase] = useState<'p1setup' | 'p2setup' | 'p1pass' | 'p2pass' | 'battle' | null>(null);
  const [p2Board, setP2Board] = useState<BoardState>({ grid: [], ships: [] });

  // Setup: placement state
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
    setAiThinking(false);
    setAiHits([]);
    setAiFired(new Set());
    const sz = SIZE_MAP[s];
    setSetupGrid(emptyGrid(sz));
    setSetupShips([]);
    setPlacingShipIdx(0);
    setHorizontal(true);
    if (m === 'pvp') {
      setPvpPhase('p1setup');
    } else {
      setPvpPhase(null);
    }
  }, []);

  const placeShipAtSetup = useCallback((row: number, col: number) => {
    const sl = shipLengths[placingShipIdx];
    if (!sl) return;
    if (!canPlaceShip(setupGrid, row, col, sl, horizontal, size)) return;
    const result = placeShipOnGrid(setupGrid, row, col, sl, horizontal);
    setSetupGrid(result.grid);
    setSetupShips(prev => [...prev, result.ship]);
    const nextIdx = placingShipIdx + 1;
    setPlacingShipIdx(nextIdx);

    if (nextIdx >= shipLengths.length) {
      // All ships placed
      const board: BoardState = { grid: result.grid, ships: [...setupShips, result.ship] };

      if (mode === 'ai') {
        setPlayerBoard(board);
        const aiBoard = randomPlacement(size, shipLengths);
        setOpponentBoard(aiBoard);
        setOpponentView(emptyGrid(size));
        setPlayerView(emptyGrid(size));
        setPhase('battle');
        setCurrentTurn(1);
      } else if (pvpPhase === 'p1setup') {
        setPlayerBoard(board);
        setPvpPhase('p2pass');
        setSetupGrid(emptyGrid(size));
        setSetupShips([]);
        setPlacingShipIdx(0);
      } else if (pvpPhase === 'p2setup') {
        setP2Board(board);
        setOpponentBoard(board);
        setOpponentView(emptyGrid(size));
        setPlayerView(emptyGrid(size));
        setPhase('battle');
        setCurrentTurn(1);
        setPvpPhase('battle');
      }
    }
  }, [shipLengths, placingShipIdx, horizontal, size, setupGrid, setupShips, mode, pvpPhase]);

  const randomSetup = useCallback(() => {
    const board = randomPlacement(size, shipLengths);
    setSetupGrid(board.grid);
    setSetupShips(board.ships);
    setPlacingShipIdx(shipLengths.length);

    if (mode === 'ai') {
      setPlayerBoard(board);
      const aiBoard = randomPlacement(size, shipLengths);
      setOpponentBoard(aiBoard);
      setOpponentView(emptyGrid(size));
      setPlayerView(emptyGrid(size));
      setPhase('battle');
      setCurrentTurn(1);
    } else if (pvpPhase === 'p1setup') {
      setPlayerBoard(board);
      setPvpPhase('p2pass');
      setSetupGrid(emptyGrid(size));
      setSetupShips([]);
      setPlacingShipIdx(0);
    } else if (pvpPhase === 'p2setup') {
      setP2Board(board);
      setOpponentBoard(board);
      setOpponentView(emptyGrid(size));
      setPlayerView(emptyGrid(size));
      setPhase('battle');
      setCurrentTurn(1);
      setPvpPhase('battle');
    }
  }, [size, shipLengths, mode, pvpPhase]);

  const fireAt = useCallback((row: number, col: number) => {
    if (phase !== 'battle' || winner || aiThinking) return;

    // Player 1 fires at opponent
    if (currentTurn === 1) {
      if (opponentView[row][col] !== 'empty') return; // already fired here
      const newView = opponentView.map(r => [...r]);
      const oppGrid = opponentBoard.grid;
      if (oppGrid[row][col] === 'ship') {
        newView[row][col] = 'hit';
        // Check if any ship is sunk
        const newOppBoard = { ...opponentBoard, grid: opponentBoard.grid.map(r => [...r]) };
        newOppBoard.grid[row][col] = 'hit';
        for (const ship of newOppBoard.ships) {
          if (!ship.sunk && checkSunk(ship, newOppBoard.grid)) {
            ship.sunk = true;
            for (const [sr, sc] of ship.cells) {
              newView[sr][sc] = 'sunk';
            }
          }
        }
        setOpponentBoard(newOppBoard);
        setOpponentView(newView);
        // Check win
        if (newOppBoard.ships.every(s => s.sunk)) {
          setWinner(1);
          setPhase('gameover');
          return;
        }
      } else {
        newView[row][col] = 'miss';
        setOpponentView(newView);
      }
      setCurrentTurn(2);
    }
  }, [phase, winner, aiThinking, currentTurn, opponentView, opponentBoard]);

  // AI firing
  useEffect(() => {
    if (mode !== 'ai' || currentTurn !== 2 || phase !== 'battle' || winner || aiThinking) return;
    setAiThinking(true);

    const timer = setTimeout(() => {
      let r: number, c: number;
      const newFired = new Set(aiFired);

      if (difficulty === 'easy') {
        // Random
        do {
          r = Math.floor(Math.random() * size);
          c = Math.floor(Math.random() * size);
        } while (newFired.has(`${r}-${c}`));
      } else {
        // Hunt/target
        if (aiHits.length > 0) {
          // Target adjacent to hits
          const candidates: [number, number][] = [];
          for (const [hr, hc] of aiHits) {
            for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
              const nr = hr + dr, nc = hc + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && !newFired.has(`${nr}-${nc}`)) {
                candidates.push([nr, nc]);
              }
            }
          }
          if (candidates.length > 0) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            r = pick[0]; c = pick[1];
          } else {
            do {
              r = Math.floor(Math.random() * size);
              c = Math.floor(Math.random() * size);
            } while (newFired.has(`${r}-${c}`));
          }
        } else {
          // Random with checkerboard pattern for hard
          if (difficulty === 'hard') {
            const candidates: [number, number][] = [];
            for (let i = 0; i < size; i++)
              for (let j = 0; j < size; j++)
                if ((i + j) % 2 === 0 && !newFired.has(`${i}-${j}`))
                  candidates.push([i, j]);
            if (candidates.length > 0) {
              const pick = candidates[Math.floor(Math.random() * candidates.length)];
              r = pick[0]; c = pick[1];
            } else {
              do {
                r = Math.floor(Math.random() * size);
                c = Math.floor(Math.random() * size);
              } while (newFired.has(`${r}-${c}`));
            }
          } else {
            do {
              r = Math.floor(Math.random() * size);
              c = Math.floor(Math.random() * size);
            } while (newFired.has(`${r}-${c}`));
          }
        }
      }

      newFired.add(`${r}-${c}`);
      setAiFired(newFired);

      const newPView = playerView.map(row => [...row]);
      const newPlayerBoard = { ...playerBoard, grid: playerBoard.grid.map(row => [...row]), ships: playerBoard.ships.map(s => ({ ...s })) };

      if (newPlayerBoard.grid[r][c] === 'ship') {
        newPView[r][c] = 'hit';
        newPlayerBoard.grid[r][c] = 'hit';
        setAiHits(prev => [...prev, [r, c]]);
        for (const ship of newPlayerBoard.ships) {
          if (!ship.sunk && checkSunk(ship, newPlayerBoard.grid)) {
            ship.sunk = true;
            for (const [sr, sc] of ship.cells) {
              newPView[sr][sc] = 'sunk';
            }
            // Remove sunk ship hits from aiHits
            setAiHits(prev => prev.filter(([hr, hc]) => !ship.cells.some(([sr, sc]) => sr === hr && sc === hc)));
          }
        }
        setPlayerBoard(newPlayerBoard);
        setPlayerView(newPView);
        if (newPlayerBoard.ships.every(s => s.sunk)) {
          setWinner(2);
          setPhase('gameover');
          setAiThinking(false);
          return;
        }
      } else {
        newPView[r][c] = 'miss';
        setPlayerView(newPView);
      }

      setCurrentTurn(1);
      setAiThinking(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [mode, currentTurn, phase, winner, aiThinking, difficulty, size, aiFired, aiHits, playerBoard, playerView]);

  const restart = useCallback(() => {
    if (mode) init(mode, difficulty, boardSize);
  }, [mode, difficulty, boardSize, init]);

  return {
    mode, difficulty, boardSize, phase, started, currentTurn, winner, aiThinking,
    playerBoard, opponentBoard, opponentView, playerView,
    setupGrid, setupShips, placingShipIdx, horizontal, shipLengths, size,
    pvpPhase,
    init, placeShipAtSetup, randomSetup, fireAt, restart, setStarted,
    toggleHorizontal: () => setHorizontal(h => !h),
    confirmP2Pass: () => setPvpPhase('p2setup'),
  };
}
