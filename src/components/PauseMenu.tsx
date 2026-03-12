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
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div
        className="w-72 flex flex-col gap-3"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: `1px solid ${accentColor}44`,
          borderRadius: 24,
          padding: 24,
        }}
      >
        <h2 className="text-center text-xl font-bold text-white mb-2">Paused</h2>

        <button
          onClick={onResume}
          className="w-full py-3 font-semibold text-white text-base active:scale-95 transition-transform"
          style={{ background: accentColor, borderRadius: 16, minHeight: 48 }}
        >
          Resume
        </button>

        <button
          onClick={onRestart}
          className="w-full py-3 font-semibold text-base active:scale-95 transition-transform"
          style={{ background: '#ffffff11', color: '#f0f0f0', border: '1px solid #ffffff22', borderRadius: 16, minHeight: 48 }}
        >
          Restart
        </button>

        <button
          onClick={() => router.push('/')}
          className="w-full py-3 font-semibold text-base active:scale-95 transition-transform"
          style={{ background: '#ffffff11', color: '#888', border: '1px solid #ffffff11', borderRadius: 16, minHeight: 48 }}
        >
          Home
        </button>
      </div>
    </div>
  );
}
