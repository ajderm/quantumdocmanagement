/**
 * The branch whose address the documents on this record will print.
 *
 * Defaults to the branch resolved from the deal's salesperson number, and a
 * rep can point a record at a different branch when the paperwork should go
 * out from somewhere else. Renders nothing for portals with no branches, so
 * nothing changes for them.
 */
import { MapPin } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { branchAddress, type DealerLocation } from "@/lib/branches";

const RESOLVED = "__resolved__";

interface BranchSelectorProps {
  locations: DealerLocation[];
  /** Salesperson-resolved branch before any manual override. */
  resolved: DealerLocation | null;
  /** The branch actually in use, resolved or overridden. */
  active: DealerLocation | null;
  /** Location code of the rep's explicit choice, or null when auto. */
  override: string | null;
  onOverrideChange: (code: string | null) => void;
  disabled?: boolean;
}

export function BranchSelector({
  locations, resolved, active, override, onOverrideChange, disabled,
}: BranchSelectorProps) {
  if (!locations.length) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          Document branch
        </div>
        <p className="text-xs text-muted-foreground">
          {active ? branchAddress(active) : "No branch resolved"}
        </p>
      </div>
      <Select
        value={override ?? RESOLVED}
        onValueChange={(v) => onOverrideChange(v === RESOLVED ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-full text-sm sm:w-[260px]" aria-label="Document branch">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={RESOLVED}>
            {resolved ? `Automatic — ${resolved.name}` : "Automatic — main office"}
          </SelectItem>
          {locations.map((location) => (
            <SelectItem key={location.code} value={location.code}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
