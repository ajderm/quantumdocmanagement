import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Plus, Trash2, Upload } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export interface EquipmentItem {
  model: string;
  serial: string;
}

export interface LoiFormData {
  // Customer Company Header (for document output)
  customerLogoUrl: string;
  customerCompanyName: string;
  customerHeaderAddress: string;
  customerHeaderAddress2: string;
  customerHeaderCity: string;
  customerHeaderState: string;
  customerHeaderZip: string;
  customerHeaderPhone: string;
  customerHeaderWebsite: string;

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

  // Equipment Being Returned
  equipment: EquipmentItem[];
  hasAdditionalEquipment: boolean;

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
  website?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  apAddress?: string;
  apCity?: string;
  apState?: string;
  apZip?: string;
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
  dealOwner: { firstName?: string; lastName?: string } | null;
  labeledContacts: LabeledContacts | null;
  fmvLeaseFormData: FMVLeaseFormData | null;
  portalId?: string;
  onFormChange: (data: LoiFormData) => void;
  savedConfig?: LoiFormData;
}

const MAX_EQUIPMENT_ROWS = 10;

export function LoiForm({
  company,
  lineItems,
  labeledContacts,
  fmvLeaseFormData,
  onFormChange,
  savedConfig,
}: LoiFormProps) {
  const hasInitializedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createInitialFormData = (): LoiFormData => {
    const today = new Date();
    const primaryContact = labeledContacts?.shippingContact || labeledContacts?.apContact;

    // Build customer city, state from available data
    const city = fmvLeaseFormData?.billingCity || company?.apCity || company?.deliveryCity || "";
    const state = fmvLeaseFormData?.billingState || company?.apState || company?.deliveryState || "";
    const customerCityState = [city, state].filter(Boolean).join(", ");

    // Build equipment array from line items (take first few)
    const equipmentFromLineItems: EquipmentItem[] = lineItems
      .slice(0, MAX_EQUIPMENT_ROWS)
      .map((item) => ({
        model: item.model || item.name || "",
        serial: item.serial || "",
      }))
      .filter((e) => e.model || e.serial);

    // Ensure at least one empty row if no equipment
    const initialEquipment = equipmentFromLineItems.length > 0 
      ? equipmentFromLineItems 
      : [{ model: "", serial: "" }];

    return {
      // Customer Company Header - pre-populate from Ship To address
      customerLogoUrl: "",
      customerCompanyName: company?.name || "",
      customerHeaderAddress: company?.deliveryAddress || "",
      customerHeaderAddress2: "",
      customerHeaderCity: company?.deliveryCity || "",
      customerHeaderState: company?.deliveryState || "",
      customerHeaderZip: company?.deliveryZip || "",
      customerHeaderPhone: company?.phone || "",
      customerHeaderWebsite: company?.website || "",

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

      // Equipment
      equipment: initialEquipment,
      hasAdditionalEquipment: false,

      // Termination Details - contract number often same as lease number
      contractNumber: "",
      returnInstructionsEmail: primaryContact?.email || "",

      // Signature - blank, customer fills this out
      signerName: "",
      signerTitle: "",
    };
  };

  const [formData, setFormData] = useState<LoiFormData>(() => createInitialFormData());

  // Initialize from saved config or create new
  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (savedConfig) {
      // Restore dates from ISO strings and ensure equipment array exists
      const restored: LoiFormData = {
        ...savedConfig,
        date: savedConfig.date ? new Date(savedConfig.date) : null,
        leaseExpirationDate: savedConfig.leaseExpirationDate ? new Date(savedConfig.leaseExpirationDate) : null,
        sixtyDayLetterDue: savedConfig.sixtyDayLetterDue ? new Date(savedConfig.sixtyDayLetterDue) : null,
        equipment: savedConfig.equipment || [{ model: "", serial: "" }],
        hasAdditionalEquipment: savedConfig.hasAdditionalEquipment || false,
        customerLogoUrl: savedConfig.customerLogoUrl || "",
        customerCompanyName: savedConfig.customerCompanyName || "",
        customerHeaderAddress: savedConfig.customerHeaderAddress || "",
        customerHeaderAddress2: savedConfig.customerHeaderAddress2 || "",
        customerHeaderCity: savedConfig.customerHeaderCity || "",
        customerHeaderState: savedConfig.customerHeaderState || "",
        customerHeaderZip: savedConfig.customerHeaderZip || "",
        customerHeaderPhone: savedConfig.customerHeaderPhone || "",
        customerHeaderWebsite: savedConfig.customerHeaderWebsite || "",
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
  }, [savedConfig, company, lineItems, labeledContacts, fmvLeaseFormData]);

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

  const updateEquipment = (index: number, field: keyof EquipmentItem, value: string) => {
    setFormData((prev) => {
      const newEquipment = [...prev.equipment];
      newEquipment[index] = { ...newEquipment[index], [field]: value };
      return { ...prev, equipment: newEquipment };
    });
  };

  const addEquipmentRow = () => {
    if (formData.equipment.length < MAX_EQUIPMENT_ROWS) {
      setFormData((prev) => ({
        ...prev,
        equipment: [...prev.equipment, { model: "", serial: "" }],
      }));
    }
  };

  const removeEquipmentRow = (index: number) => {
    if (formData.equipment.length > 1) {
      setFormData((prev) => ({
        ...prev,
        equipment: prev.equipment.filter((_, i) => i !== index),
      }));
    }
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField("customerLogoUrl", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Customer Company Header - for document output */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Customer Company Header</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground mb-2">
            This information appears in the document header. Pre-populated from HubSpot Ship To address.
          </p>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {formData.customerLogoUrl ? (
                <div className="relative">
                  <img
                    src={formData.customerLogoUrl}
                    alt="Customer Logo"
                    className="h-16 object-contain border rounded p-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    onClick={() => updateField("customerLogoUrl", "")}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerCompanyName">Company Name</Label>
            <Input
              id="customerCompanyName"
              value={formData.customerCompanyName}
              onChange={(e) => updateField("customerCompanyName", e.target.value)}
              placeholder="Customer company name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerHeaderAddress">Address Line 1</Label>
              <Input
                id="customerHeaderAddress"
                value={formData.customerHeaderAddress}
                onChange={(e) => updateField("customerHeaderAddress", e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerHeaderAddress2">Address Line 2</Label>
              <Input
                id="customerHeaderAddress2"
                value={formData.customerHeaderAddress2}
                onChange={(e) => updateField("customerHeaderAddress2", e.target.value)}
                placeholder="Suite, unit, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerHeaderCity">City</Label>
              <Input
                id="customerHeaderCity"
                value={formData.customerHeaderCity}
                onChange={(e) => updateField("customerHeaderCity", e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerHeaderState">State</Label>
              <Input
                id="customerHeaderState"
                value={formData.customerHeaderState}
                onChange={(e) => updateField("customerHeaderState", e.target.value)}
                placeholder="State"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerHeaderZip">Zip</Label>
              <Input
                id="customerHeaderZip"
                value={formData.customerHeaderZip}
                onChange={(e) => updateField("customerHeaderZip", e.target.value)}
                placeholder="ZIP Code"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerHeaderPhone">Phone (optional)</Label>
              <Input
                id="customerHeaderPhone"
                value={formData.customerHeaderPhone}
                onChange={(e) => updateField("customerHeaderPhone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerHeaderWebsite">Website (optional)</Label>
              <Input
                id="customerHeaderWebsite"
                value={formData.customerHeaderWebsite}
                onChange={(e) => updateField("customerHeaderWebsite", e.target.value)}
                placeholder="www.example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
        </CardContent>
      </Card>

      {/* Equipment Being Returned */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Equipment Being Returned</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Add up to {MAX_EQUIPMENT_ROWS} equipment items. For additional equipment, check the box below.
          </p>

          <div className="space-y-2">
            {formData.equipment.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={item.model}
                    onChange={(e) => updateEquipment(index, "model", e.target.value)}
                    placeholder="Model"
                  />
                  <Input
                    value={item.serial}
                    onChange={(e) => updateEquipment(index, "serial", e.target.value)}
                    placeholder="Serial Number"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEquipmentRow(index)}
                  disabled={formData.equipment.length <= 1}
                  className="h-9 w-9 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {formData.equipment.length < MAX_EQUIPMENT_ROWS && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEquipmentRow}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          )}

          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox
              id="hasAdditionalEquipment"
              checked={formData.hasAdditionalEquipment}
              onCheckedChange={(checked) => updateField("hasAdditionalEquipment", checked === true)}
            />
            <label
              htmlFor="hasAdditionalEquipment"
              className="text-sm cursor-pointer"
            >
              For additional equipment being returned, please reference attached documentation
            </label>
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

      {/* Customer Signature */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Customer Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
            ℹ️ This section is completed by the customer who is requesting lease termination. 
            Enter the customer contact's name and title — they will sign this document.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signerName">Customer Name</Label>
              <Input
                id="signerName"
                value={formData.signerName}
                onChange={(e) => updateField("signerName", e.target.value)}
                placeholder="Customer's full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signerTitle">Customer Title</Label>
              <Input
                id="signerTitle"
                value={formData.signerTitle}
                onChange={(e) => updateField("signerTitle", e.target.value)}
                placeholder="Customer's job title"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
