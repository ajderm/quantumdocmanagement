import { useState, useEffect, useRef } from "react";
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

export interface FMVLeaseEquipmentItem {
  lineItemId: string;
  quantity: number;
  makeModelDescription: string;
  serialNumber: string;
  idNumber: string;
}

export interface FMVLeaseFormData {
  // Customer Information
  companyLegalName: string;
  phone: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  equipmentAddress: string;
  equipmentCity: string;
  equipmentState: string;
  equipmentZip: string;
  
  // Equipment Information (per line item)
  equipmentItems: FMVLeaseEquipmentItem[];
  
  // Payment Schedule
  termInMonths: string;
  paymentFrequency: string;
  firstPaymentDate: Date | null;
  paymentAmount: string;
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

interface Company {
  name?: string;
  phone?: string;
  // Ship To (Delivery) Address
  deliveryAddress?: string;
  deliveryAddress2?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  // Bill To (AP) Address
  apAddress?: string;
  apAddress2?: string;
  apCity?: string;
  apState?: string;
  apZip?: string;
  // Fallback address
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface ServiceAgreementFormData {
  contractLengthMonths?: string;
  effectiveDate?: Date | null;
}

interface QuoteFormData {
  serviceBaseRate?: number;
}

interface FMVLeaseFormProps {
  formData: FMVLeaseFormData;
  onChange: (data: FMVLeaseFormData) => void;
  company: Company | null;
  lineItems: LineItem[];
  savedConfig: FMVLeaseFormData | null;
  serviceAgreementFormData?: ServiceAgreementFormData | null;
  quoteFormData?: QuoteFormData | null;
}

const PAYMENT_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annually", label: "Semi-Annually" },
  { value: "annually", label: "Annually" },
];

export function FMVLeaseForm({
  formData,
  onChange,
  company,
  lineItems,
  savedConfig,
  serviceAgreementFormData,
  quoteFormData,
}: FMVLeaseFormProps) {
  const hasInitializedRef = useRef(false);

  // Initialize form data from saved config, company, and cross-document data
  useEffect(() => {
    if (hasInitializedRef.current) return;

    // Wait for company data
    if (!company && !savedConfig) return;

    const pick = (...vals: Array<string | undefined | null>) =>
      vals.map((v) => (v ?? "").trim()).find(Boolean) || "";

    const buildAddress = (line1?: string | null, line2?: string | null) => {
      const a1 = (line1 ?? "").trim();
      const a2 = (line2 ?? "").trim();
      if (!a1 && !a2) return "";
      if (a1 && a2) return `${a1}, ${a2}`;
      return a1 || a2;
    };

    const fillIfEmpty = (current: string, next: string) =>
      current?.trim() ? current : next;

    const base = savedConfig ? { ...formData, ...savedConfig } : { ...formData };

    // Equipment address from Ship To (delivery)
    const equipmentAddress =
      company &&
      pick(
        buildAddress(company.deliveryAddress, company.deliveryAddress2),
        buildAddress(company.address, company.address2)
      );
    const equipmentCity = company ? pick(company.deliveryCity, company.city) : "";
    const equipmentState = company ? pick(company.deliveryState, company.state) : "";
    const equipmentZip = company ? pick(company.deliveryZip, company.zip) : "";

    // Billing address from AP address
    const billingAddress =
      company &&
      pick(
        buildAddress(company.apAddress, company.apAddress2),
        buildAddress(company.address, company.address2)
      );
    const billingCity = company ? pick(company.apCity, company.city) : "";
    const billingState = company ? pick(company.apState, company.state) : "";
    const billingZip = company ? pick(company.apZip, company.zip) : "";

    // Initialize equipment items from line items
    const initialEquipmentItems: FMVLeaseEquipmentItem[] = lineItems.map((item) => {
      // Check if there's saved data for this item
      const savedItem = base.equipmentItems?.find((e) => e.lineItemId === item.id);
      return {
        lineItemId: item.id,
        quantity: item.quantity,
        makeModelDescription: `${item.model || item.name || ''} - ${item.description || ''}`.trim().replace(/^-\s*/, '').replace(/\s*-$/, ''),
        serialNumber: savedItem?.serialNumber || item.serial || "",
        idNumber: savedItem?.idNumber || "",
      };
    });

    // Get cross-document data
    const termFromServiceAgreement = serviceAgreementFormData?.contractLengthMonths || "";
    const effectiveDateFromServiceAgreement = serviceAgreementFormData?.effectiveDate || null;
    const baseRateFromQuote = quoteFormData?.serviceBaseRate ? String(quoteFormData.serviceBaseRate) : "";

    onChange({
      ...base,
      companyLegalName: fillIfEmpty(base.companyLegalName, company?.name || ""),
      phone: fillIfEmpty(base.phone, company?.phone || ""),
      
      // Billing address
      billingAddress: fillIfEmpty(base.billingAddress, billingAddress || ""),
      billingCity: fillIfEmpty(base.billingCity, billingCity),
      billingState: fillIfEmpty(base.billingState, billingState),
      billingZip: fillIfEmpty(base.billingZip, billingZip),
      
      // Equipment address (Ship To)
      equipmentAddress: fillIfEmpty(base.equipmentAddress, equipmentAddress || ""),
      equipmentCity: fillIfEmpty(base.equipmentCity, equipmentCity),
      equipmentState: fillIfEmpty(base.equipmentState, equipmentState),
      equipmentZip: fillIfEmpty(base.equipmentZip, equipmentZip),
      
      // Equipment items
      equipmentItems: base.equipmentItems?.length > 0 ? base.equipmentItems : initialEquipmentItems,
      
      // Payment schedule - pull from other documents
      termInMonths: fillIfEmpty(base.termInMonths, termFromServiceAgreement),
      paymentFrequency: base.paymentFrequency || "monthly",
      firstPaymentDate: base.firstPaymentDate || effectiveDateFromServiceAgreement,
      paymentAmount: fillIfEmpty(base.paymentAmount, baseRateFromQuote),
    });

    hasInitializedRef.current = true;
  }, [savedConfig, company, lineItems, serviceAgreementFormData, quoteFormData]);

  const updateField = (field: keyof FMVLeaseFormData, value: any) => {
    onChange({ ...formData, [field]: value });
  };

  const updateEquipmentItem = (index: number, field: keyof FMVLeaseEquipmentItem, value: string | number) => {
    const newItems = [...formData.equipmentItems];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...formData, equipmentItems: newItems });
  };

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-8">
      {/* Customer Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Customer Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyLegalName">Company Legal Name</Label>
            <Input
              id="companyLegalName"
              value={formData.companyLegalName}
              onChange={(e) => updateField("companyLegalName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>
        </div>

        {/* Billing Address */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Billing Address</h4>
          <div className="space-y-2">
            <Label htmlFor="billingAddress">Address</Label>
            <Input
              id="billingAddress"
              value={formData.billingAddress}
              onChange={(e) => updateField("billingAddress", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="billingCity">City</Label>
              <Input
                id="billingCity"
                value={formData.billingCity}
                onChange={(e) => updateField("billingCity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingState">State</Label>
              <Input
                id="billingState"
                value={formData.billingState}
                onChange={(e) => updateField("billingState", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingZip">Zip</Label>
              <Input
                id="billingZip"
                value={formData.billingZip}
                onChange={(e) => updateField("billingZip", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Equipment Address */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Equipment Address (Ship To)</h4>
          <div className="space-y-2">
            <Label htmlFor="equipmentAddress">Address</Label>
            <Input
              id="equipmentAddress"
              value={formData.equipmentAddress}
              onChange={(e) => updateField("equipmentAddress", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="equipmentCity">City</Label>
              <Input
                id="equipmentCity"
                value={formData.equipmentCity}
                onChange={(e) => updateField("equipmentCity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipmentState">State</Label>
              <Input
                id="equipmentState"
                value={formData.equipmentState}
                onChange={(e) => updateField("equipmentState", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipmentZip">Zip</Label>
              <Input
                id="equipmentZip"
                value={formData.equipmentZip}
                onChange={(e) => updateField("equipmentZip", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Equipment Information</h3>
        
        {formData.equipmentItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items available</p>
        ) : (
          <div className="space-y-3">
            {formData.equipmentItems.map((item, index) => (
              <div key={item.lineItemId} className="border rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateEquipmentItem(index, "quantity", parseInt(e.target.value) || 1)}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                  <div className="col-span-11">
                    <Label className="text-xs">Make/Model/Description</Label>
                    <Input
                      value={item.makeModelDescription}
                      onChange={(e) => updateEquipmentItem(index, "makeModelDescription", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Serial Number</Label>
                    <Input
                      value={item.serialNumber}
                      onChange={(e) => updateEquipmentItem(index, "serialNumber", e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Enter serial number"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">ID Number</Label>
                    <Input
                      value={item.idNumber}
                      onChange={(e) => updateEquipmentItem(index, "idNumber", e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Enter ID number"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Schedule Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Payment Schedule</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="termInMonths">Term in Months</Label>
            <Input
              id="termInMonths"
              type="number"
              value={formData.termInMonths}
              onChange={(e) => updateField("termInMonths", e.target.value)}
              placeholder="e.g., 36"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentFrequency">Payment Frequency</Label>
            <Select
              value={formData.paymentFrequency}
              onValueChange={(value) => updateField("paymentFrequency", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.firstPaymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.firstPaymentDate
                    ? format(formData.firstPaymentDate, "MM/dd/yyyy")
                    : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.firstPaymentDate || undefined}
                  onSelect={(date) => updateField("firstPaymentDate", date || null)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="paymentAmount"
                value={formData.paymentAmount}
                onChange={(e) => updateField("paymentAmount", e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
