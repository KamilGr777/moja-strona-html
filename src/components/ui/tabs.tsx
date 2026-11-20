"use client";
import * as T from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;
export function TabsList({ className, ...p }: T.TabsListProps) {
  return <T.List className={cn("inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1", className)} {...p} />;
}
export function TabsTrigger({ className, ...p }: T.TabsTriggerProps) {
  return <T.Trigger className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted transition hover:text-fg data-[state=active]:bg-surface-3 data-[state=active]:text-fg data-[state=active]:shadow-sm [&_svg]:size-3.5 cursor-pointer whitespace-nowrap", className)} {...p} />;
}
export function TabsContent({ className, ...p }: T.TabsContentProps) {
  return <T.Content className={cn("outline-none", className)} {...p} />;
}
