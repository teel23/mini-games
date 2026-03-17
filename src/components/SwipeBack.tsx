'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function SwipeBack() {
  const router = useRouter();
  const pathname = usePathname();
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (pathname === '/') return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t.clientX > 30) return; // only trigger from left edge
      startRef.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!startRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = Math.abs(t.clientY - startRef.current.y);
      startRef.current = null;
      if (dx > 80 && dy < 60) router.push('/');
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [pathname, router]);

  if (pathname === '/') return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: 'linear-gradient(to right, rgba(255,255,255,0.15), transparent)',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    />
  );
}
