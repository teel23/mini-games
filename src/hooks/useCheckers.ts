'use client';

import { useState, useCallback, useEffect } from 'react';

export type CKMode = 'ai' | 'pvp';
export type CKDifficulty = 'easy' | 'medium' | 'hard';
export type Player = 1 | 2;
export type PieceType = 'normal' | 'king';

export interface Piece {
  player: Player;
  type: PieceType;
}

export type Board = (Piece | null)[];

export interface Move {
  from: number;
  to: number;
  captures: number[];
}

const SIZE = 8;
const TOTAL = SIZE * SIZE;

function toRC(idx: number): [number, number] { return [Math.floor(idx / SIZE), idx % SIZE]; }
function toIdx(r: number, c: number): number { return r * SIZE + c; }
function inBounds(r: number, c: number): boolean { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

function initBoard(): Board {
  const board: Board = Array(TOTAL).fill(null);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < SIZE; c++)
      if ((r + c) % 2 === 1)
        board[toIdx(r, c)] = { player: 2, type: 'normal' };
  for (let r = 5; r < 8; r++)
    for (let c = 0; c < SIZE; c++)
      if ((r + c) % 2 === 1)
        board[toIdx(r, c)] = { player: 1, type: 'normal' };
  return board;
}

function getJumps(board: Board, idx: number, piece: Piece): Move[] {
  const [r, c] = toRC(idx);
  const dirs: [number, number][] = piece.type === 'king'
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.player === 1
    ? [[-1, -1], [-1, 1]]
    : [[1, -1], [1, 1]];

  const jumps: Move[] = [];
  for (const [dr, dc] of dirs) {
    const mr = r + dr, mc = c + dc;
    const lr = r + dr * 2, lc = c + dc * 2;
    if (!inBounds(lr, lc)) continue;
    const mid = board[toIdx(mr, mc)];
    const land = board[toIdx(lr, lc)];
    if (mid && mid.player !== piece.player && !land) {
      jumps.push({ from: idx, to: toIdx(lr, lc), captures: [toIdx(mr, mc)] });
    }
  }
  return jumps;
}

function getSimpleMoves(board: Board, idx: number, piece: Piece): Move[] {
  const [r, c] = toRC(idx);
  const dirs: [number, number][] = piece.type === 'king'
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.player === 1
    ? [[-1, -1], [-1, 1]]
    : [[1, -1], [1, 1]];

  const moves: Move[] = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && !board[toIdx(nr, nc)]) {
      moves.push({ from: idx, to: toIdx(nr, nc), captures: [] });
    }
  }
  return moves;
}

function getMultiJumps(board: Board, idx: number, piece: Piece, captured: number[] = []): Move[] {
  const jumps = getJumps(board, idx, piece);
  if (jumps.length === 0) {
    if (captured.length > 0) return [{ from: captured.length > 0 ? -1 : idx, to: idx, captures: captured }];
    return [];
  }
  const result: Move[] = [];
  for (const j of jumps) {
    if (captured.includes(j.captures[0])) continue;
    const newBoard = [...board];
    newBoard[j.captures[0]] = null;
    newBoard[idx] = null;
    newBoard[j.to] = piece;
    const further = getMultiJumps(newBoard, j.to, piece, [...captured, j.captures[0]]);
    if (further.length === 0) {
      result.push({ from: idx, to: j.to, captures: [...captured, j.captures[0]] });
    } else {
      for (const f of further) {
        result.push({ from: idx, to: f.to, captures: f.captures });
      }
    }
  }
  return result;
}

function getAllMoves(board: Board, player: Player): Move[] {
  // Check for jumps first (forced capture)
  const allJumps: Move[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const piece = board[i];
    if (!piece || piece.player !== player) continue;
    const jumps = getMultiJumps(board, i, piece);
    for (const j of jumps) {
      allJumps.push({ ...j, from: i });
    }
  }
  if (allJumps.length > 0) return allJumps;

  // Simple moves
  const simpleMoves: Move[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const piece = board[i];
    if (!piece || piece.player !== player) continue;
    simpleMoves.push(...getSimpleMoves(board, i, piece));
  }
  return simpleMoves;
}

function applyMove(board: Board, move: Move): Board {
  const newBoard = [...board];
  const piece = { ...newBoard[move.from]! };
  newBoard[move.from] = null;
  for (const cap of move.captures) newBoard[cap] = null;
  // Promotion
  const [endR] = toRC(move.to);
  if (piece.player === 1 && endR === 0) piece.type = 'king';
  if (piece.player === 2 && endR === 7) piece.type = 'king';
  newBoard[move.to] = piece;
  return newBoard;
}

function evaluate(board: Board): number {
  let score = 0;
  for (let i = 0; i < TOTAL; i++) {
    const p = board[i];
    if (!p) continue;
    const [r, c] = toRC(i);
    const val = p.type === 'king' ? 5 : 3;
    // Positional bonus for center
    const centerBonus = (3.5 - Math.abs(3.5 - c)) * 0.1 + (3.5 - Math.abs(3.5 - r)) * 0.1;
    if (p.player === 2) score += val + centerBonus;
    else score -= val + centerBonus;
  }
  return score;
}

function minimax(board: Board, depth: number, isMax: boolean, alpha: number, beta: number): number {
  const player: Player = isMax ? 2 : 1;
  const moves = getAllMoves(board, player);
  if (depth === 0 || moves.length === 0) {
    if (moves.length === 0) return isMax ? -1000 : 1000;
    return evaluate(board);
  }

  if (isMax) {
    let best = -Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      best = Math.max(best, minimax(nb, depth - 1, false, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      best = Math.min(best, minimax(nb, depth - 1, true, alpha, beta));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getAIMove(board: Board, difficulty: CKDifficulty): Move | null {
  const moves = getAllMoves(board, 2);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = difficulty === 'hard' ? 4 : 3;
  let bestMove = moves[0];
  let bestVal = -Infinity;
  for (const m of moves) {
    const nb = applyMove(board, m);
    const val = minimax(nb, depth - 1, false, -Infinity, Infinity);
    if (val > bestVal) { bestVal = val; bestMove = m; }
  }
  return bestMove;
}

export function useCheckers() {
  const [mode, setMode] = useState<CKMode | null>(null);
  const [difficulty, setDifficulty] = useState<CKDifficulty>('medium');
  const [started, setStarted] = useState(false);
  const [board, setBoard] = useState<Board>(initBoard);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  const start = useCallback((m: CKMode, d: CKDifficulty) => {
    setMode(m);
    setDifficulty(d);
    setStarted(true);
    setBoard(initBoard());
    setCurrentPlayer(1);
    setSelected(null);
    setValidMoves([]);
    setGameOver(false);
    setWinner(null);
    setAiThinking(false);
  }, []);

  const selectPiece = useCallback((idx: number) => {
    if (gameOver || aiThinking) return;
    if (mode === 'ai' && currentPlayer === 2) return;
    const piece = board[idx];
    if (!piece || piece.player !== currentPlayer) {
      // Try to move to this square if we have a selected piece
      if (selected !== null) {
        const move = validMoves.find(m => m.to === idx);
        if (move) {
          const newBoard = applyMove(board, move);
          setBoard(newBoard);
          setSelected(null);
          setValidMoves([]);

          const nextPlayer: Player = currentPlayer === 1 ? 2 : 1;
          const nextMoves = getAllMoves(newBoard, nextPlayer);
          if (nextMoves.length === 0) {
            setGameOver(true);
            setWinner(currentPlayer);
          } else {
            setCurrentPlayer(nextPlayer);
          }
          return;
        }
      }
      setSelected(null);
      setValidMoves([]);
      return;
    }

    const allMoves = getAllMoves(board, currentPlayer);
    const pieceMoves = allMoves.filter(m => m.from === idx);
    if (pieceMoves.length === 0) {
      setSelected(null);
      setValidMoves([]);
      return;
    }
    setSelected(idx);
    setValidMoves(pieceMoves);
  }, [board, currentPlayer, gameOver, aiThinking, mode, selected, validMoves]);

  const handleCellClick = useCallback((idx: number) => {
    selectPiece(idx);
  }, [selectPiece]);

  // AI move
  useEffect(() => {
    if (mode !== 'ai' || currentPlayer !== 2 || gameOver || aiThinking) return;
    setAiThinking(true);
    const timer = setTimeout(() => {
      const move = getAIMove(board, difficulty);
      if (!move) {
        setGameOver(true);
        setWinner(1);
        setAiThinking(false);
        return;
      }
      const newBoard = applyMove(board, move);
      setBoard(newBoard);
      const nextMoves = getAllMoves(newBoard, 1);
      if (nextMoves.length === 0) {
        setGameOver(true);
        setWinner(2);
      } else {
        setCurrentPlayer(1);
      }
      setAiThinking(false);
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentPlayer, gameOver, board, difficulty]);

  const restart = useCallback(() => {
    if (mode) start(mode, difficulty);
  }, [mode, difficulty, start]);

  const validTargets = new Set(validMoves.map(m => m.to));

  return {
    mode, difficulty, started, board, currentPlayer, selected, validMoves, validTargets,
    gameOver, winner, aiThinking,
    start, handleCellClick, restart, setStarted,
  };
}
