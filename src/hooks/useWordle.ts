'use client';

import { useState, useCallback, useEffect } from 'react';
import { DAILY_WORDS, VALID_GUESSES } from '@/lib/wordList';
import { getDayIndex, getTodayString, nextStreak } from '@/lib/dateUtils';
import { storage, getItem, setItem } from '@/lib/storage';

export type LetterState = 'correct' | 'present' | 'absent' | 'unknown';
export type GameMode = 'daily' | 'random';

export interface GuessResult {
  word: string;
  states: LetterState[];
}

interface DailySave {
  guesses: GuessResult[];
  gameOver: boolean;
  won: boolean;
}

function evaluateGuess(guess: string, target: string): LetterState[] {
  const result: LetterState[] = Array(5).fill('absent');
  const targetArr = target.split('');
  const guessArr = guess.split('');
  const used = Array(5).fill(false);

  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessArr[i] === targetArr[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

function buildLetterMap(guesses: GuessResult[]): Record<string, LetterState> {
  const map: Record<string, LetterState> = {};
  const priority: Record<LetterState, number> = { correct: 3, present: 2, absent: 1, unknown: 0 };
  for (const g of guesses) {
    g.states.forEach((s, i) => {
      const letter = g.word[i];
      if (!map[letter] || priority[s] > priority[map[letter]]) map[letter] = s;
    });
  }
  return map;
}

function getTargetWord(mode: GameMode): string {
  if (mode === 'daily') return DAILY_WORDS[getDayIndex(DAILY_WORDS.length)].toUpperCase();
  return DAILY_WORDS[Math.floor(Math.random() * DAILY_WORDS.length)].toUpperCase();
}

export function useWordle(mode: GameMode) {
  const [target, setTarget] = useState<string>(() => getTargetWord(mode));
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [error, setError] = useState('');
  const [letterMap, setLetterMap] = useState<Record<string, LetterState>>({});
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const dailyKey = `daily:${getTodayString()}`;

  // Load streak + restore any in-progress / finished daily for today.
  useEffect(() => {
    setStreak(storage.wordle.getDailyStreak());
    setBestStreak(storage.wordle.getBestStreak());

    if (mode === 'daily') {
      const saved = getItem<DailySave | null>('wordle', dailyKey, null);
      if (saved && saved.guesses) {
        setGuesses(saved.guesses);
        setGameOver(saved.gameOver);
        setWon(saved.won);
        setLetterMap(buildLetterMap(saved.guesses));
      }
    }
  }, [mode, dailyKey]);

  const finishDaily = useCallback((finalGuesses: GuessResult[], didWin: boolean) => {
    setItem<DailySave>('wordle', dailyKey, { guesses: finalGuesses, gameOver: true, won: didWin });
    const today = getTodayString();
    if (storage.wordle.getLastPlayedDate() === today) return; // already counted today
    storage.wordle.setGamesPlayed(storage.wordle.getGamesPlayed() + 1);
    if (didWin) {
      const ns = nextStreak(storage.wordle.getLastPlayedDate(), storage.wordle.getDailyStreak());
      const nb = Math.max(storage.wordle.getBestStreak(), ns);
      setStreak(ns); setBestStreak(nb);
      storage.wordle.setDailyStreak(ns);
      storage.wordle.setBestStreak(nb);
      storage.wordle.setWins(storage.wordle.getWins() + 1);
    } else {
      setStreak(0);
      storage.wordle.setDailyStreak(0);
    }
    storage.wordle.setLastPlayedDate(today);
    storage.wordle.setDailySolved(didWin);
  }, [dailyKey]);

  const addLetter = useCallback((letter: string) => {
    if (gameOver || currentInput.length >= 5) return;
    setCurrentInput(p => p + letter);
    setError('');
  }, [gameOver, currentInput]);

  const deleteLetter = useCallback(() => {
    setCurrentInput(p => p.slice(0, -1));
    setError('');
  }, []);

  const submitGuess = useCallback(() => {
    if (gameOver) return;
    if (currentInput.length !== 5) { setError('Not enough letters'); return; }

    const word = currentInput.toUpperCase();
    const isValid = VALID_GUESSES.has(word.toLowerCase()) || DAILY_WORDS.includes(word.toLowerCase());
    if (!isValid) { setError('Not in word list'); return; }

    const states = evaluateGuess(word, target);
    const newGuesses = [...guesses, { word, states }];
    setGuesses(newGuesses);
    setCurrentInput('');
    setLetterMap(buildLetterMap(newGuesses));

    if (states.every(s => s === 'correct')) {
      setWon(true);
      setGameOver(true);
      if (mode === 'daily') finishDaily(newGuesses, true);
    } else if (newGuesses.length >= 6) {
      setGameOver(true);
      if (mode === 'daily') finishDaily(newGuesses, false);
    } else if (mode === 'daily') {
      setItem<DailySave>('wordle', dailyKey, { guesses: newGuesses, gameOver: false, won: false });
    }
  }, [gameOver, currentInput, guesses, target, mode, finishDaily, dailyKey]);

  const restart = useCallback(() => {
    if (mode === 'daily') return; // Can't restart daily
    setTarget(getTargetWord('random'));
    setGuesses([]);
    setCurrentInput('');
    setGameOver(false);
    setWon(false);
    setError('');
    setLetterMap({});
  }, [mode]);

  const shareText = useCallback((): string => {
    const day = getDayIndex(DAILY_WORDS.length) + 1;
    const rows = guesses.map(g =>
      g.states.map(s => s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛').join('')
    ).join('\n');
    return `Wordle #${day} ${won ? guesses.length : 'X'}/6\n\n${rows}`;
  }, [guesses, won]);

  return {
    target, guesses, currentInput, gameOver, won, error,
    letterMap, streak, bestStreak,
    addLetter, deleteLetter, submitGuess, restart, shareText,
  };
}
