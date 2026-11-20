"use client";
import * as S from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider({ value, onChange, min = 0, max = 1, step = 0.01, className, disabled }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; className?: string; disabled?: boolean }) {
  return (
    <S.Root className={cn("relative flex h-5 w-full touch-none select-none items-center", className)} value={[value]} min={min} max={max} step={step} disabled={disabled} onValueChange={(v) => onChange(v[0])}>
      <S.Track className="relative h-1 grow overflow-hidden rounded-full bg-surface-3">
        <S.Range className="absolute h-full bg-primary" />
      </S.Track>
      <S.Thumb className="block size-3.5 rounded-full border-2 border-primary bg-white shadow outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" aria-label="Wartość" />
    </S.Root>
  );
}
