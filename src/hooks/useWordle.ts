'use client';

import { useState, useCallback, useEffect } from 'react';
import { DAILY_WORDS, VALID_GUESSES } from '@/lib/wordList';
import { getDayIndex, getTodayString, isNewDay } from '@/lib/dateUtils';
import { storage } from '@/lib/storage';

export type LetterState = 'correct' | 'present' | 'absent' | 'unknown';
export type GameMode = 'daily' | 'random';

export interface GuessResult {
  word: string;
  states: LetterState[];
}

function evaluateGuess(guess: string, target: string): LetterState[] {
  const result: LetterState[] = Array(5).fill('absent');
  const targetArr = target.split('');
  const guessArr = guess.split('');
  const used = Array(5).fill(false);

  // First pass: correct positions
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Second pass: present but wrong position
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

function getTargetWord(mode: GameMode): string {
  if (mode === 'daily') {
    return DAILY_WORDS[getDayIndex(DAILY_WORDS.length)].toUpperCase();
  }
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

  // Load daily state
  useEffect(() => {
    setStreak(storage.wordle.getDailyStreak());
    setBestStreak(storage.wordle.getBestStreak());

    if (mode === 'daily') {
      const lastDate = storage.wordle.getLastPlayedDate();
      const today = getTodayString();
      if (lastDate === today && storage.wordle.getDailySolved()) {
        // Already solved today — show solved state
        setWon(true);
        setGameOver(true);
      }
    }
  }, [mode]);

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
    if (currentInput.length !== 5) { setError('Not enough letters'); return; }

    const word = currentInput.toUpperCase();
    const isValid = VALID_GUESSES.has(word.toLowerCase()) || DAILY_WORDS.includes(word.toLowerCase());
    if (!isValid) { setError('Not in word list'); return; }

    const states = evaluateGuess(word, target);
    const newGuess: GuessResult = { word, states };
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    setCurrentInput('');

    // Update letter map
    const newMap = { ...letterMap };
    states.forEach((s, i) => {
      const letter = word[i];
      const priority: Record<LetterState, number> = { correct: 3, present: 2, absent: 1, unknown: 0 };
      if (!newMap[letter] || priority[s] > priority[newMap[letter]]) {
        newMap[letter] = s;
      }
    });
    setLetterMap(newMap);

    if (states.every(s => s === 'correct')) {
      setWon(true);
      setGameOver(true);
      if (mode === 'daily') {
        const today = getTodayString();
        const lastDate = storage.wordle.getLastPlayedDate();
        const wasYesterday = isNewDay(lastDate) && !isNewDay(lastDate);
        const newStreak = streak + 1;
        const newBest = Math.max(bestStreak, newStreak);
        setStreak(newStreak);
        setBestStreak(newBest);
        storage.wordle.setDailyStreak(newStreak);
        storage.wordle.setBestStreak(newBest);
        storage.wordle.setLastPlayedDate(today);
        storage.wordle.setDailySolved(true);
        storage.wordle.setGamesPlayed(storage.wordle.getGamesPlayed() + 1);
        storage.wordle.setWins(storage.wordle.getWins() + 1);
      }
    } else if (newGuesses.length >= 6) {
      setGameOver(true);
      if (mode === 'daily') {
        storage.wordle.setDailyStreak(0);
        setStreak(0);
        storage.wordle.setLastPlayedDate(getTodayString());
        storage.wordle.setGamesPlayed(storage.wordle.getGamesPlayed() + 1);
      }
    }
  }, [currentInput, guesses, target, letterMap, mode, streak, bestStreak]);

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
