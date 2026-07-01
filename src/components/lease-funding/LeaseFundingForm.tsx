import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Package, FileText, DollarSign, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard, FieldGrid, Field } from "@/components/shared";
import { Badge } from "@/components/ui/badge";

export interface LeaseFundingFormData {
  selectedLineItemId: string;
  date: Date | null;
  customerName: string;
  locationBranch: string;
  salesRepresentative: string;
  equipmentMakeModel: string;
  idNumber: string;
  serialNumber: string;
  leaseVendor: string;
  leaseType: string;
  termLength: string;
  monthlyPayment: string;
  rate: string;
  invoiceFundingAmount: string;
  invoiceFundingAmountOverridden: boolean;
  termsInclude?: boolean;
  termsTemplateId?: string;
  termsCustomText?: string;
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
      locationBranch: fmvLeaseFormData
        ? [
            fmvLeaseFormData.equipmentAddress,
            fmvLeaseFormData.equipmentCity,
            fmvLeaseFormData.equipmentState,
            fmvLeaseFormData.equipmentZip,
          ]
            .filter(Boolean)
            .join(", ")
        : buildAddress(company),
      salesRepresentative: dealOwner ? `${dealOwner.firstName || ""} ${dealOwner.lastName || ""}`.trim() : "",
      equipmentMakeModel: lineItem
        ? `${lineItem.model || lineItem.name || ""} - ${lineItem.description || ""}`
            .trim()
            .replace(/^-\s*/, "")
            .replace(/\s*-$/, "")
        : "",
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

  const expandedLineItems = useMemo((): ExpandedLineItem[] => {
    const hardwareItems = lineItems.filter((item) => item.category?.toLowerCase() === "hardware" || !item.category);

    const result: ExpandedLineItem[] = [];
    hardwareItems.forEach((item) => {
      const qty = Math.max(1, item.quantity || 1);
      for (let i = 0; i < qty; i++) {
        const displayName =
          qty > 1
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

  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!expandedLineItems.length) return;

    if (savedConfig?.selectedLineItemId) {
      setFormData(savedConfig);
      onFormChange(savedConfig);
      hasInitializedRef.current = true;
      return;
    }

    const firstItem = expandedLineItems[0];
    const initial = createInitialFormData(firstItem.id, firstItem.originalItem);
    setFormData(initial);
    onFormChange(initial);
    hasInitializedRef.current = true;
  }, [savedConfig, expandedLineItems, fmvLeaseFormData, company, dealOwner]);

  useEffect(() => {
    if (savedConfig && savedConfig.selectedLineItemId === formData.selectedLineItemId) {
      if (JSON.stringify(savedConfig) !== JSON.stringify(formData)) {
        setFormData(savedConfig);
      }
    }
  }, [savedConfig]);

  useEffect(() => {
    if (formData.invoiceFundingAmountOverridden) return;

    const payment = parseFloat(formData.monthlyPayment.replace(/[^0-9.]/g, "")) || 0;
    const rate = parseFloat(formData.rate) || 0;

    if (payment > 0 && rate > 0) {
      const calculated = payment / rate;
      setFormData((prev) => ({
        ...prev,
        invoiceFundingAmount: calculated.toFixed(2),
      }));
    }
  }, [formData.monthlyPayment, formData.rate, formData.invoiceFundingAmountOverridden]);

  useEffect(() => {
    if (hasInitializedRef.current) {
      onFormChange(formData);
    }
  }, [formData, onFormChange]);

  const updateField = (field: keyof LeaseFundingFormData, value: any) => {
    if (field === "invoiceFundingAmount") {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        invoiceFundingAmountOverridden: true,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleLineItemChange = (newLineItemId: string) => {
    if (newLineItemId === formData.selectedLineItemId) return;
    onLineItemSwitch(newLineItemId, formData);

    const newExpanded = expandedLineItems.find((item) => item.id === newLineItemId);
    if (!newExpanded) return;

    const newFormData = createInitialFormData(newLineItemId, newExpanded.originalItem);
    setFormData(newFormData);
  };

  return (
    <div className="space-y-4">
      {/* Hardware Item Selector */}
      {expandedLineItems.length > 0 && (
        <SectionCard
          title="Select Hardware Item"
          icon={Package}
          description="Choose which hardware unit this funding form covers"
          action={
            <Badge variant="secondary">
              {expandedLineItems.length} hardware item{expandedLineItems.length !== 1 ? "s" : ""}
            </Badge>
          }
        >
          <Select value={formData.selectedLineItemId} onValueChange={handleLineItemChange}>
            <SelectTrigger className="h-9 text-sm">
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
        </SectionCard>
      )}

      {/* Lease Information */}
      <SectionCard title="Lease Information" icon={FileText} description="Date, rep, customer, and equipment location">
        <div className="space-y-4">
          <FieldGrid columns={2}>
            <Field label="Date">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground",
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
            </Field>
            <Field label="Sales Representative">
              <Input
                id="salesRep"
                value={formData.salesRepresentative}
                onChange={(e) => updateField("salesRepresentative", e.target.value)}
                className="h-9 text-sm"
              />
            </Field>
          </FieldGrid>
          <Field label="Customer Name">
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => updateField("customerName", e.target.value)}
              className="h-9 text-sm"
            />
          </Field>
          <Field label="Location / Branch (Equipment)">
            <Input
              id="locationBranch"
              value={formData.locationBranch}
              onChange={(e) => updateField("locationBranch", e.target.value)}
              className="h-9 text-sm"
            />
          </Field>
        </div>
      </SectionCard>

      {/* Equipment */}
      <SectionCard title="Equipment" icon={Package} description="Equipment and identifiers being funded">
        <div className="space-y-4">
          <Field label="Equipment Make / Model">
            <Input
              id="equipmentMakeModel"
              value={formData.equipmentMakeModel}
              onChange={(e) => updateField("equipmentMakeModel", e.target.value)}
              className="h-9 text-sm"
            />
          </Field>
          <FieldGrid columns={2}>
            <Field label="ID Number">
              <Input
                id="idNumber"
                value={formData.idNumber}
                onChange={(e) => updateField("idNumber", e.target.value)}
                className="h-9 text-sm"
                placeholder="Enter ID number"
              />
            </Field>
            <Field label="Serial Number">
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => updateField("serialNumber", e.target.value)}
                className="h-9 text-sm"
                placeholder="Enter serial number"
              />
            </Field>
          </FieldGrid>
        </div>
      </SectionCard>

      {/* Lease Terms */}
      <SectionCard title="Lease Terms" icon={DollarSign} description="Vendor, type, term, payment, and funding amount">
        <div className="space-y-4">
          <FieldGrid columns={2}>
            <Field label="Lease Vendor">
              <Select value={formData.leaseVendor} onValueChange={(value) => updateField("leaseVendor", value)}>
                <SelectTrigger id="leaseVendor" className="h-9 text-sm">
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
            </Field>
            <Field label="Lease Type">
              <Select value={formData.leaseType} onValueChange={(value) => updateField("leaseType", value)}>
                <SelectTrigger id="leaseType" className="h-9 text-sm">
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
            </Field>
          </FieldGrid>
          <FieldGrid columns={2}>
            <Field label="Term Length (Months)">
              <Input
                id="termLength"
                type="number"
                value={formData.termLength}
                onChange={(e) => updateField("termLength", e.target.value)}
                className="h-9 text-sm"
                placeholder="e.g., 36"
              />
            </Field>
            <Field label="Monthly Payment">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="monthlyPayment"
                  value={formData.monthlyPayment}
                  onChange={(e) => updateField("monthlyPayment", e.target.value)}
                  className="pl-7 h-9 text-sm"
                  placeholder="0.00"
                />
              </div>
            </Field>
          </FieldGrid>
          <FieldGrid columns={2}>
            <Field label="Rate Factor">
              <Input
                id="rate"
                value={formData.rate}
                onChange={(e) => updateField("rate", e.target.value)}
                className="h-9 text-sm"
                placeholder="e.g., 0.032"
              />
            </Field>
            <Field label={`Invoice/Funding Amount${formData.invoiceFundingAmountOverridden ? "  (overridden)" : ""}`}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="invoiceFundingAmount"
                  value={formData.invoiceFundingAmount}
                  onChange={(e) => updateField("invoiceFundingAmount", e.target.value)}
                  className="pl-7 h-9 text-sm"
                  placeholder="0.00"
                />
              </div>
            </Field>
          </FieldGrid>
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
