/**
 * Branch offices: the addresses documents print instead of corporate.
 *
 * Which branch a document uses is decided by the *rep prefix*, not the
 * location code — Eakes' Grand Island is location 6 but its reps start 17 —
 * so prefixes are edited here explicitly and never derived from the code.
 *
 * The table is service-role only, so everything goes through the
 * `dealer-locations-save` function; it re-checks the same two rules the
 * database enforces (one main office, no shared prefix) and returns the saved
 * rows.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DealerLocation } from "@/lib/branches";

interface BranchLocationsManagerProps {
  portalId: string;
  /** Rows already fetched with the rest of Settings. */
  locations: DealerLocation[];
  /** Called after a successful save so the rest of the app sees the new rows. */
  onSaved?: (locations: DealerLocation[]) => void;
}

type Row = DealerLocation & { prefixText: string };

const toRow = (l: DealerLocation): Row => ({
  ...l,
  prefixText: (l.rep_prefixes ?? []).join(", "),
});

const emptyRow = (): Row => ({
  code: "", name: "", street: "", city: "", state: "", zip: "", phone: "",
  rep_prefixes: [], is_main: false, prefixText: "",
});

export function BranchLocationsManager({
  portalId, locations, onSaved,
}: BranchLocationsManagerProps) {
  const [rows, setRows] = useState<Row[]>(locations.map(toRow));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(locations.map(toRow));
  }, [locations]);

  const update = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  // Exactly one main office, so choosing one clears the rest.
  const setMain = (index: number) => {
    setRows((prev) => prev.map((r, i) => ({ ...r, is_main: i === index })));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        code: r.code,
        name: r.name,
        street: r.street,
        city: r.city,
        state: r.state,
        zip: r.zip,
        phone: r.phone,
        rep_prefixes: r.prefixText.split(/[,\s]+/).filter(Boolean),
        is_main: r.is_main === true,
      }));

      const { data, error } = await supabase.functions.invoke("dealer-locations-save", {
        body: { portalId, locations: payload },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const saved: DealerLocation[] = data?.dealerLocations ?? [];
      setRows(saved.map(toRow));
      onSaved?.(saved);
      toast.success("Branch locations saved");
    } catch (err) {
      console.error("Failed to save branch locations:", err);
      toast.error("Could not save branch locations");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Branch Locations
        </CardTitle>
        <CardDescription>
          Documents print the address of the branch that matches the salesperson
          number on the deal. Rep prefixes are not the same as location codes —
          enter the digits a branch's salesperson numbers start with. With no
          branches listed, every document uses the company address above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 && (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No branches yet. Documents use the company address.
          </div>
        )}

        {rows.map((row, index) => (
          <div key={index} className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {row.name || "New branch"}
                </span>
                {row.is_main && <Badge variant="secondary">Main office</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {!row.is_main && (
                  <Button variant="outline" size="sm" onClick={() => setMain(index)}>
                    Make main
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Location code</Label>
                <Input value={row.code} onChange={(e) => update(index, { code: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Name</Label>
                <Input value={row.name} onChange={(e) => update(index, { name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Rep prefixes</Label>
                <Input
                  value={row.prefixText}
                  placeholder="17, 18"
                  onChange={(e) => update(index, { prefixText: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Street</Label>
                <Input value={row.street ?? ""} onChange={(e) => update(index, { street: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input value={row.city ?? ""} onChange={(e) => update(index, { city: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">State</Label>
                  <Input value={row.state ?? ""} onChange={(e) => update(index, { state: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">ZIP</Label>
                  <Input value={row.zip ?? ""} onChange={(e) => update(index, { zip: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={row.phone ?? ""} onChange={(e) => update(index, { phone: e.target.value })} />
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, emptyRow()])}>
            <Plus className="h-4 w-4 mr-1" />
            Add branch
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving
              ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving…</>
              : <><Save className="h-4 w-4 mr-1" />Save branches</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
