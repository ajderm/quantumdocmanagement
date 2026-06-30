import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Small green pill that marks a section or field as pre-filled from the HubSpot deal,
 * so reps trust the value and don't re-key it. Uses the QBS success tones.
 */
export function FromHubSpotPill({
  label = "From HubSpot",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("from-hubspot-pill", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-qbs-green-600" aria-hidden />
      {label}
    </span>
  );
}

export default FromHubSpotPill;
