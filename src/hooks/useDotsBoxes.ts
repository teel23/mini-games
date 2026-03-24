'use client';

import { useState, useCallback, useEffect } from 'react';

export type DBMode = 'ai' | 'pvp';
export type DBDifficulty = 'easy' | 'medium' | 'hard';
export type DBSize = 'small' | 'medium' | 'large';

const SIZE_MAP = { small: 3, medium: 5, large: 7 };

type Player = 1 | 2;

export interface Line {
  r: number;
  c: number;
  dir: 'h' | 'v';
}

function lineKey(l: Line): string {
  return `${l.r}-${l.c}-${l.dir}`;
}

function getBoxesForLine(l: Line, rows: number, cols: number): [number, number][] {
  const boxes: [number, number][] = [];
  if (l.dir === 'h') {
    // Horizontal line at row l.r, between dots l.c and l.c+1
    // Box above: row l.r-1 if l.r > 0
    if (l.r > 0) boxes.push([l.r - 1, l.c]);
    // Box below: row l.r if l.r < rows
    if (l.r < rows) boxes.push([l.r, l.c]);
  } else {
    // Vertical line at col l.c, between dots l.r and l.r+1
    if (l.c > 0) boxes.push([l.r, l.c - 1]);
    if (l.c < cols) boxes.push([l.r, l.c]);
  }
  return boxes;
}

function getAllLines(rows: number, cols: number): Line[] {
  const lines: Line[] = [];
  // Horizontal lines: (rows+1) rows of cols lines each
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c < cols; c++)
      lines.push({ r, c, dir: 'h' });
  // Vertical lines: rows rows of (cols+1) lines each
  for (let r = 0; r < rows; r++)
    for (let c = 0; c <= cols; c++)
      lines.push({ r, c, dir: 'v' });
  return lines;
}

function isBoxComplete(br: number, bc: number, claimed: Set<string>): boolean {
  return (
    claimed.has(`${br}-${bc}-h`) &&       // top
    claimed.has(`${br + 1}-${bc}-h`) &&   // bottom
    claimed.has(`${br}-${bc}-v`) &&       // left
    claimed.has(`${br}-${bc + 1}-v`)      // right
  );
}

function countNewBoxes(line: Line, claimed: Set<string>, rows: number, cols: number): number {
  const testSet = new Set(claimed);
  testSet.add(lineKey(line));
  let count = 0;
  for (const [br, bc] of getBoxesForLine(line, rows, cols)) {
    if (br >= 0 && br < rows && bc >= 0 && bc < cols) {
      if (isBoxComplete(br, bc, testSet) && !isBoxComplete(br, bc, claimed)) {
        count++;
      }
    }
  }
  return count;
}

export function useDotsBoxes() {
  const [mode, setMode] = useState<DBMode | null>(null);
  const [difficulty, setDifficulty] = useState<DBDifficulty>('medium');
  const [size, setSize] = useState<DBSize>('small');
  const [started, setStarted] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [claimedLines, setClaimedLines] = useState<Set<string>>(new Set());
  const [lineOwner, setLineOwner] = useState<Map<string, Player>>(new Map());
  const [boxOwner, setBoxOwner] = useState<Map<string, Player>>(new Map());
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [gameOver, setGameOver] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const rows = SIZE_MAP[size];
  const cols = SIZE_MAP[size];
  const totalBoxes = rows * cols;

  const start = useCallback((m: DBMode, d: DBDifficulty, s: DBSize) => {
    setMode(m);
    setDifficulty(d);
    setSize(s);
    setStarted(true);
    setCurrentPlayer(1);
    setClaimedLines(new Set());
    setLineOwner(new Map());
    setBoxOwner(new Map());
    setScores([0, 0]);
    setGameOver(false);
    setAiThinking(false);
  }, []);

  const claimLine = useCallback((line: Line) => {
    const key = lineKey(line);
    if (claimedLines.has(key) || gameOver || aiThinking) return;
    if (mode === 'ai' && currentPlayer === 2) return;

    const newClaimed = new Set(claimedLines);
    newClaimed.add(key);
    const newLineOwner = new Map(lineOwner);
    newLineOwner.set(key, currentPlayer);
    const newBoxOwner = new Map(boxOwner);
    const newScores: [number, number] = [...scores];

    let completedBoxes = 0;
    const boxes = getBoxesForLine(line, rows, cols);
    for (const [br, bc] of boxes) {
      if (br >= 0 && br < rows && bc >= 0 && bc < cols) {
        if (isBoxComplete(br, bc, newClaimed) && !boxOwner.has(`${br}-${bc}`)) {
          newBoxOwner.set(`${br}-${bc}`, currentPlayer);
          newScores[currentPlayer - 1]++;
          completedBoxes++;
        }
      }
    }

    setClaimedLines(newClaimed);
    setLineOwner(newLineOwner);
    setBoxOwner(newBoxOwner);
    setScores(newScores);

    // Check game over
    if (newScores[0] + newScores[1] >= totalBoxes) {
      setGameOver(true);
      return;
    }

    // If completed a box, same player goes again
    if (completedBoxes === 0) {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  }, [claimedLines, gameOver, aiThinking, mode, currentPlayer, lineOwner, boxOwner, scores, rows, cols, totalBoxes]);

  // AI move
  useEffect(() => {
    if (mode !== 'ai' || currentPlayer !== 2 || gameOver || aiThinking) return;

    setAiThinking(true);
    const timer = setTimeout(() => {
      const available = getAllLines(rows, cols).filter(l => !claimedLines.has(lineKey(l)));
      if (available.length === 0) { setAiThinking(false); return; }

      let chosen: Line;

      if (difficulty === 'easy') {
        chosen = available[Math.floor(Math.random() * available.length)];
      } else {
        // Greedy: take any line that completes a box
        const completing = available.filter(l => countNewBoxes(l, claimedLines, rows, cols) > 0);
        if (completing.length > 0) {
          chosen = completing[Math.floor(Math.random() * completing.length)];
        } else if (difficulty === 'hard') {
          // Avoid giving chains: don't play a line that leaves 2 sides completed on any box
          const safe = available.filter(l => {
            const testSet = new Set(claimedLines);
            testSet.add(lineKey(l));
            const boxes = getBoxesForLine(l, rows, cols);
            for (const [br, bc] of boxes) {
              if (br >= 0 && br < rows && bc >= 0 && bc < cols && !boxOwner.has(`${br}-${bc}`)) {
                // Count sides of this box
                let sides = 0;
                if (testSet.has(`${br}-${bc}-h`)) sides++;
                if (testSet.has(`${br + 1}-${bc}-h`)) sides++;
                if (testSet.has(`${br}-${bc}-v`)) sides++;
                if (testSet.has(`${br}-${bc + 1}-v`)) sides++;
                if (sides === 3) return false; // Would give opponent a box
              }
            }
            return true;
          });
          chosen = safe.length > 0 ? safe[Math.floor(Math.random() * safe.length)] : available[Math.floor(Math.random() * available.length)];
        } else {
          // Medium: random from non-completing
          chosen = available[Math.floor(Math.random() * available.length)];
        }
      }

      // Execute AI move
      const key = lineKey(chosen);
      const newClaimed = new Set(claimedLines);
      newClaimed.add(key);
      const newLineOwner = new Map(lineOwner);
      newLineOwner.set(key, 2);
      const newBoxOwner = new Map(boxOwner);
      const newScores: [number, number] = [...scores];

      let completedBoxes = 0;
      for (const [br, bc] of getBoxesForLine(chosen, rows, cols)) {
        if (br >= 0 && br < rows && bc >= 0 && bc < cols) {
          if (isBoxComplete(br, bc, newClaimed) && !boxOwner.has(`${br}-${bc}`)) {
            newBoxOwner.set(`${br}-${bc}`, 2);
            newScores[1]++;
            completedBoxes++;
          }
        }
      }

      setClaimedLines(newClaimed);
      setLineOwner(newLineOwner);
      setBoxOwner(newBoxOwner);
      setScores(newScores);

      if (newScores[0] + newScores[1] >= totalBoxes) {
        setGameOver(true);
        setAiThinking(false);
        return;
      }

      if (completedBoxes === 0) {
        setCurrentPlayer(1);
      }
      // If completed box, AI goes again (don't change player, useEffect will re-trigger)

      setAiThinking(false);
    }, 400);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentPlayer, gameOver, claimedLines, lineOwner, boxOwner, scores, rows, cols, totalBoxes, difficulty]);

  const restart = useCallback(() => {
    if (mode) start(mode, difficulty, size);
  }, [mode, difficulty, size, start]);

  return {
    mode, difficulty, size, started, currentPlayer, claimedLines, lineOwner, boxOwner, scores,
    gameOver, aiThinking, rows, cols, totalBoxes,
    start, claimLine, restart, setStarted,
  };
}
