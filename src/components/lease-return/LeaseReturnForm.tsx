import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Plus, Trash2, FileText, FileSignature, Package } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SectionCard, FieldGrid, Field } from "@/components/shared";

export interface LeaseReturnEquipmentItem {
  id: string;
  make: string;
  model: string;
  serial: string;
}

export interface LeaseReturnFormData {
  amount: string;
  amountOverridden: boolean;
  customerName: string;
  leaseNumber: string;
  leaseEndDate: Date | null;
  leaseCompany: string;
  equipment: LeaseReturnEquipmentItem[];
  customerSignatureDate: Date | null;
  customerPrintedName: string;
  customerTitle: string;
  dealerRepresentative: string;
  dealerSignatureDate: Date | null;
  termsInclude?: boolean;
  termsTemplateId?: string;
  termsCustomText?: string;
}

interface Deal {
  hsObjectId?: string;
  dealName?: string;
}

interface Company {
  name?: string;
}

interface DealOwner {
  firstName?: string;
  lastName?: string;
}

interface QuoteFormData {
  paymentAmount?: number;
  paymentsRemaining?: number;
  earlyTerminationFee?: number;
  returnShipping?: number;
}

interface FMVLeaseFormData {
  companyLegalName?: string;
}

interface LeaseReturnFormProps {
  deal: Deal | null;
  company: Company | null;
  dealOwner: DealOwner | null;
  quoteFormData: QuoteFormData | null;
  fmvLeaseFormData: FMVLeaseFormData | null;
  portalId?: string;
  onFormChange: (data: LeaseReturnFormData) => void;
  savedConfig: LeaseReturnFormData | null;
}

const MAX_EQUIPMENT_ROWS = 20;
const DEFAULT_EQUIPMENT_ROWS = 4;

export function LeaseReturnForm({
  deal,
  company,
  dealOwner,
  quoteFormData,
  fmvLeaseFormData,
  onFormChange,
  savedConfig,
}: LeaseReturnFormProps) {
  const hasInitializedRef = useRef(false);

  const [formData, setFormData] = useState<LeaseReturnFormData>({
    amount: "",
    amountOverridden: false,
    customerName: "",
    leaseNumber: "",
    leaseEndDate: null,
    leaseCompany: "",
    equipment: [],
    customerSignatureDate: null,
    customerPrintedName: "",
    customerTitle: "",
    dealerRepresentative: "",
    dealerSignatureDate: null,
  });

  useEffect(() => {
    if (hasInitializedRef.current) return;

    const calculateTotalBuyout = (): string => {
      if (!quoteFormData) return "";
      const paymentAmount = quoteFormData.paymentAmount || 0;
      const paymentsRemaining = quoteFormData.paymentsRemaining || 0;
      const earlyTerminationFee = quoteFormData.earlyTerminationFee || 0;
      const returnShipping = quoteFormData.returnShipping || 0;
      const total = paymentAmount * paymentsRemaining + earlyTerminationFee + returnShipping;
      return total > 0 ? total.toFixed(2) : "";
    };

    const getCustomerName = (): string => {
      if (fmvLeaseFormData?.companyLegalName) return fmvLeaseFormData.companyLegalName;
      if (company?.name) return company.name;
      return "";
    };

    const getDealerRep = (): string => {
      if (dealOwner) {
        return `${dealOwner.firstName || ""} ${dealOwner.lastName || ""}`.trim();
      }
      return "";
    };

    const createDefaultEquipment = (): LeaseReturnEquipmentItem[] => {
      return Array.from({ length: DEFAULT_EQUIPMENT_ROWS }, (_, i) => ({
        id: `equip-${Date.now()}-${i}`,
        make: "",
        model: "",
        serial: "",
      }));
    };

    if (savedConfig) {
      setFormData({
        ...savedConfig,
        amount: savedConfig.amountOverridden ? savedConfig.amount : calculateTotalBuyout() || savedConfig.amount,
        dealerRepresentative: savedConfig.dealerRepresentative || getDealerRep(),
        equipment: savedConfig.equipment?.length > 0 ? savedConfig.equipment : createDefaultEquipment(),
      });
    } else {
      setFormData({
        amount: calculateTotalBuyout(),
        amountOverridden: false,
        customerName: getCustomerName(),
        leaseNumber: "",
        leaseEndDate: null,
        leaseCompany: "",
        equipment: createDefaultEquipment(),
        customerSignatureDate: null,
        customerPrintedName: "",
        customerTitle: "",
        dealerRepresentative: getDealerRep(),
        dealerSignatureDate: null,
      });
    }

    hasInitializedRef.current = true;
  }, [savedConfig, quoteFormData, fmvLeaseFormData, company, dealOwner]);

  useEffect(() => {
    onFormChange(formData);
  }, [formData, onFormChange]);

  const updateField = (field: keyof LeaseReturnFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAmountChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      amount: value,
      amountOverridden: true,
    }));
  };

  const updateEquipmentItem = (index: number, field: keyof LeaseReturnEquipmentItem, value: string) => {
    const newEquipment = [...formData.equipment];
    newEquipment[index] = { ...newEquipment[index], [field]: value };
    setFormData((prev) => ({ ...prev, equipment: newEquipment }));
  };

  const addEquipmentRow = () => {
    if (formData.equipment.length >= MAX_EQUIPMENT_ROWS) return;
    setFormData((prev) => ({
      ...prev,
      equipment: [
        ...prev.equipment,
        {
          id: `equip-${Date.now()}`,
          make: "",
          model: "",
          serial: "",
        },
      ],
    }));
  };

  const removeEquipmentRow = (index: number) => {
    if (formData.equipment.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Letter Details */}
      <SectionCard
        title="Letter Details"
        icon={FileText}
        description="Check amount and customer, pre-filled from the Quote and FMV Lease"
      >
        <FieldGrid columns={2}>
          <Field label="Check Amount" hint="Pre-filled from Quote Total Buyout">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-7 h-9 text-sm"
                placeholder="0.00"
              />
            </div>
          </Field>
          <Field label="Customer Name" hint="Pre-filled from FMV Lease">
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => updateField("customerName", e.target.value)}
              className="h-9 text-sm"
              placeholder="Company legal name"
            />
          </Field>
        </FieldGrid>
        {formData.amountOverridden && (
          <p className="text-xs text-muted-foreground mt-2">Check amount was overridden manually.</p>
        )}
      </SectionCard>

      {/* Lease Information */}
      <SectionCard title="Lease Information" icon={FileSignature} description="Lease identifiers and end date">
        <FieldGrid columns={3}>
          <Field label="Lease Number">
            <Input
              id="leaseNumber"
              value={formData.leaseNumber}
              onChange={(e) => updateField("leaseNumber", e.target.value)}
              className="h-9 text-sm"
              placeholder="e.g., ABC-12345"
            />
          </Field>
          <Field label="Lease End Date">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-9 justify-start text-left font-normal",
                    !formData.leaseEndDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.leaseEndDate ? format(formData.leaseEndDate, "MM/dd/yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.leaseEndDate || undefined}
                  onSelect={(date) => updateField("leaseEndDate", date || null)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </Field>
          <Field label="Lease Company">
            <Input
              id="leaseCompany"
              value={formData.leaseCompany}
              onChange={(e) => updateField("leaseCompany", e.target.value)}
              className="h-9 text-sm"
              placeholder="Leasing company name"
            />
          </Field>
        </FieldGrid>
      </SectionCard>

      {/* Equipment */}
      <SectionCard
        title="Equipment"
        icon={Package}
        description="Devices being returned"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEquipmentRow}
            disabled={formData.equipment.length >= MAX_EQUIPMENT_ROWS}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
        }
      >
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
            <div className="col-span-3">Make</div>
            <div className="col-span-4">Model</div>
            <div className="col-span-4">Serial Number</div>
            <div className="col-span-1"></div>
          </div>
          {formData.equipment.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <Input
                  value={item.make}
                  onChange={(e) => updateEquipmentItem(index, "make", e.target.value)}
                  placeholder="Make"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-4">
                <Input
                  value={item.model}
                  onChange={(e) => updateEquipmentItem(index, "model", e.target.value)}
                  placeholder="Model"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-4">
                <Input
                  value={item.serial}
                  onChange={(e) => updateEquipmentItem(index, "serial", e.target.value)}
                  placeholder="Serial #"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEquipmentRow(index)}
                  disabled={formData.equipment.length <= 1}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground px-1">
            {formData.equipment.length}/{MAX_EQUIPMENT_ROWS} rows
          </p>
        </div>
      </SectionCard>

      {/* Terms & conditions (new; form capture only - the preview is intentionally unchanged) */}
      <SectionCard
        title="Terms &amp; conditions"
        icon={FileSignature}
        description="Captured with the document. Document rendering is wired in a later phase."
        action={
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-muted-foreground">Include on document</span>
            <Switch checked={!!formData.termsInclude} onCheckedChange={(c) => updateField("termsInclude", c)} />
          </label>
        }
      >
        <div className="space-y-3">
          <FieldGrid columns={2}>
            <Field label="Template" hint="Backend templates connect when Settings migrates to HubSpot">
              <Select
                value={formData.termsTemplateId || "custom"}
                onValueChange={(v) => updateField("termsTemplateId", v === "custom" ? "" : v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Custom text only" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom text only</SelectItem>
                  <SelectItem value="standard">Standard terms</SelectItem>
                  <SelectItem value="government">Government / public sector</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGrid>
          <Field label="Custom text">
            <Textarea
              value={formData.termsCustomText || ""}
              onChange={(e) => updateField("termsCustomText", e.target.value)}
              placeholder="Enter any document-specific terms and conditions..."
              className="text-sm min-h-[96px]"
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}
