'use client';

import { useState, useCallback, useEffect } from 'react';

export type ChessMode = 'ai' | 'pvp';
export type ChessDifficulty = 'easy' | 'medium' | 'hard';
export type Color = 'white' | 'black';
export type PieceKind = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';

export interface ChessPiece {
  color: Color;
  kind: PieceKind;
  moved?: boolean;
}

export type Board = (ChessPiece | null)[];
export interface ChessMove { from: number; to: number; promotion?: PieceKind; castle?: 'K' | 'Q'; enPassant?: number; }

const SIZE = 8;
function toRC(i: number): [number, number] { return [Math.floor(i / SIZE), i % SIZE]; }
function toIdx(r: number, c: number): number { return r * SIZE + c; }
function inB(r: number, c: number): boolean { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

const PIECE_SYMBOLS: Record<Color, Record<PieceKind, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};
export function pieceSymbol(p: ChessPiece): string { return PIECE_SYMBOLS[p.color][p.kind]; }

function initBoard(): Board {
  const board: Board = Array(64).fill(null);
  const backRow: PieceKind[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let c = 0; c < 8; c++) {
    board[toIdx(0, c)] = { color: 'black', kind: backRow[c] };
    board[toIdx(1, c)] = { color: 'black', kind: 'pawn' };
    board[toIdx(6, c)] = { color: 'white', kind: 'pawn' };
    board[toIdx(7, c)] = { color: 'white', kind: backRow[c] };
  }
  return board;
}

function pseudoLegalMoves(board: Board, color: Color, enPassantTarget: number | null): ChessMove[] {
  const moves: ChessMove[] = [];
  const opp: Color = color === 'white' ? 'black' : 'white';

  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.color !== color) continue;
    const [r, c] = toRC(i);

    if (p.kind === 'pawn') {
      const dir = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;
      const promoRow = color === 'white' ? 0 : 7;
      // Forward
      const fr = r + dir;
      if (inB(fr, c) && !board[toIdx(fr, c)]) {
        if (fr === promoRow) {
          for (const pk of ['queen', 'rook', 'bishop', 'knight'] as PieceKind[]) {
            moves.push({ from: i, to: toIdx(fr, c), promotion: pk });
          }
        } else {
          moves.push({ from: i, to: toIdx(fr, c) });
          // Double push
          if (r === startRow && !board[toIdx(r + dir * 2, c)]) {
            moves.push({ from: i, to: toIdx(r + dir * 2, c) });
          }
        }
      }
      // Captures
      for (const dc of [-1, 1]) {
        if (!inB(fr, c + dc)) continue;
        const target = board[toIdx(fr, c + dc)];
        if (target && target.color === opp) {
          if (fr === promoRow) {
            for (const pk of ['queen', 'rook', 'bishop', 'knight'] as PieceKind[]) {
              moves.push({ from: i, to: toIdx(fr, c + dc), promotion: pk });
            }
          } else {
            moves.push({ from: i, to: toIdx(fr, c + dc) });
          }
        }
        // En passant
        if (enPassantTarget !== null && toIdx(fr, c + dc) === enPassantTarget) {
          moves.push({ from: i, to: enPassantTarget, enPassant: toIdx(r, c + dc) });
        }
      }
    }

    if (p.kind === 'rook' || p.kind === 'queen') {
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        for (let d = 1; d < 8; d++) {
          const nr = r + dr * d, nc = c + dc * d;
          if (!inB(nr, nc)) break;
          const t = board[toIdx(nr, nc)];
          if (t) { if (t.color === opp) moves.push({ from: i, to: toIdx(nr, nc) }); break; }
          moves.push({ from: i, to: toIdx(nr, nc) });
        }
      }
    }

    if (p.kind === 'bishop' || p.kind === 'queen') {
      for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        for (let d = 1; d < 8; d++) {
          const nr = r + dr * d, nc = c + dc * d;
          if (!inB(nr, nc)) break;
          const t = board[toIdx(nr, nc)];
          if (t) { if (t.color === opp) moves.push({ from: i, to: toIdx(nr, nc) }); break; }
          moves.push({ from: i, to: toIdx(nr, nc) });
        }
      }
    }

    if (p.kind === 'knight') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = r + dr, nc = c + dc;
        if (!inB(nr, nc)) continue;
        const t = board[toIdx(nr, nc)];
        if (!t || t.color === opp) moves.push({ from: i, to: toIdx(nr, nc) });
      }
    }

    if (p.kind === 'king') {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nr = r + dr, nc = c + dc;
        if (!inB(nr, nc)) continue;
        const t = board[toIdx(nr, nc)];
        if (!t || t.color === opp) moves.push({ from: i, to: toIdx(nr, nc) });
      }

      // Castling
      if (!p.moved) {
        const row = color === 'white' ? 7 : 0;
        // Kingside
        const kRook = board[toIdx(row, 7)];
        if (kRook && kRook.kind === 'rook' && !kRook.moved
          && !board[toIdx(row, 5)] && !board[toIdx(row, 6)]) {
          moves.push({ from: i, to: toIdx(row, 6), castle: 'K' });
        }
        // Queenside
        const qRook = board[toIdx(row, 0)];
        if (qRook && qRook.kind === 'rook' && !qRook.moved
          && !board[toIdx(row, 1)] && !board[toIdx(row, 2)] && !board[toIdx(row, 3)]) {
          moves.push({ from: i, to: toIdx(row, 2), castle: 'Q' });
        }
      }
    }
  }

  return moves;
}

function isAttacked(board: Board, idx: number, byColor: Color): boolean {
  // Check if square idx is attacked by any piece of byColor
  const [r, c] = toRC(idx);
  // Knight attacks
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inB(nr, nc)) {
      const p = board[toIdx(nr, nc)];
      if (p && p.color === byColor && p.kind === 'knight') return true;
    }
  }
  // Pawn attacks
  const pawnDir = byColor === 'white' ? 1 : -1; // pawns attack FROM this direction
  for (const dc of [-1, 1]) {
    const pr = r + pawnDir, pc = c + dc;
    if (inB(pr, pc)) {
      const p = board[toIdx(pr, pc)];
      if (p && p.color === byColor && p.kind === 'pawn') return true;
    }
  }
  // King attacks
  for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inB(nr, nc)) {
      const p = board[toIdx(nr, nc)];
      if (p && p.color === byColor && p.kind === 'king') return true;
    }
  }
  // Rook/Queen (straights)
  for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    for (let d = 1; d < 8; d++) {
      const nr = r + dr * d, nc = c + dc * d;
      if (!inB(nr, nc)) break;
      const p = board[toIdx(nr, nc)];
      if (p) {
        if (p.color === byColor && (p.kind === 'rook' || p.kind === 'queen')) return true;
        break;
      }
    }
  }
  // Bishop/Queen (diags)
  for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    for (let d = 1; d < 8; d++) {
      const nr = r + dr * d, nc = c + dc * d;
      if (!inB(nr, nc)) break;
      const p = board[toIdx(nr, nc)];
      if (p) {
        if (p.color === byColor && (p.kind === 'bishop' || p.kind === 'queen')) return true;
        break;
      }
    }
  }
  return false;
}

function findKing(board: Board, color: Color): number {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.color === color && p.kind === 'king') return i;
  }
  return -1;
}

function applyMove(board: Board, move: ChessMove): Board {
  const nb = [...board];
  const piece = { ...nb[move.from]!, moved: true };

  // En passant capture
  if (move.enPassant !== undefined) {
    nb[move.enPassant] = null;
  }

  // Castle
  if (move.castle) {
    const row = toRC(move.from)[0];
    if (move.castle === 'K') {
      nb[toIdx(row, 7)] = null;
      nb[toIdx(row, 5)] = { ...nb[toIdx(row, 7)]!, color: piece.color, kind: 'rook', moved: true };
      // Fix: the rook was already nulled, set it fresh
      nb[toIdx(row, 5)] = { color: piece.color, kind: 'rook', moved: true };
    } else {
      nb[toIdx(row, 0)] = null;
      nb[toIdx(row, 3)] = { color: piece.color, kind: 'rook', moved: true };
    }
  }

  nb[move.from] = null;
  if (move.promotion) {
    nb[move.to] = { color: piece.color, kind: move.promotion, moved: true };
  } else {
    nb[move.to] = piece;
  }

  return nb;
}

function isInCheck(board: Board, color: Color): boolean {
  const kingIdx = findKing(board, color);
  if (kingIdx === -1) return false;
  const opp: Color = color === 'white' ? 'black' : 'white';
  return isAttacked(board, kingIdx, opp);
}

function legalMoves(board: Board, color: Color, enPassantTarget: number | null): ChessMove[] {
  const pseudo = pseudoLegalMoves(board, color, enPassantTarget);
  const opp: Color = color === 'white' ? 'black' : 'white';

  return pseudo.filter(m => {
    const nb = applyMove(board, m);
    // Must not leave own king in check
    if (isInCheck(nb, color)) return false;
    // Castling: king must not pass through check
    if (m.castle) {
      if (isInCheck(board, color)) return false; // can't castle out of check
      const row = toRC(m.from)[0];
      if (m.castle === 'K') {
        if (isAttacked(board, toIdx(row, 5), opp)) return false;
      } else {
        if (isAttacked(board, toIdx(row, 3), opp)) return false;
      }
    }
    return true;
  });
}

// Evaluation
const PIECE_VALUES: Record<PieceKind, number> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };

// Position tables (simplified)
const CENTER_BONUS = [
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0.1,0.2,0.2,0.1,0,0,
  0,0,0.2,0.3,0.3,0.2,0,0,
  0,0,0.2,0.3,0.3,0.2,0,0,
  0,0,0.1,0.2,0.2,0.1,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
];

function evaluate(board: Board): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const val = PIECE_VALUES[p.kind] + CENTER_BONUS[i];
    score += p.color === 'black' ? val : -val;
  }
  return score;
}

function minimaxChess(board: Board, depth: number, isMax: boolean, alpha: number, beta: number, enPassant: number | null, deadline: number): number {
  if (Date.now() > deadline) return evaluate(board);
  const color: Color = isMax ? 'black' : 'white';
  const moves = legalMoves(board, color, enPassant);

  if (moves.length === 0) {
    if (isInCheck(board, color)) return isMax ? -10000 : 10000;
    return 0; // stalemate
  }
  if (depth === 0) return evaluate(board);

  if (isMax) {
    let best = -Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      const ep = getEnPassantTarget(board, m);
      best = Math.max(best, minimaxChess(nb, depth - 1, false, alpha, beta, ep, deadline));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      const ep = getEnPassantTarget(board, m);
      best = Math.min(best, minimaxChess(nb, depth - 1, true, alpha, beta, ep, deadline));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getEnPassantTarget(board: Board, move: ChessMove): number | null {
  const piece = board[move.from];
  if (!piece || piece.kind !== 'pawn') return null;
  const [fr] = toRC(move.from);
  const [tr] = toRC(move.to);
  if (Math.abs(fr - tr) === 2) {
    return toIdx((fr + tr) / 2, toRC(move.to)[1]);
  }
  return null;
}

function getAIMove(board: Board, difficulty: ChessDifficulty, enPassant: number | null): ChessMove | null {
  const moves = legalMoves(board, 'black', enPassant);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    // Occasionally prefer captures so easy isn't pure random, but still very beatable
    const captures = moves.filter(m => board[m.to] !== null || m.enPassant !== undefined);
    if (captures.length > 0 && Math.random() < 0.4) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = difficulty === 'hard' ? 5 : 3;
  const deadline = Date.now() + 2000; // 2s max
  let bestMove = moves[0];
  let bestVal = -Infinity;
  for (const m of moves) {
    if (Date.now() > deadline) break;
    const nb = applyMove(board, m);
    const ep = getEnPassantTarget(board, m);
    const val = minimaxChess(nb, depth - 1, false, -Infinity, Infinity, ep, deadline);
    if (val > bestVal) { bestVal = val; bestMove = m; }
  }
  return bestMove;
}

export function useChess() {
  const [mode, setMode] = useState<ChessMode | null>(null);
  const [difficulty, setDifficulty] = useState<ChessDifficulty>('medium');
  const [started, setStarted] = useState(false);
  const [board, setBoard] = useState<Board>(initBoard);
  const [currentPlayer, setCurrentPlayer] = useState<Color>('white');
  const [selected, setSelected] = useState<number | null>(null);
  const [validMovesList, setValidMovesList] = useState<ChessMove[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<'checkmate' | 'stalemate' | null>(null);
  const [winner, setWinner] = useState<Color | null>(null);
  const [inCheck, setInCheck] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [enPassantTarget, setEnPassantTarget] = useState<number | null>(null);
  const [captured, setCaptured] = useState<{ white: ChessPiece[]; black: ChessPiece[] }>({ white: [], black: [] });

  const start = useCallback((m: ChessMode, d: ChessDifficulty) => {
    setMode(m);
    setDifficulty(d);
    setStarted(true);
    setBoard(initBoard());
    setCurrentPlayer('white');
    setSelected(null);
    setValidMovesList([]);
    setGameOver(false);
    setResult(null);
    setWinner(null);
    setInCheck(false);
    setAiThinking(false);
    setEnPassantTarget(null);
    setCaptured({ white: [], black: [] });
  }, []);

  const handleCellClick = useCallback((idx: number) => {
    if (gameOver || aiThinking) return;
    if (mode === 'ai' && currentPlayer === 'black') return;

    // Try to move to this square
    if (selected !== null) {
      const move = validMovesList.find(m => m.to === idx);
      if (move) {
        const capturedPiece = board[move.to];
        const epCapturedPiece = move.enPassant !== undefined ? board[move.enPassant] : null;
        const newBoard = applyMove(board, move);
        setBoard(newBoard);
        setSelected(null);
        setValidMovesList([]);

        // Track captures
        if (capturedPiece || epCapturedPiece) {
          setCaptured(prev => {
            const cap = capturedPiece || epCapturedPiece;
            if (!cap) return prev;
            return {
              ...prev,
              [cap.color]: [...prev[cap.color], cap],
            };
          });
        }

        const ep = getEnPassantTarget(board, move);
        setEnPassantTarget(ep);

        const nextColor: Color = currentPlayer === 'white' ? 'black' : 'white';
        const nextMoves = legalMoves(newBoard, nextColor, ep);
        const check = isInCheck(newBoard, nextColor);
        setInCheck(check);

        if (nextMoves.length === 0) {
          setGameOver(true);
          if (check) {
            setResult('checkmate');
            setWinner(currentPlayer);
          } else {
            setResult('stalemate');
          }
        } else {
          setCurrentPlayer(nextColor);
        }
        return;
      }
    }

    // Select a piece
    const piece = board[idx];
    if (piece && piece.color === currentPlayer) {
      const allMoves = legalMoves(board, currentPlayer, enPassantTarget);
      const pieceMoves = allMoves.filter(m => m.from === idx);
      setSelected(idx);
      setValidMovesList(pieceMoves);
    } else {
      setSelected(null);
      setValidMovesList([]);
    }
  }, [board, currentPlayer, gameOver, aiThinking, mode, selected, validMovesList, enPassantTarget]);

  // AI move
  useEffect(() => {
    if (mode !== 'ai' || currentPlayer !== 'black' || gameOver || aiThinking) return;
    setAiThinking(true);
    const timer = setTimeout(() => {
      const move = getAIMove(board, difficulty, enPassantTarget);
      if (!move) {
        setGameOver(true);
        if (isInCheck(board, 'black')) {
          setResult('checkmate');
          setWinner('white');
        } else {
          setResult('stalemate');
        }
        setAiThinking(false);
        return;
      }

      const capturedPiece = board[move.to];
      const epCapturedPiece = move.enPassant !== undefined ? board[move.enPassant] : null;
      const newBoard = applyMove(board, move);
      setBoard(newBoard);

      if (capturedPiece || epCapturedPiece) {
        setCaptured(prev => {
          const cap = capturedPiece || epCapturedPiece;
          if (!cap) return prev;
          return { ...prev, [cap.color]: [...prev[cap.color], cap] };
        });
      }

      const ep = getEnPassantTarget(board, move);
      setEnPassantTarget(ep);

      const nextMoves = legalMoves(newBoard, 'white', ep);
      const check = isInCheck(newBoard, 'white');
      setInCheck(check);

      if (nextMoves.length === 0) {
        setGameOver(true);
        if (check) { setResult('checkmate'); setWinner('black'); }
        else setResult('stalemate');
      } else {
        setCurrentPlayer('white');
      }
      setAiThinking(false);
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentPlayer, gameOver, board, difficulty, enPassantTarget]);

  const restart = useCallback(() => {
    if (mode) start(mode, difficulty);
  }, [mode, difficulty, start]);

  const validTargets = new Set(validMovesList.map(m => m.to));
  const kingIdx = findKing(board, currentPlayer);

  return {
    mode, difficulty, started, board, currentPlayer, selected, validTargets,
    gameOver, result, winner, inCheck, aiThinking, captured, kingIdx,
    start, handleCellClick, restart, setStarted, pieceSymbol,
  };
}
