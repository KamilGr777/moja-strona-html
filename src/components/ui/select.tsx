"use client";
import * as React from "react";
import * as S from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

export function Select({ value, onValueChange, options, placeholder, className, disabled, id }: { value: string | undefined; onValueChange: (v: string) => void; options: SelectOption[]; placeholder?: string; className?: string; disabled?: boolean; id?: string }) {
  return (
    <S.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <S.Trigger id={id} className={cn("flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 text-left text-sm text-fg outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-[var(--ring)] data-[placeholder]:text-subtle disabled:opacity-50", className)}>
        <S.Value placeholder={placeholder ?? "Wybierz…"} />
        <S.Icon><ChevronDown className="size-4 text-subtle" /></S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={6} className="z-50 max-h-[320px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-elevated p-1 shadow-2xl">
          <S.Viewport>
            {options.map((o) => (
              <S.Item key={o.value} value={o.value} className="relative flex cursor-pointer select-none flex-col rounded-md py-2 pl-8 pr-3 text-sm text-fg outline-none data-[highlighted]:bg-surface-3">
                <S.ItemIndicator className="absolute left-2 top-2.5"><Check className="size-4 text-primary" /></S.ItemIndicator>
                <S.ItemText>{o.label}</S.ItemText>
                {o.hint && <span className="text-xs text-subtle">{o.hint}</span>}
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
