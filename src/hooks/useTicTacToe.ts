'use client';

import { useState, useCallback, useEffect } from 'react';
import { storage } from '@/lib/storage';

export type Player = 'X' | 'O';
export type Board = (Player | null)[];
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Mode = 'ai' | 'friend';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Board): { winner: Player; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Player, line };
    }
  }
  return null;
}

function isDraw(board: Board): boolean {
  return board.every(Boolean) && !checkWinner(board);
}

// Minimax algorithm
function minimax(board: Board, isMaximizing: boolean, alpha = -Infinity, beta = Infinity): number {
  const result = checkWinner(board);
  if (result) return result.winner === 'O' ? 10 : -10;
  if (isDraw(board)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

function getBestMove(board: Board): number {
  let bestVal = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const val = minimax(board, false);
      board[i] = null;
      if (val > bestVal) { bestVal = val; bestMove = i; }
    }
  }
  return bestMove;
}

function getRandomMove(board: Board): number {
  const empty = board.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)];
}

function getMediumMove(board: Board): number {
  return Math.random() < 0.5 ? getBestMove(board) : getRandomMove(board);
}

export function useTicTacToe(mode: Mode, difficulty: Difficulty) {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winResult, setWinResult] = useState<{ winner: Player; line: number[] } | null>(null);
  const [draw, setDraw] = useState(false);
  const [winsVsAI, setWinsVsAI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setWinsVsAI(storage.tictactoe.getWinsVsAI());
  }, []);

  const makeAIMove = useCallback((b: Board) => {
    let idx = -1;
    if (difficulty === 'easy') idx = getRandomMove(b);
    else if (difficulty === 'medium') idx = getMediumMove(b);
    else idx = getBestMove(b);

    if (idx < 0) return;
    const next = [...b];
    next[idx] = 'O';
    const result = checkWinner(next);
    setBoard(next);
    if (result) {
      setWinResult(result);
    } else if (isDraw(next)) {
      setDraw(true);
    } else {
      setCurrentPlayer('X');
    }
  }, [difficulty]);

  const handleClick = useCallback((idx: number) => {
    if (board[idx] || winResult || draw || paused) return;
    if (mode === 'ai' && currentPlayer === 'O') return;

    const next = [...board];
    next[idx] = currentPlayer;
    const result = checkWinner(next);
    setBoard(next);

    if (result) {
      setWinResult(result);
      if (mode === 'ai' && result.winner === 'X') {
        const newWins = winsVsAI + 1;
        setWinsVsAI(newWins);
        storage.tictactoe.setWinsVsAI(newWins);
      }
    } else if (isDraw(next)) {
      setDraw(true);
    } else {
      const nextPlayer: Player = currentPlayer === 'X' ? 'O' : 'X';
      setCurrentPlayer(nextPlayer);
      if (mode === 'ai' && nextPlayer === 'O') {
        setTimeout(() => makeAIMove(next), 300);
      }
    }
  }, [board, currentPlayer, winResult, draw, paused, mode, winsVsAI, makeAIMove]);

  const restart = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinResult(null);
    setDraw(false);
    setPaused(false);
  }, []);

  return {
    board,
    currentPlayer,
    winResult,
    draw,
    winsVsAI,
    paused,
    setPaused,
    handleClick,
    restart,
    WIN_LINES,
  };
}
