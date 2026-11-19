import { cx } from '../ui';

/** Holograficzna kulka światła z delikatną „mimiką” — autorski przewodnik aplikacji. */
export function GhostOrb({ size = 56, mood = 'calm', className }: { size?: number; mood?: 'calm' | 'happy' | 'thinking'; className?: string }) {
  return (
    <span className={cx('relative inline-block', className)} style={{ width: size, height: size }} aria-hidden="true">
      <span
        className="absolute inset-[-6px] rounded-full opacity-70 blur-md animate-pulse-soft"
        style={{ background: 'radial-gradient(circle, rgb(45 212 191 / 0.55), rgb(139 92 246 / 0.35) 55%, transparent 70%)' }}
      />
      <svg viewBox="0 0 64 64" width={size} height={size} className="relative">
        <defs>
          <radialGradient id="ghost-core" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#e6fffb" />
            <stop offset="35%" stopColor="#5eead4" />
            <stop offset="75%" stopColor="#7c6cf0" />
            <stop offset="100%" stopColor="#3b2a8a" />
          </radialGradient>
          <linearGradient id="ghost-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#99f6e4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="27" fill="url(#ghost-core)" />
        <circle cx="32" cy="32" r="29.5" fill="none" stroke="url(#ghost-ring)" strokeWidth="1.5" />
        <ellipse cx="24" cy="20" rx="8" ry="4.5" fill="#fff" opacity="0.35" />
        <g className="origin-center animate-blink" style={{ transformBox: 'fill-box' }}>
          <rect x="22.5" y="27" width="5" height={mood === 'thinking' ? 4 : 9} rx="2.5" fill="#0b1224" />
          <rect x="36.5" y="27" width="5" height={mood === 'thinking' ? 4 : 9} rx="2.5" fill="#0b1224" />
        </g>
        {mood === 'happy' ? (
          <path d="M26 41 Q32 46 38 41" stroke="#0b1224" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M27.5 42 Q32 44 36.5 42" stroke="#0b1224" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8" />
        )}
        <circle cx="20" cy="38" r="2.6" fill="#fbbf24" opacity="0.35" />
        <circle cx="44" cy="38" r="2.6" fill="#fbbf24" opacity="0.35" />
      </svg>
    </span>
  );
}
