'use client';

import Link from 'next/link';

interface GameCardProps {
  name: string;
  emoji: string;
  href: string;
  accent: string;
  stat?: string;
  statLabel?: string;
}

export default function GameCard({ name, emoji, href, accent, stat, statLabel }: GameCardProps) {
  return (
    <Link href={href}>
      <div
        className="relative rounded-2xl p-4 flex flex-col gap-2 active:scale-95 transition-transform cursor-pointer select-none"
        style={{
          background: '#1a1a1a',
          border: `1px solid #2e2e2e`,
          minHeight: 120,
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: accent + '22' }}
        >
          {emoji}
        </div>
        <div className="font-semibold text-white text-sm">{name}</div>
        {stat !== undefined && (
          <div className="mt-auto">
            <span className="font-bold text-lg" style={{ color: accent }}>{stat}</span>
            {statLabel && <span className="text-xs ml-1" style={{ color: '#888' }}>{statLabel}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
