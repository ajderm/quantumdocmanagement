import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FromHubSpotPill } from "./FromHubSpotPill";

interface SectionCardProps {
  /** Section title shown in the header row */
  title: string;
  /** Optional Lucide icon rendered before the title */
  icon?: LucideIcon;
  /** Optional one-line helper under the title */
  description?: string;
  /** Show the green "From HubSpot" pill in the header (for pre-filled sections) */
  fromHubSpot?: boolean;
  /** Optional node rendered at the right edge of the header (e.g. a toggle, count) */
  action?: React.ReactNode;
  /** Adds the 3px gold top-accent used on summary/premium cards */
  accent?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

/**
 * Standard QBS section card: white surface, 1px border, 12px radius, soft shadow,
 * a header row (icon + title [+ From HubSpot pill] [+ action]) and a body slot.
 * Presentation only — pass your existing fields/controls as children.
 */
export function SectionCard({
  title,
  icon: Icon,
  description,
  fromHubSpot = false,
  action,
  accent = false,
  className,
  bodyClassName,
  children,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "relative rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden",
        className,
      )}
    >
      {accent && (
        <span className="absolute top-0 left-0 right-0 h-[3px] bg-qbs-gold-500" aria-hidden />
      )}
      <header className="flex items-center gap-2.5 px-4 pt-3.5 pb-3 border-b border-border/70">
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-qbs-navy/[0.06] text-qbs-navy shrink-0">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[13.5px] font-semibold text-foreground tracking-tight truncate">
              {title}
            </h3>
            {fromHubSpot && <FromHubSpotPill />}
          </div>
          {description && (
            <p className="text-[12px] text-muted-foreground leading-tight mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export default SectionCard;
