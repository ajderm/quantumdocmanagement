import * as React from "react";
import { Check, Loader2, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Autosave status chip. Drive `status` from the form's existing debounced save
 * logic (AUTO_SAVE_DELAY) — this is presentation only and changes no save behavior.
 */
export function AutosaveChip({
  status,
  className,
  savedLabel = "All changes saved",
}: {
  status: AutosaveStatus;
  className?: string;
  savedLabel?: string;
}) {
  if (status === "idle") return null;

  const map: Record<Exclude<AutosaveStatus, "idle">, { icon: React.ReactNode; text: string; cls: string }> = {
    saving: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: "Saving…",
      cls: "text-muted-foreground",
    },
    saved: {
      icon: <Check className="h-3 w-3" />,
      text: savedLabel,
      cls: "text-qbs-green-700",
    },
    error: {
      icon: <CloudOff className="h-3 w-3" />,
      text: "Couldn't save",
      cls: "text-destructive",
    },
  };

  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", s.cls, className)}>
      {s.icon}
      {s.text}
    </span>
  );
}

export default AutosaveChip;
