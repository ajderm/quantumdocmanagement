import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface LeaseReturnEquipmentItem {
  id: string;
  make: string;
  model: string;
  serial: string;
}

export interface LeaseReturnFormData {
  // Amount field (from Quote Total Buyout, with override option)
  amount: string;
  amountOverridden: boolean;
  
  // Customer name (from FMV Lease companyLegalName, with override option)
  customerName: string;
  
  // Lease details
  leaseNumber: string;
  leaseEndDate: Date | null;
  leaseCompany: string;
  
  // Equipment table (up to 20 items)
  equipment: LeaseReturnEquipmentItem[];
  
  // Signature fields
  customerSignatureDate: Date | null;
  customerPrintedName: string;
  customerTitle: string;
  dealerRepresentative: string;
  dealerSignatureDate: Date | null;
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

  // Initialize form data
  useEffect(() => {
    if (hasInitializedRef.current) return;

    // Calculate Total Buyout from Quote
    const calculateTotalBuyout = (): string => {
      if (!quoteFormData) return "";
      const paymentAmount = quoteFormData.paymentAmount || 0;
      const paymentsRemaining = quoteFormData.paymentsRemaining || 0;
      const earlyTerminationFee = quoteFormData.earlyTerminationFee || 0;
      const returnShipping = quoteFormData.returnShipping || 0;
      const total = (paymentAmount * paymentsRemaining) + earlyTerminationFee + returnShipping;
      return total > 0 ? total.toFixed(2) : "";
    };

    // Get customer name from FMV Lease or fall back to company name
    const getCustomerName = (): string => {
      if (fmvLeaseFormData?.companyLegalName) return fmvLeaseFormData.companyLegalName;
      if (company?.name) return company.name;
      return "";
    };

    // Get dealer rep name
    const getDealerRep = (): string => {
      if (dealOwner) {
        return `${dealOwner.firstName || ""} ${dealOwner.lastName || ""}`.trim();
      }
      return "";
    };

    // Create default empty equipment rows
    const createDefaultEquipment = (): LeaseReturnEquipmentItem[] => {
      return Array.from({ length: DEFAULT_EQUIPMENT_ROWS }, (_, i) => ({
        id: `equip-${Date.now()}-${i}`,
        make: "",
        model: "",
        serial: "",
      }));
    };

    if (savedConfig) {
      // Merge saved config with fresh data
      setFormData({
        ...savedConfig,
        // Only update amount if not manually overridden
        amount: savedConfig.amountOverridden ? savedConfig.amount : (calculateTotalBuyout() || savedConfig.amount),
        // Dealer rep should stay fresh
        dealerRepresentative: savedConfig.dealerRepresentative || getDealerRep(),
        // Ensure equipment has at least default rows
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

  // Notify parent of changes
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

  const updateEquipmentItem = (
    index: number,
    field: keyof LeaseReturnEquipmentItem,
    value: string
  ) => {
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

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6">
      {/* Amount and Customer Name Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Letter Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              Check Amount
              {formData.amountOverridden && (
                <span className="text-xs text-muted-foreground ml-2">(overridden)</span>
              )}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Pre-filled from Quote Total Buyout
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => updateField("customerName", e.target.value)}
              placeholder="Company legal name"
            />
            <p className="text-xs text-muted-foreground">
              Pre-filled from FMV Lease
            </p>
          </div>
        </div>
      </div>

      {/* Lease Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Lease Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="leaseNumber">Lease Number</Label>
            <Input
              id="leaseNumber"
              value={formData.leaseNumber}
              onChange={(e) => updateField("leaseNumber", e.target.value)}
              placeholder="e.g., ABC-12345"
            />
          </div>

          <div className="space-y-2">
            <Label>Lease End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.leaseEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.leaseEndDate
                    ? format(formData.leaseEndDate, "MM/dd/yyyy")
                    : "Select date"}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="leaseCompany">Lease Company</Label>
            <Input
              id="leaseCompany"
              value={formData.leaseCompany}
              onChange={(e) => updateField("leaseCompany", e.target.value)}
              placeholder="Leasing company name"
            />
          </div>
        </div>
      </div>

      {/* Equipment Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">
            Equipment ({formData.equipment.length}/{MAX_EQUIPMENT_ROWS})
          </h3>
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
        </div>

        <div className="space-y-2">
          {/* Header row */}
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
                  onChange={(e) =>
                    updateEquipmentItem(index, "make", e.target.value)
                  }
                  placeholder="Make"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-4">
                <Input
                  value={item.model}
                  onChange={(e) =>
                    updateEquipmentItem(index, "model", e.target.value)
                  }
                  placeholder="Model"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-4">
                <Input
                  value={item.serial}
                  onChange={(e) =>
                    updateEquipmentItem(index, "serial", e.target.value)
                  }
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
        </div>
      </div>

    </div>
  );
}
