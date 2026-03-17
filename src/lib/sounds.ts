let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!isSoundEnabled()) return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function isSoundEnabled(): boolean {
  try { return localStorage.getItem('minigames:sound:enabled') !== 'false'; } catch { return false; }
}

export function playTick() {
  const c = getCtx(); if (!c) return;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = 'sine'; osc.frequency.value = 600;
  gain.gain.setValueAtTime(0.25, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
  osc.start(); osc.stop(c.currentTime + 0.05);
}

export function playSuccess() {
  const c = getCtx(); if (!c) return;
  [523, 659, 784].forEach((freq, i) => {
    const osc = c!.createOscillator(); const gain = c!.createGain();
    osc.connect(gain); gain.connect(c!.destination);
    osc.type = 'sine'; osc.frequency.value = freq;
    const t = c!.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t); osc.stop(t + 0.2);
  });
}

export function playError() {
  const c = getCtx(); if (!c) return;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = 'sawtooth'; osc.frequency.value = 200;
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.2);
  gain.gain.setValueAtTime(0.3, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  osc.start(); osc.stop(c.currentTime + 0.2);
}

export function playWin() {
  const c = getCtx(); if (!c) return;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = c!.createOscillator(); const gain = c!.createGain();
    osc.connect(gain); gain.connect(c!.destination);
    osc.type = 'sine'; osc.frequency.value = freq;
    const t = c!.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t); osc.stop(t + 0.3);
  });
}

export function playFlag() {
  const c = getCtx(); if (!c) return;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = 'square'; osc.frequency.value = 400;
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
  osc.start(); osc.stop(c.currentTime + 0.04);
}
