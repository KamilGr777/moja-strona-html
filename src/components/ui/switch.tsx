"use client";
import * as S from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ checked, onCheckedChange, id, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; id?: string; disabled?: boolean }) {
  return (
    <S.Root id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className={cn("relative h-5 w-9 shrink-0 cursor-pointer rounded-full border border-border bg-surface-3 transition data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-50")}>
      <S.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[17px]" />
    </S.Root>
  );
}

export function SwitchRow({ label, hint, checked, onCheckedChange }: { label: string; hint?: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
      <span>
        <span className="block text-sm text-fg">{label}</span>
        {hint && <span className="block text-xs text-subtle">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
