'use client';

import { useState, useCallback } from 'react';
import { storage } from '@/lib/storage';

export type HangmanMode = 'ai' | 'pvp';
export type HangmanDifficulty = 'easy' | 'medium' | 'hard';
export type HangmanCategory = 'Animals' | 'Food' | 'Sports' | 'Movies' | 'Countries' | 'Tech';

const WORD_LIST: Record<HangmanCategory, { easy: string[]; medium: string[]; hard: string[] }> = {
  Animals: {
    easy: ['cat', 'dog', 'cow', 'pig', 'hen', 'ant', 'bat', 'bee', 'emu', 'fox', 'owl', 'ram', 'yak', 'cod', 'elk', 'ape', 'jay'],
    medium: ['tiger', 'eagle', 'shark', 'horse', 'whale', 'snake', 'zebra', 'camel', 'otter', 'raven', 'bison', 'crane', 'llama', 'moose', 'panda', 'koala', 'squid'],
    hard: ['platypus', 'pangolin', 'narwhal', 'mongoose', 'scorpion', 'flamingo', 'chinchilla', 'chameleon', 'barracuda', 'albatross', 'armadillo', 'wolverine', 'hedgehog', 'tortoise', 'manatee', 'pheasant', 'mackerel'],
  },
  Food: {
    easy: ['pie', 'ham', 'jam', 'egg', 'fig', 'nut', 'pea', 'yam', 'bun', 'dip', 'tea', 'rye', 'oat', 'sub', 'ale', 'dal', 'poi'],
    medium: ['pizza', 'salad', 'bread', 'steak', 'pasta', 'mango', 'grape', 'lemon', 'melon', 'olive', 'peach', 'bagel', 'crepe', 'curry', 'donut', 'fudge', 'sushi'],
    hard: ['pancakes', 'sandwich', 'macaroni', 'dumpling', 'tortilla', 'baguette', 'cinnamon', 'mushroom', 'zucchini', 'avocado', 'broccoli', 'hazelnut', 'mandarin', 'nectarine', 'pistachio', 'smoothie', 'focaccia'],
  },
  Sports: {
    easy: ['ski', 'run', 'bat', 'box', 'row', 'gym', 'net', 'puck', 'lap', 'pin', 'jab', 'ace', 'tee', 'mat', 'rod', 'oar', 'cap'],
    medium: ['rugby', 'hockey', 'boxing', 'tennis', 'squash', 'soccer', 'track', 'cycle', 'vault', 'relay', 'kayak', 'chess', 'dodge', 'fence', 'field', 'match', 'catch'],
    hard: ['swimming', 'baseball', 'football', 'handball', 'lacrosse', 'archery', 'climbing', 'marathon', 'triathlon', 'curling', 'fencing', 'javelin', 'skeleton', 'biathlon', 'dressage', 'canoeing', 'sprinter'],
  },
  Movies: {
    easy: ['jaws', 'cars', 'up', 'elf', 'her', 'it', 'ray', 'rio', 'ted', 'joy', 'saw', 'big', 'run', 'ice', 'top', 'fly', 'war'],
    medium: ['rocky', 'ghost', 'alien', 'brave', 'shrek', 'speed', 'drive', 'jumbo', 'fargo', 'crash', 'seven', 'twins', 'signs', 'creed', 'logan', 'joker', 'venom'],
    hard: ['gladiator', 'inception', 'spotlight', 'moonlight', 'whiplash', 'parasite', 'departed', 'predator', 'braveheart', 'zootopia', 'deadpool', 'dunkirk', 'resident', 'goldeneye', 'hannibal', 'hercules', 'avengers'],
  },
  Countries: {
    easy: ['usa', 'uk', 'iran', 'iraq', 'cuba', 'fiji', 'laos', 'mali', 'peru', 'chad', 'oman', 'togo', 'guam', 'niue', 'cook', 'gaza', 'benin'],
    medium: ['japan', 'spain', 'italy', 'china', 'india', 'kenya', 'egypt', 'chile', 'nepal', 'qatar', 'ghana', 'haiti', 'libya', 'malta', 'niger', 'samoa', 'syria'],
    hard: ['australia', 'argentina', 'portugal', 'colombia', 'ethiopia', 'cambodia', 'mongolia', 'pakistan', 'malaysia', 'singapore', 'zimbabwe', 'indonesia', 'guatemala', 'greenland', 'honduras', 'tanzania', 'cameroon'],
  },
  Tech: {
    easy: ['app', 'web', 'bug', 'ram', 'cpu', 'api', 'url', 'git', 'bot', 'css', 'sql', 'bit', 'lan', 'usb', 'dns', 'ssh', 'png'],
    medium: ['pixel', 'cloud', 'linux', 'virus', 'cache', 'debug', 'login', 'proxy', 'queue', 'query', 'stack', 'token', 'route', 'mouse', 'patch', 'codec', 'graph'],
    hard: ['software', 'hardware', 'database', 'internet', 'firewall', 'compiler', 'algorithm', 'protocol', 'terminal', 'ethernet', 'keyboard', 'download', 'frontend', 'debugger', 'function', 'security', 'wireless'],
  },
};

const ALL_CATEGORIES: HangmanCategory[] = ['Animals', 'Food', 'Sports', 'Movies', 'Countries', 'Tech'];
const MAX_WRONG = 6;

function getRandomWord(difficulty: HangmanDifficulty): { word: string; category: HangmanCategory } {
  const category = ALL_CATEGORIES[Math.floor(Math.random() * ALL_CATEGORIES.length)];
  const words = WORD_LIST[category][difficulty];
  const word = words[Math.floor(Math.random() * words.length)].toUpperCase();
  return { word, category };
}

export function useHangman() {
  const [mode, setMode] = useState<HangmanMode | null>(null);
  const [difficulty, setDifficulty] = useState<HangmanDifficulty>('medium');
  const [secretWord, setSecretWord] = useState('');
  const [category, setCategory] = useState<HangmanCategory | null>(null);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongCount, setWrongCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const [winsVsAI, setWinsVsAI] = useState(() => storage.hangman.getWins());
  const [bestStreak, setBestStreak] = useState(() => storage.hangman.getBestStreak());
  const [currentStreak, setCurrentStreak] = useState(0);

  const startAIGame = useCallback((diff: HangmanDifficulty) => {
    const { word, category: cat } = getRandomWord(diff);
    setMode('ai');
    setDifficulty(diff);
    setSecretWord(word);
    setCategory(cat);
    setGuessedLetters(new Set());
    setWrongCount(0);
    setGameOver(false);
    setWon(false);
    setStarted(true);
  }, []);

  const startPVPGame = useCallback((word: string) => {
    setMode('pvp');
    setSecretWord(word.toUpperCase());
    setCategory(null);
    setGuessedLetters(new Set());
    setWrongCount(0);
    setGameOver(false);
    setWon(false);
    setStarted(true);
  }, []);

  const guessLetter = useCallback((letter: string) => {
    if (gameOver || guessedLetters.has(letter)) return;

    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);

    if (!secretWord.includes(letter)) {
      const newWrong = wrongCount + 1;
      setWrongCount(newWrong);
      if (newWrong >= MAX_WRONG) {
        setGameOver(true);
        setWon(false);
        setCurrentStreak(0);
      }
    } else {
      // Check if won
      const allRevealed = secretWord.split('').every(ch => ch === ' ' || newGuessed.has(ch));
      if (allRevealed) {
        setGameOver(true);
        setWon(true);
        if (mode === 'ai') {
          const newWins = winsVsAI + 1;
          setWinsVsAI(newWins);
          storage.hangman.setWins(newWins);
          const newStreak = currentStreak + 1;
          setCurrentStreak(newStreak);
          if (newStreak > bestStreak) {
            setBestStreak(newStreak);
            storage.hangman.setBestStreak(newStreak);
          }
        }
      }
    }
  }, [gameOver, guessedLetters, secretWord, wrongCount, mode, winsVsAI, currentStreak, bestStreak]);

  const restart = useCallback(() => {
    if (mode === 'ai') {
      startAIGame(difficulty);
    } else {
      setStarted(false);
    }
  }, [mode, difficulty, startAIGame]);

  const revealedWord = secretWord.split('').map(ch =>
    ch === ' ' ? ' ' : guessedLetters.has(ch) ? ch : '_'
  );

  const wrongLetters = Array.from(guessedLetters).filter(l => !secretWord.includes(l));

  return {
    mode, difficulty, secretWord, category, guessedLetters, wrongCount,
    gameOver, won, started, winsVsAI, bestStreak, currentStreak,
    revealedWord, wrongLetters, maxWrong: MAX_WRONG,
    startAIGame, startPVPGame, guessLetter, restart,
    setStarted,
  };
}
