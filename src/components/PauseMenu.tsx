'use client';

import { useRouter } from 'next/navigation';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  accentColor?: string;
}

export default function PauseMenu({ onResume, onRestart, accentColor = '#60a5fa' }: PauseMenuProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-72 rounded-2xl p-6 flex flex-col gap-3"
        style={{ background: '#1a1a1a', border: `1px solid #2e2e2e` }}
      >
        <h2 className="text-center text-xl font-bold text-white mb-2">Paused</h2>

        <button
          onClick={onResume}
          className="w-full py-3 rounded-xl font-semibold text-white text-base transition-opacity active:opacity-70"
          style={{ background: accentColor }}
        >
          Resume
        </button>

        <button
          onClick={onRestart}
          className="w-full py-3 rounded-xl font-semibold text-base transition-opacity active:opacity-70"
          style={{ background: '#242424', color: '#f0f0f0', border: '1px solid #2e2e2e' }}
        >
          Restart
        </button>

        <button
          onClick={() => router.push('/')}
          className="w-full py-3 rounded-xl font-semibold text-base transition-opacity active:opacity-70"
          style={{ background: '#242424', color: '#888', border: '1px solid #2e2e2e' }}
        >
          Home
        </button>
      </div>
    </div>
  );
}
