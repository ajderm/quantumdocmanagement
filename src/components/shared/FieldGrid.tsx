import * as React from "react";
import { cn } from "@/lib/utils";

interface FieldGridProps {
  /** Number of columns at the widest breakpoint (default 2). Collapses to 1 when narrow. */
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
}

/**
 * Responsive field grid. Uses repeat(N, minmax(0,1fr)) so prefixed fields ($ / %)
 * never clip, and collapses to a single column on narrow widths. Pair with FieldGrid
 * for consistent gaps across every form.
 */
export function FieldGrid({ columns = 2, className, children }: FieldGridProps) {
  const cols: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };
  return (
    <div className={cn("grid gap-x-4 gap-y-3.5 [&>*]:min-w-0", cols[columns], className)}>
      {children}
    </div>
  );
}

/**
 * A single labeled field cell. Label above (12px medium), control below.
 * Keep inputs uncontrolled (defaultValue + onChange) inside this to preserve focus.
 */
export function Field({
  label,
  htmlFor,
  hint,
  required,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1 min-w-0", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[12px] font-medium text-foreground/80 leading-none"
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>}
    </div>
  );
}

export default FieldGrid;
