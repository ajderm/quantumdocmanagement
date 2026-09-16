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
  /** The branch actually in use, resolved or overridden. */
  active: DealerLocation | null;
  /** Location code of the rep's explicit choice, or null when auto. */
  override: string | null;
  onOverrideChange: (code: string | null) => void;
  disabled?: boolean;
}

export function BranchSelector({
  locations, active, override, onOverrideChange, disabled,
}: BranchSelectorProps) {
  if (!locations.length) return null;

  return (
    <div className="flex items-center gap-1.5">
      <MapPin className="h-3 w-3" />
      <Select
        value={override ?? RESOLVED}
        onValueChange={(v) => onOverrideChange(v === RESOLVED ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-6 w-auto gap-1 border-none bg-transparent px-1 text-xs text-muted-foreground shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={RESOLVED}>
            {active ? `${active.name} (from salesperson)` : "No branch"}
          </SelectItem>
          {locations.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.code} · {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active && (
        <span className="hidden lg:inline text-[11px] text-muted-foreground/80 truncate max-w-[280px]">
          {branchAddress(active)}
        </span>
      )}
    </div>
  );
}
