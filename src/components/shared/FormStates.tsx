import * as React from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * View-only banner shown when the current role/stage cannot edit (warning tone).
 */
export function ViewOnlyBanner({
  message = "You have view-only access. Editing and downloads are restricted at this stage.",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs", className)}
      style={{ background: "var(--qbs-warning-bg)", color: "var(--qbs-gold-700)" }}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Empty "not started" state with an optional Start CTA.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-10",
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-qbs-navy/[0.06] text-qbs-navy mb-3">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="action" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
