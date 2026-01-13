import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface LoiEquipmentItem {
  id: string;
  description: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
}

export interface LoiFormData {
  // Header
  date: Date | null;
  loiNumber: string;
  expirationDate: Date | null;
  
  // Lessee (Customer) Information
  lesseeName: string;
  lesseeAddress: string;
  lesseeCity: string;
  lesseeState: string;
  lesseeZip: string;
  lesseeContact: string;
  lesseePhone: string;
  lesseeEmail: string;
  
  // Lessor (Leasing Company) Information
  lessorName: string;
  lessorAddress: string;
  lessorCity: string;
  lessorState: string;
  lessorZip: string;
  lessorContact: string;
  lessorPhone: string;
  
  // Equipment Details
  equipmentItems: LoiEquipmentItem[];
  
  // Lease Terms
  leaseType: string;
  termMonths: string;
  monthlyPayment: string;
  advancePayments: string;
  purchaseOption: string;
  
  // Additional Terms
  conditions: string;
  specialInstructions: string;
  
  // Signatures
  lesseeSignerName: string;
  lesseeSignerTitle: string;
  lesseeSignatureDate: Date | null;
  lessorSignerName: string;
  lessorSignerTitle: string;
  lessorSignatureDate: Date | null;
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

const LEASE_TYPES = [
  { value: "FMV", label: "FMV (Fair Market Value)" },
  { value: "$1-Out", label: "$1-Out Buyout" },
  { value: "10%", label: "10% Buyout" },
  { value: "Rental", label: "Rental" },
];

const MAX_EQUIPMENT_ROWS = 10;
const DEFAULT_EQUIPMENT_ROWS = 3;

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
  const [leasingCompanies, setLeasingCompanies] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const createDefaultEquipment = (): LoiEquipmentItem[] => {
    if (lineItems && lineItems.length > 0) {
      return lineItems.slice(0, MAX_EQUIPMENT_ROWS).map((item) => ({
        id: item.id || crypto.randomUUID(),
        description: item.model || item.name || item.description || "",
        quantity: String(item.quantity || 1),
        unitCost: String(item.price || ""),
        totalCost: String((item.quantity || 1) * (item.price || 0)),
      }));
    }
    return Array.from({ length: DEFAULT_EQUIPMENT_ROWS }, () => ({
      id: crypto.randomUUID(),
      description: "",
      quantity: "",
      unitCost: "",
      totalCost: "",
    }));
  };

  const createInitialFormData = (): LoiFormData => {
    const today = new Date();
    const expiration = new Date();
    expiration.setDate(today.getDate() + 30);

    const primaryContact = labeledContacts?.shippingContact || labeledContacts?.apContact;

    return {
      date: today,
      loiNumber: "",
      expirationDate: expiration,
      
      lesseeName: fmvLeaseFormData?.companyLegalName || company?.name || "",
      lesseeAddress: fmvLeaseFormData?.billingAddress || company?.apAddress || company?.deliveryAddress || "",
      lesseeCity: fmvLeaseFormData?.billingCity || company?.apCity || company?.deliveryCity || "",
      lesseeState: fmvLeaseFormData?.billingState || company?.apState || company?.deliveryState || "",
      lesseeZip: fmvLeaseFormData?.billingZip || company?.apZip || company?.deliveryZip || "",
      lesseeContact: primaryContact ? `${primaryContact.firstName || ""} ${primaryContact.lastName || ""}`.trim() : "",
      lesseePhone: fmvLeaseFormData?.phone || primaryContact?.phone || company?.phone || "",
      lesseeEmail: primaryContact?.email || "",
      
      lessorName: "",
      lessorAddress: "",
      lessorCity: "",
      lessorState: "",
      lessorZip: "",
      lessorContact: "",
      lessorPhone: "",
      
      equipmentItems: createDefaultEquipment(),
      
      leaseType: "FMV",
      termMonths: fmvLeaseFormData?.termInMonths || "",
      monthlyPayment: fmvLeaseFormData?.paymentAmount || "",
      advancePayments: "1",
      purchaseOption: "",
      
      conditions: "",
      specialInstructions: "",
      
      lesseeSignerName: primaryContact ? `${primaryContact.firstName || ""} ${primaryContact.lastName || ""}`.trim() : "",
      lesseeSignerTitle: "",
      lesseeSignatureDate: null,
      lessorSignerName: dealOwner ? `${dealOwner.firstName || ""} ${dealOwner.lastName || ""}`.trim() : "",
      lessorSignerTitle: "Sales Representative",
      lessorSignatureDate: null,
    };
  };

  const [formData, setFormData] = useState<LoiFormData>(() => createInitialFormData());

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

  // Initialize from saved config or create new
  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (savedConfig) {
      // Restore dates from ISO strings
      const restored: LoiFormData = {
        ...savedConfig,
        date: savedConfig.date ? new Date(savedConfig.date) : null,
        expirationDate: savedConfig.expirationDate ? new Date(savedConfig.expirationDate) : null,
        lesseeSignatureDate: savedConfig.lesseeSignatureDate ? new Date(savedConfig.lesseeSignatureDate) : null,
        lessorSignatureDate: savedConfig.lessorSignatureDate ? new Date(savedConfig.lessorSignatureDate) : null,
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
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateEquipmentItem = (id: string, field: keyof LoiEquipmentItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      equipmentItems: prev.equipmentItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Auto-calculate total if qty or unit changes
        if (field === "quantity" || field === "unitCost") {
          const qty = parseFloat(field === "quantity" ? value : item.quantity) || 0;
          const unit = parseFloat(field === "unitCost" ? value : item.unitCost) || 0;
          updated.totalCost = (qty * unit).toFixed(2);
        }
        return updated;
      }),
    }));
  };

  const addEquipmentRow = () => {
    if (formData.equipmentItems.length >= MAX_EQUIPMENT_ROWS) return;
    setFormData((prev) => ({
      ...prev,
      equipmentItems: [
        ...prev.equipmentItems,
        { id: crypto.randomUUID(), description: "", quantity: "", unitCost: "", totalCost: "" },
      ],
    }));
  };

  const removeEquipmentRow = (id: string) => {
    if (formData.equipmentItems.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      equipmentItems: prev.equipmentItems.filter((item) => item.id !== id),
    }));
  };

  const calculateTotalEquipmentCost = (): number => {
    return formData.equipmentItems.reduce((sum, item) => {
      return sum + (parseFloat(item.totalCost) || 0);
    }, 0);
  };

  return (
    <div className="space-y-4">
      {/* Letter Details */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Letter Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !formData.date && "text-muted-foreground")}
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
              <Label htmlFor="loiNumber">LOI Number</Label>
              <Input
                id="loiNumber"
                value={formData.loiNumber}
                onChange={(e) => updateField("loiNumber", e.target.value)}
                placeholder="LOI-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Expiration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !formData.expirationDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expirationDate ? format(formData.expirationDate, "MM/dd/yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expirationDate || undefined}
                    onSelect={(date) => updateField("expirationDate", date || null)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessee (Customer) Information */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Lessee Information (Customer)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lesseeName">Company Name</Label>
            <Input
              id="lesseeName"
              value={formData.lesseeName}
              onChange={(e) => updateField("lesseeName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesseeAddress">Address</Label>
            <Input
              id="lesseeAddress"
              value={formData.lesseeAddress}
              onChange={(e) => updateField("lesseeAddress", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lesseeCity">City</Label>
              <Input
                id="lesseeCity"
                value={formData.lesseeCity}
                onChange={(e) => updateField("lesseeCity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesseeState">State</Label>
              <Input
                id="lesseeState"
                value={formData.lesseeState}
                onChange={(e) => updateField("lesseeState", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesseeZip">ZIP</Label>
              <Input
                id="lesseeZip"
                value={formData.lesseeZip}
                onChange={(e) => updateField("lesseeZip", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lesseeContact">Contact Name</Label>
              <Input
                id="lesseeContact"
                value={formData.lesseeContact}
                onChange={(e) => updateField("lesseeContact", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesseePhone">Phone</Label>
              <Input
                id="lesseePhone"
                value={formData.lesseePhone}
                onChange={(e) => updateField("lesseePhone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesseeEmail">Email</Label>
              <Input
                id="lesseeEmail"
                type="email"
                value={formData.lesseeEmail}
                onChange={(e) => updateField("lesseeEmail", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessor (Leasing Company) Information */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Lessor Information (Leasing Company)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lessorName">Leasing Company</Label>
            <Select value={formData.lessorName} onValueChange={(value) => updateField("lessorName", value)}>
              <SelectTrigger id="lessorName">
                <SelectValue placeholder={loadingCompanies ? "Loading..." : "Select leasing company"} />
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
                    No companies available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lessorAddress">Address</Label>
            <Input
              id="lessorAddress"
              value={formData.lessorAddress}
              onChange={(e) => updateField("lessorAddress", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lessorCity">City</Label>
              <Input
                id="lessorCity"
                value={formData.lessorCity}
                onChange={(e) => updateField("lessorCity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lessorState">State</Label>
              <Input
                id="lessorState"
                value={formData.lessorState}
                onChange={(e) => updateField("lessorState", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lessorZip">ZIP</Label>
              <Input
                id="lessorZip"
                value={formData.lessorZip}
                onChange={(e) => updateField("lessorZip", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lessorContact">Contact Name</Label>
              <Input
                id="lessorContact"
                value={formData.lessorContact}
                onChange={(e) => updateField("lessorContact", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lessorPhone">Phone</Label>
              <Input
                id="lessorPhone"
                value={formData.lessorPhone}
                onChange={(e) => updateField("lessorPhone", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Equipment Description</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEquipmentRow}
              disabled={formData.equipmentItems.length >= MAX_EQUIPMENT_ROWS}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit Cost</span>
              <span>Total</span>
              <span className="w-8"></span>
            </div>
            {formData.equipmentItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
                <Input
                  value={item.description}
                  onChange={(e) => updateEquipmentItem(item.id, "description", e.target.value)}
                  placeholder="Equipment description"
                />
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateEquipmentItem(item.id, "quantity", e.target.value)}
                  placeholder="1"
                />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    className="pl-5"
                    value={item.unitCost}
                    onChange={(e) => updateEquipmentItem(item.id, "unitCost", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    className="pl-5 bg-muted"
                    value={item.totalCost}
                    readOnly
                    placeholder="0.00"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeEquipmentRow(item.id)}
                  disabled={formData.equipmentItems.length <= 1}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center pt-2 border-t">
              <span className="text-sm font-semibold text-right col-span-3">Total Equipment Cost:</span>
              <div className="text-sm font-bold">
                ${calculateTotalEquipmentCost().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="w-8"></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposed Lease Terms */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Proposed Lease Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leaseType">Lease Type</Label>
              <Select value={formData.leaseType} onValueChange={(value) => updateField("leaseType", value)}>
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
            <div className="space-y-2">
              <Label htmlFor="termMonths">Term Length (Months)</Label>
              <Input
                id="termMonths"
                type="number"
                value={formData.termMonths}
                onChange={(e) => updateField("termMonths", e.target.value)}
                placeholder="e.g., 36"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyPayment">Monthly Payment</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="monthlyPayment"
                  className="pl-7"
                  value={formData.monthlyPayment}
                  onChange={(e) => updateField("monthlyPayment", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="advancePayments">Advance Payments</Label>
              <Input
                id="advancePayments"
                value={formData.advancePayments}
                onChange={(e) => updateField("advancePayments", e.target.value)}
                placeholder="Number of advance payments"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchaseOption">End of Lease Purchase Option</Label>
            <Input
              id="purchaseOption"
              value={formData.purchaseOption}
              onChange={(e) => updateField("purchaseOption", e.target.value)}
              placeholder="e.g., Fair Market Value, $1.00, 10% of original equipment cost"
            />
          </div>
        </CardContent>
      </Card>

      {/* Conditions & Instructions */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Conditions & Special Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conditions">Conditions</Label>
            <Textarea
              id="conditions"
              value={formData.conditions}
              onChange={(e) => updateField("conditions", e.target.value)}
              placeholder="Subject to credit approval, execution of lease documents, etc."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions</Label>
            <Textarea
              id="specialInstructions"
              value={formData.specialInstructions}
              onChange={(e) => updateField("specialInstructions", e.target.value)}
              placeholder="Any special delivery, installation, or other requirements"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Authorization */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Authorization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lessee Signature */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="text-sm font-medium">Lessee (Customer)</h4>
              <div className="space-y-2">
                <Label htmlFor="lesseeSignerName">Printed Name</Label>
                <Input
                  id="lesseeSignerName"
                  value={formData.lesseeSignerName}
                  onChange={(e) => updateField("lesseeSignerName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesseeSignerTitle">Title</Label>
                <Input
                  id="lesseeSignerTitle"
                  value={formData.lesseeSignerTitle}
                  onChange={(e) => updateField("lesseeSignerTitle", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !formData.lesseeSignatureDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.lesseeSignatureDate ? format(formData.lesseeSignatureDate, "MM/dd/yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.lesseeSignatureDate || undefined}
                      onSelect={(date) => updateField("lesseeSignatureDate", date || null)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Lessor/Dealer Signature */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="text-sm font-medium">Dealer Representative</h4>
              <div className="space-y-2">
                <Label htmlFor="lessorSignerName">Printed Name</Label>
                <Input
                  id="lessorSignerName"
                  value={formData.lessorSignerName}
                  onChange={(e) => updateField("lessorSignerName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lessorSignerTitle">Title</Label>
                <Input
                  id="lessorSignerTitle"
                  value={formData.lessorSignerTitle}
                  onChange={(e) => updateField("lessorSignerTitle", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !formData.lessorSignatureDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.lessorSignatureDate ? format(formData.lessorSignatureDate, "MM/dd/yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.lessorSignatureDate || undefined}
                      onSelect={(date) => updateField("lessorSignatureDate", date || null)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
