import * as React from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AutosaveChip, type AutosaveStatus } from "./AutosaveChip";

export interface SummaryMetric {
  label: string;
  value: React.ReactNode;
  /** Render larger/bolder for a headline figure (e.g. payout, deal value) */
  emphasis?: boolean;
}

interface SummaryRailProps {
  title?: string;
  metrics?: SummaryMetric[];
  /** Generate handler (primary, green). Hidden if omitted. */
  onGenerate?: () => void;
  generating?: boolean;
  canGenerate?: boolean;
  generateLabel?: string;
  /** Preview handler (secondary). Hidden if omitted. */
  onPreview?: () => void;
  previewLabel?: string;
  autosave?: AutosaveStatus;
  /** Extra content rendered above the action buttons */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Sticky right-hand summary rail: gold top-accent, headline metrics, and the
 * primary Generate (green/action) + Preview (secondary) actions. Generate is
 * disabled when canGenerate is false (role/stage view-only or incomplete form).
 * Wire onGenerate/onPreview to the form's existing handlers — no logic here.
 */
export function SummaryRail({
  title = "Summary",
  metrics = [],
  onGenerate,
  generating = false,
  canGenerate = true,
  generateLabel = "Generate PDF",
  onPreview,
  previewLabel = "Preview",
  autosave = "idle",
  children,
  className,
}: SummaryRailProps) {
  return (
    <aside
      className={cn(
        "relative rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden",
        "lg:sticky lg:top-[68px] lg:self-start",
        className,
      )}
    >
      <span className="absolute top-0 left-0 right-0 h-[3px] bg-qbs-gold-500" aria-hidden />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13.5px] font-semibold tracking-tight">{title}</h3>
          <AutosaveChip status={autosave} />
        </div>

        {metrics.length > 0 && (
          <dl className="space-y-2 mb-4">
            {metrics.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-baseline justify-between gap-3",
                  m.emphasis && "pt-2 border-t border-border/70",
                )}
              >
                <dt className={cn("text-muted-foreground", m.emphasis ? "text-[12px]" : "text-[12px]")}>
                  {m.label}
                </dt>
                <dd
                  className={cn(
                    "tabular-nums font-semibold text-foreground",
                    m.emphasis ? "text-lg text-qbs-navy" : "text-[13px]",
                  )}
                >
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {children}

        <div className="flex flex-col gap-2 mt-1">
          {onGenerate && (
            <Button
              variant="action"
              className="w-full"
              onClick={onGenerate}
              disabled={generating || !canGenerate}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {generating ? "Generating…" : generateLabel}
            </Button>
          )}
          {onPreview && (
            <Button variant="outline" className="w-full" onClick={onPreview} disabled={generating}>
              <Eye className="h-4 w-4" />
              {previewLabel}
            </Button>
          )}
        </div>

        {!canGenerate && onGenerate && (
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Generation is unavailable for this deal stage or role.
          </p>
        )}
      </div>
    </aside>
  );
}

export default SummaryRail;
