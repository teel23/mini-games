'use client';

import Link from 'next/link';

interface GameCardProps {
  name: string;
  emoji: string;
  href: string;
  accent: string;
  stat?: string;
  statLabel?: string;
  accentStat?: boolean;
  index?: number;
}

export default function GameCard({ name, emoji, href, accent, stat, statLabel, accentStat, index = 0 }: GameCardProps) {
  return (
    <Link href={href}>
      <div
        className="relative flex flex-col items-center gap-2 select-none card-entrance"
        style={{
          background: `linear-gradient(135deg, ${accent}22 0%, ${accent}44 100%)`,
          border: `1px solid ${accent}66`,
          borderRadius: 20,
          padding: '20px 12px 16px',
          minHeight: 140,
          boxShadow: `0 4px 24px ${accent}22`,
          transition: 'transform 0.15s ease, filter 0.15s ease',
          animationDelay: `${index * 60}ms`,
          cursor: 'pointer',
        }}
        onPointerDown={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)';
          (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)';
        }}
        onPointerUp={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLElement).style.filter = 'brightness(1)';
        }}
        onPointerLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLElement).style.filter = 'brightness(1)';
        }}
      >
        <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{emoji}</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', textAlign: 'center' }}>{name}</div>
        {stat !== undefined && (
          <div style={{ marginTop: 'auto' }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: accentStat ? accent : accent }}>
              {stat}
            </span>
            {statLabel && <span style={{ fontSize: '0.7rem', marginLeft: 4, color: '#aaa' }}>{statLabel}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
