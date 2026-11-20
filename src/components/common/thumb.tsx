import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

export function Thumb({ assetId, className, alt = "" }: { assetId?: string | null; className?: string; alt?: string }) {
  if (!assetId)
    return (
      <div className={cn("flex items-center justify-center rounded-lg border border-border bg-surface-2", className)}>
        <Film className="size-4 text-subtle" />
      </div>
    );
  return <img src={`/api/media/${assetId}?v=poster`} alt={alt} loading="lazy" className={cn("rounded-lg border border-border bg-surface-2 object-cover", className)} />;
}
