// Quote-page view of the commission Additional Costs + a compact commission
// summary. This is a SECOND VIEW of the same commission state that lives in
// DocumentHub (commissionFormData) — it reads and writes those exact fields via
// onCostChange, so edits here and on the Commission tab are one set of numbers.
// Nothing here prints on the customer-facing quote PDF.

import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, DollarSign } from "lucide-react";
import { SectionCard } from "@/components/shared";
import type { CommissionFormData } from "@/components/commission/CommissionForm";
import type { CommissionTotals } from "@/components/commission/commissionCalc";

// The commission cost fields surfaced on the quote page (mirrors the Commission
// page's Additional Costs inputs; all are real CommissionFormData fields).
const COST_FIELDS: { key: keyof CommissionFormData; label: string }[] = [
  { key: "shippingCosts", label: "Shipping" },
  { key: "setupCost", label: "Setup" },
  { key: "deliveryCost", label: "Delivery" },
  { key: "connectivity", label: "Networking" },
  { key: "equipmentRemoval", label: "Equipment Removal" },
  { key: "otherSalesFees", label: "Other Sales Fees" },
];

interface QuoteAdditionalCostsProps {
  commissionData: CommissionFormData;
  totals: CommissionTotals;
  onCostChange: (field: keyof CommissionFormData, value: number | string) => void;
}

const money = (n: number) =>
  `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function QuoteAdditionalCosts({ commissionData, totals, onCostChange }: QuoteAdditionalCostsProps) {
  const negative = totals.isNegativeCommission;
  const costsSubtotal = COST_FIELDS.reduce((sum, { key }) => sum + ((commissionData[key] as number) || 0), 0);

  return (
    <SectionCard
      title="Additional Costs"
      icon={DollarSign}
      description="Shipping, setup and other deal costs. Feeds the commission worksheet — not shown on the customer quote."
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {COST_FIELDS.map(({ key, label }) => (
          <div key={String(key)} className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <CurrencyInput
              value={(commissionData[key] as number) || 0}
              onChange={(v) => onCostChange(key, v)}
              prefix
              className="h-8 text-sm text-right"
            />
          </div>
        ))}
      </div>

      {/* Free-text fee description + running subtotal of the cost fields */}
      <div className="mt-3 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Fee Description</Label>
          <Input
            value={commissionData.feeDescription || ""}
            onChange={(e) => onCostChange("feeDescription", e.target.value)}
            placeholder="e.g. self-install, used equipment"
            className="h-8 text-sm"
          />
        </div>
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 md:min-w-[160px]">
          <div className="eyebrow leading-none text-muted-foreground">Additional Costs Subtotal</div>
          <div className="text-sm font-bold tabular-nums leading-tight mt-1 text-qbs-navy">{money(costsSubtotal)}</div>
        </div>
      </div>

      {/* Commission summary strip */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Total Sell", value: money(totals.netEquipRev) },
          { label: "Total Cost", value: money(totals.totalRepCostWithCosts) },
          { label: "Profit", value: money(totals.equipmentAGP) },
          { label: "Commission", value: money(totals.totalCommission), highlight: true },
        ].map((m) => (
          <div
            key={m.label}
            className={`rounded-lg border px-3 py-2 ${
              m.highlight && negative ? "border-destructive bg-destructive/5" : "border-border bg-muted/40"
            }`}
          >
            <div className="eyebrow leading-none text-muted-foreground">{m.label}</div>
            <div
              className={`text-sm font-bold tabular-nums leading-tight mt-1 ${
                m.highlight && negative ? "text-destructive" : "text-qbs-navy"
              }`}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {negative && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Commission is negative — costs exceed the deal margin.</span>
        </div>
      )}
    </SectionCard>
  );
}
