import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export interface LeaseFundingFormData {
  // Selected line item (like Installation)
  selectedLineItemId: string;
  
  // Form fields
  date: Date | null;
  customerName: string;
  locationBranch: string;
  salesRepresentative: string;
  
  // Equipment Info
  equipmentMakeModel: string;
  idNumber: string;
  serialNumber: string;
  
  // Lease Details
  leaseVendor: string;
  leaseType: string;
  termLength: string;
  monthlyPayment: string;
  rate: string;
  invoiceFundingAmount: string;
  invoiceFundingAmountOverridden: boolean;
}

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
  category?: string;
  serial?: string;
  model?: string;
}

interface Deal {
  hsObjectId: string;
  dealName: string;
  stage: string;
  amount?: number;
}

interface Company {
  name?: string;
  deliveryAddress?: string;
  deliveryAddress2?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface DealOwner {
  firstName?: string;
  lastName?: string;
}

interface FMVLeaseFormData {
  companyLegalName?: string;
  equipmentAddress?: string;
  equipmentCity?: string;
  equipmentState?: string;
  equipmentZip?: string;
  termInMonths?: string;
  paymentAmount?: string;
}

interface LeaseFundingFormProps {
  deal: Deal | null;
  company: Company | null;
  lineItems: LineItem[];
  dealOwner: DealOwner | null;
  fmvLeaseFormData: FMVLeaseFormData | null;
  portalId?: string;
  onFormChange: (data: LeaseFundingFormData) => void;
  onLineItemSwitch: (newLineItemId: string, currentFormData: LeaseFundingFormData) => void;
  savedConfig?: LeaseFundingFormData;
}

interface ExpandedLineItem {
  id: string;
  originalItem: LineItem;
  instanceIndex: number;
  totalInstances: number;
  displayName: string;
}

const LEASE_TYPES = [
  { value: "FMV", label: "FMV" },
  { value: "$1-Out", label: "$1-Out" },
  { value: "Rental", label: "Rental" },
];

export function LeaseFundingForm({
  deal,
  company,
  lineItems,
  dealOwner,
  fmvLeaseFormData,
  portalId,
  onFormChange,
  onLineItemSwitch,
  savedConfig,
}: LeaseFundingFormProps) {
  const hasInitializedRef = useRef(false);
  const [leasingCompanies, setLeasingCompanies] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Create initial form data with defaults
  const createInitialFormData = (lineItemId?: string, lineItem?: LineItem): LeaseFundingFormData => {
    const buildAddress = (c: Company | null) => {
      if (!c) return "";
      const addr = c.deliveryAddress || c.address || "";
      const addr2 = c.deliveryAddress2 || c.address2 || "";
      const city = c.deliveryCity || c.city || "";
      const state = c.deliveryState || c.state || "";
      const zip = c.deliveryZip || c.zip || "";
      const parts = [addr, addr2].filter(Boolean).join(", ");
      const cityStateZip = [city, state, zip].filter(Boolean).join(", ");
      return [parts, cityStateZip].filter(Boolean).join(", ");
    };

    return {
      selectedLineItemId: lineItemId || "",
      date: new Date(),
      customerName: fmvLeaseFormData?.companyLegalName || company?.name || "",
      locationBranch: fmvLeaseFormData ? 
        [fmvLeaseFormData.equipmentAddress, fmvLeaseFormData.equipmentCity, fmvLeaseFormData.equipmentState, fmvLeaseFormData.equipmentZip].filter(Boolean).join(", ") :
        buildAddress(company),
      salesRepresentative: dealOwner ? `${dealOwner.firstName || ""} ${dealOwner.lastName || ""}`.trim() : "",
      equipmentMakeModel: lineItem ? `${lineItem.model || lineItem.name || ""} - ${lineItem.description || ""}`.trim().replace(/^-\s*/, "").replace(/\s*-$/, "") : "",
      idNumber: "",
      serialNumber: lineItem?.serial || "",
      leaseVendor: "",
      leaseType: "FMV",
      termLength: fmvLeaseFormData?.termInMonths || "",
      monthlyPayment: fmvLeaseFormData?.paymentAmount || "",
      rate: "",
      invoiceFundingAmount: "",
      invoiceFundingAmountOverridden: false,
    };
  };

  const [formData, setFormData] = useState<LeaseFundingFormData>(() => createInitialFormData());

  // Expand line items by quantity (like InstallationForm)
  const expandedLineItems = useMemo((): ExpandedLineItem[] => {
    const hardwareItems = lineItems.filter(
      (item) => item.category?.toLowerCase() === "hardware" || !item.category
    );

    const result: ExpandedLineItem[] = [];
    hardwareItems.forEach((item) => {
      const qty = Math.max(1, item.quantity || 1);
      for (let i = 0; i < qty; i++) {
        const displayName = qty > 1
          ? `${item.model || item.name || "Hardware"} (${i + 1} of ${qty})`
          : item.model || item.name || "Hardware";
        result.push({
          id: `${item.id}_${i}`,
          originalItem: item,
          instanceIndex: i,
          totalInstances: qty,
          displayName,
        });
      }
    });
    return result;
  }, [lineItems]);

  // Fetch leasing companies
  useEffect(() => {
    const fetchLeasingCompanies = async () => {
      if (!portalId) return;
      
      setLoadingCompanies(true);
      try {
        const { data, error } = await supabase.functions.invoke("get-rate-factors", {
          body: { portalId },
        });

        if (error) {
          console.error("Error fetching leasing companies:", error);
          return;
        }

        if (data?.leasingCompanies) {
          setLeasingCompanies(data.leasingCompanies);
        }
      } catch (err) {
        console.error("Failed to fetch leasing companies:", err);
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchLeasingCompanies();
  }, [portalId]);

  // Initialize form data
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!expandedLineItems.length) return;

    // If savedConfig matches current selection, use it
    if (savedConfig?.selectedLineItemId) {
      setFormData(savedConfig);
      onFormChange(savedConfig);
      hasInitializedRef.current = true;
      return;
    }

    // Otherwise, initialize with first line item
    const firstItem = expandedLineItems[0];
    const initial = createInitialFormData(firstItem.id, firstItem.originalItem);
    setFormData(initial);
    onFormChange(initial);
    hasInitializedRef.current = true;
  }, [savedConfig, expandedLineItems, fmvLeaseFormData, company, dealOwner]);

  // Update savedConfig when it changes (after loading from DB)
  useEffect(() => {
    if (savedConfig && savedConfig.selectedLineItemId === formData.selectedLineItemId) {
      if (JSON.stringify(savedConfig) !== JSON.stringify(formData)) {
        setFormData(savedConfig);
      }
    }
  }, [savedConfig]);

  // Auto-calculate invoice/funding amount when rate or monthlyPayment changes
  useEffect(() => {
    if (formData.invoiceFundingAmountOverridden) return;

    const payment = parseFloat(formData.monthlyPayment.replace(/[^0-9.]/g, "")) || 0;
    const rate = parseFloat(formData.rate) || 0;

    if (payment > 0 && rate > 0) {
      const calculated = payment / rate;
      setFormData(prev => ({
        ...prev,
        invoiceFundingAmount: calculated.toFixed(2),
      }));
    }
  }, [formData.monthlyPayment, formData.rate, formData.invoiceFundingAmountOverridden]);

  // Notify parent of changes
  useEffect(() => {
    if (hasInitializedRef.current) {
      onFormChange(formData);
    }
  }, [formData, onFormChange]);

  const updateField = (field: keyof LeaseFundingFormData, value: any) => {
    if (field === "invoiceFundingAmount") {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        invoiceFundingAmountOverridden: true,
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleLineItemChange = (newLineItemId: string) => {
    if (newLineItemId === formData.selectedLineItemId) return;

    // Save current before switching
    onLineItemSwitch(newLineItemId, formData);

    // Find the new item
    const newExpanded = expandedLineItems.find((item) => item.id === newLineItemId);
    if (!newExpanded) return;

    // Create fresh form data for the new item
    const newFormData = createInitialFormData(newLineItemId, newExpanded.originalItem);
    setFormData(newFormData);
  };

  return (
    <div className="space-y-6">
      {/* Hardware Item Selector */}
      {expandedLineItems.length > 0 && (
        <Card className="p-4 bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="lineItemSelect">Select Hardware Item</Label>
            <Select
              value={formData.selectedLineItemId}
              onValueChange={handleLineItemChange}
            >
              <SelectTrigger id="lineItemSelect">
                <SelectValue placeholder="Select a hardware item" />
              </SelectTrigger>
              <SelectContent>
                {expandedLineItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {/* Lease Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Lease Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "MM/dd/yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date || undefined}
                  onSelect={(date) => updateField("date", date || null)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salesRep">Sales Representative</Label>
            <Input
              id="salesRep"
              value={formData.salesRepresentative}
              onChange={(e) => updateField("salesRepresentative", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerName">Customer Name</Label>
          <Input
            id="customerName"
            value={formData.customerName}
            onChange={(e) => updateField("customerName", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationBranch">Location / Branch (Equipment)</Label>
          <Input
            id="locationBranch"
            value={formData.locationBranch}
            onChange={(e) => updateField("locationBranch", e.target.value)}
          />
        </div>
      </div>

      {/* Equipment Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Equipment</h3>
        
        <div className="space-y-2">
          <Label htmlFor="equipmentMakeModel">Equipment Make / Model</Label>
          <Input
            id="equipmentMakeModel"
            value={formData.equipmentMakeModel}
            onChange={(e) => updateField("equipmentMakeModel", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="idNumber">ID Number</Label>
            <Input
              id="idNumber"
              value={formData.idNumber}
              onChange={(e) => updateField("idNumber", e.target.value)}
              placeholder="Enter ID number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input
              id="serialNumber"
              value={formData.serialNumber}
              onChange={(e) => updateField("serialNumber", e.target.value)}
              placeholder="Enter serial number"
            />
          </div>
        </div>
      </div>

      {/* Lease Terms Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Lease Terms</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="leaseVendor">Lease Vendor</Label>
            <Select
              value={formData.leaseVendor}
              onValueChange={(value) => updateField("leaseVendor", value)}
            >
              <SelectTrigger id="leaseVendor">
                <SelectValue placeholder={loadingCompanies ? "Loading..." : "Select lease vendor"} />
              </SelectTrigger>
              <SelectContent>
                {leasingCompanies.length > 0 ? (
                  leasingCompanies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No vendors available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leaseType">Lease Type</Label>
            <Select
              value={formData.leaseType}
              onValueChange={(value) => updateField("leaseType", value)}
            >
              <SelectTrigger id="leaseType">
                <SelectValue placeholder="Select lease type" />
              </SelectTrigger>
              <SelectContent>
                {LEASE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="termLength">Term Length (Months)</Label>
            <Input
              id="termLength"
              type="number"
              value={formData.termLength}
              onChange={(e) => updateField("termLength", e.target.value)}
              placeholder="e.g., 36"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyPayment">Monthly Payment</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="monthlyPayment"
                value={formData.monthlyPayment}
                onChange={(e) => updateField("monthlyPayment", e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rate">Rate</Label>
            <Input
              id="rate"
              value={formData.rate}
              onChange={(e) => updateField("rate", e.target.value)}
              placeholder="0.00000"
            />
            <p className="text-xs text-muted-foreground">Enter the rate factor (e.g., 0.02834)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceFundingAmount">Invoice / Funding Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="invoiceFundingAmount"
                value={formData.invoiceFundingAmount}
                onChange={(e) => updateField("invoiceFundingAmount", e.target.value)}
                className="pl-7"
                placeholder="Auto-calculated"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.invoiceFundingAmountOverridden 
                ? "Manually entered" 
                : "Auto-calculated: Monthly Payment ÷ Rate"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

