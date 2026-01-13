import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface LoiFormData {
  // Document Info
  date: Date | null;

  // Lease Company Information
  leaseExpirationDate: Date | null;
  sixtyDayLetterDue: Date | null;
  leaseNumber: string;
  leaseVendor: string;
  leaseAddress: string;
  leaseCityState: string;
  leaseZip: string;

  // Customer Information
  businessName: string;
  customerAddress: string;
  customerCityState: string;
  customerZip: string;
  customerContact: string;
  customerEmail: string;
  customerPhone: string;
  assetModel: string;
  assetSerial: string;

  // Termination Letter Details
  contractNumber: string;
  returnInstructionsEmail: string;

  // Signature
  signerName: string;
  signerTitle: string;
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
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  apAddress?: string;
  apCity?: string;
  apState?: string;
  apZip?: string;
}

interface DealOwner {
  firstName?: string;
  lastName?: string;
}

interface LabeledContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface LabeledContacts {
  shippingContact: LabeledContact | null;
  apContact: LabeledContact | null;
  itContact: LabeledContact | null;
}

interface FMVLeaseFormData {
  companyLegalName?: string;
  phone?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  termInMonths?: string;
  paymentAmount?: string;
}

interface LoiFormProps {
  company: Company | null;
  lineItems: LineItem[];
  dealOwner: DealOwner | null;
  labeledContacts: LabeledContacts | null;
  fmvLeaseFormData: FMVLeaseFormData | null;
  portalId?: string;
  onFormChange: (data: LoiFormData) => void;
  savedConfig?: LoiFormData;
}

export function LoiForm({
  company,
  lineItems,
  dealOwner,
  labeledContacts,
  fmvLeaseFormData,
  portalId,
  onFormChange,
  savedConfig,
}: LoiFormProps) {
  const hasInitializedRef = useRef(false);

  const createInitialFormData = (): LoiFormData => {
    const today = new Date();
    const primaryContact = labeledContacts?.shippingContact || labeledContacts?.apContact;
    const firstLineItem = lineItems?.[0];

    // Build customer city, state from available data
    const city = fmvLeaseFormData?.billingCity || company?.apCity || company?.deliveryCity || "";
    const state = fmvLeaseFormData?.billingState || company?.apState || company?.deliveryState || "";
    const customerCityState = [city, state].filter(Boolean).join(", ");

    return {
      date: today,

      // Lease Company Information - mostly empty, user fills in
      leaseExpirationDate: null,
      sixtyDayLetterDue: null,
      leaseNumber: "",
      leaseVendor: "",
      leaseAddress: "",
      leaseCityState: "",
      leaseZip: "",

      // Customer Information - pre-populate from HubSpot/other forms
      businessName: fmvLeaseFormData?.companyLegalName || company?.name || "",
      customerAddress: fmvLeaseFormData?.billingAddress || company?.apAddress || company?.deliveryAddress || "",
      customerCityState,
      customerZip: fmvLeaseFormData?.billingZip || company?.apZip || company?.deliveryZip || "",
      customerContact: primaryContact ? `${primaryContact.firstName || ""} ${primaryContact.lastName || ""}`.trim() : "",
      customerEmail: primaryContact?.email || "",
      customerPhone: fmvLeaseFormData?.phone || primaryContact?.phone || company?.phone || "",
      assetModel: firstLineItem?.model || firstLineItem?.name || "",
      assetSerial: firstLineItem?.serial || "",

      // Termination Details - contract number often same as lease number
      contractNumber: "",
      returnInstructionsEmail: primaryContact?.email || "",

      // Signature - dealer rep info
      signerName: dealOwner ? `${dealOwner.firstName || ""} ${dealOwner.lastName || ""}`.trim() : "",
      signerTitle: "Sales Representative",
    };
  };

  const [formData, setFormData] = useState<LoiFormData>(() => createInitialFormData());

  // Initialize from saved config or create new
  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (savedConfig) {
      // Restore dates from ISO strings
      const restored: LoiFormData = {
        ...savedConfig,
        date: savedConfig.date ? new Date(savedConfig.date) : null,
        leaseExpirationDate: savedConfig.leaseExpirationDate ? new Date(savedConfig.leaseExpirationDate) : null,
        sixtyDayLetterDue: savedConfig.sixtyDayLetterDue ? new Date(savedConfig.sixtyDayLetterDue) : null,
      };
      setFormData(restored);
      onFormChange(restored);
      hasInitializedRef.current = true;
      return;
    }

    const initial = createInitialFormData();
    setFormData(initial);
    onFormChange(initial);
    hasInitializedRef.current = true;
  }, [savedConfig, company, lineItems, dealOwner, labeledContacts, fmvLeaseFormData]);

  // Notify parent on form changes
  useEffect(() => {
    if (hasInitializedRef.current) {
      onFormChange(formData);
    }
  }, [formData, onFormChange]);

  const updateField = <K extends keyof LoiFormData>(field: K, value: LoiFormData[K]) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate 60 Day Letter Due when Lease Expiration Date changes
      if (field === "leaseExpirationDate" && value instanceof Date) {
        updated.sixtyDayLetterDue = subDays(value, 60);
      }

      // Auto-sync contract number with lease number if contract number is empty
      if (field === "leaseNumber" && !prev.contractNumber) {
        updated.contractNumber = value as string;
      }

      return updated;
    });
  };

  return (
    <div className="space-y-4">
      {/* Letter Details */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Letter Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full md:w-[240px] justify-start text-left font-normal", !formData.date && "text-muted-foreground")}
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
        </CardContent>
      </Card>

      {/* Lease Company Information */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Lease Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lease Expiration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !formData.leaseExpirationDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.leaseExpirationDate ? format(formData.leaseExpirationDate, "MM/dd/yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.leaseExpirationDate || undefined}
                    onSelect={(date) => updateField("leaseExpirationDate", date || null)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>60 Day Letter Due</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !formData.sixtyDayLetterDue && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.sixtyDayLetterDue ? format(formData.sixtyDayLetterDue, "MM/dd/yyyy") : "Auto-calculated"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.sixtyDayLetterDue || undefined}
                    onSelect={(date) => updateField("sixtyDayLetterDue", date || null)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Auto-calculated: 60 days before expiration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leaseNumber">Lease Number</Label>
              <Input
                id="leaseNumber"
                value={formData.leaseNumber}
                onChange={(e) => updateField("leaseNumber", e.target.value)}
                placeholder="Enter lease number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leaseVendor">Lease Vendor</Label>
              <Input
                id="leaseVendor"
                value={formData.leaseVendor}
                onChange={(e) => updateField("leaseVendor", e.target.value)}
                placeholder="Enter lease vendor name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leaseAddress">Lease Address</Label>
            <Input
              id="leaseAddress"
              value={formData.leaseAddress}
              onChange={(e) => updateField("leaseAddress", e.target.value)}
              placeholder="Enter lease company address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leaseCityState">City, State</Label>
              <Input
                id="leaseCityState"
                value={formData.leaseCityState}
                onChange={(e) => updateField("leaseCityState", e.target.value)}
                placeholder="City, State"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leaseZip">Zip</Label>
              <Input
                id="leaseZip"
                value={formData.leaseZip}
                onChange={(e) => updateField("leaseZip", e.target.value)}
                placeholder="ZIP Code"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerAddress">Address</Label>
            <Input
              id="customerAddress"
              value={formData.customerAddress}
              onChange={(e) => updateField("customerAddress", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerCityState">City, State</Label>
              <Input
                id="customerCityState"
                value={formData.customerCityState}
                onChange={(e) => updateField("customerCityState", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerZip">Zip</Label>
              <Input
                id="customerZip"
                value={formData.customerZip}
                onChange={(e) => updateField("customerZip", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerContact">Contact</Label>
              <Input
                id="customerContact"
                value={formData.customerContact}
                onChange={(e) => updateField("customerContact", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => updateField("customerEmail", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => updateField("customerPhone", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assetModel">Asset Model</Label>
              <Input
                id="assetModel"
                value={formData.assetModel}
                onChange={(e) => updateField("assetModel", e.target.value)}
                placeholder="Equipment model"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetSerial">Asset Serial</Label>
              <Input
                id="assetSerial"
                value={formData.assetSerial}
                onChange={(e) => updateField("assetSerial", e.target.value)}
                placeholder="Serial number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Termination Details */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Termination Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contractNumber">Contract Number</Label>
            <Input
              id="contractNumber"
              value={formData.contractNumber}
              onChange={(e) => updateField("contractNumber", e.target.value)}
              placeholder="Contract # to terminate"
            />
            <p className="text-xs text-muted-foreground">This is used in the termination request text</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnInstructionsEmail">Return Instructions Email</Label>
            <Input
              id="returnInstructionsEmail"
              type="email"
              value={formData.returnInstructionsEmail}
              onChange={(e) => updateField("returnInstructionsEmail", e.target.value)}
              placeholder="Email for return instructions"
            />
            <p className="text-xs text-muted-foreground">Where the leasing company should send return instructions</p>
          </div>
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signerName">Name</Label>
              <Input
                id="signerName"
                value={formData.signerName}
                onChange={(e) => updateField("signerName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signerTitle">Title</Label>
              <Input
                id="signerTitle"
                value={formData.signerTitle}
                onChange={(e) => updateField("signerTitle", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
