"use client";
import * as TT from "@radix-ui/react-tooltip";

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TT.Provider delayDuration={250}>
      <TT.Root>
        <TT.Trigger asChild>{children}</TT.Trigger>
        <TT.Portal>
          <TT.Content side={side} sideOffset={6} className="z-50 max-w-xs rounded-md border border-border bg-elevated px-2 py-1 text-xs text-fg shadow-xl">{content}</TT.Content>
        </TT.Portal>
      </TT.Root>
    </TT.Provider>
  );
}

