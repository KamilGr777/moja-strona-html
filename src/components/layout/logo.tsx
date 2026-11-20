export function Logo({ compact = false, id = "lg" }: { compact?: boolean; id?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="size-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3d7bff" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="#12151b" stroke="#232833" />
        <path d="M18 44V20h12c8 0 14 5 14 12s-6 12-14 12H18z" fill="none" stroke={`url(#${id})`} strokeWidth="5" strokeLinejoin="round" />
        <path d="M27 27l9 5-9 5z" fill={`url(#${id})`} />
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className="text-[13px] font-bold tracking-[0.14em] text-fg">DETAIL REEL</div>
          <div className="mt-0.5 text-[10px] font-semibold tracking-[0.3em] text-gradient">AI STUDIO</div>
        </div>
      )}
    </div>
  );
}
