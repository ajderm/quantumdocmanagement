import { useState, useEffect, useRef } from "react";
import { SectionCard, FieldGrid, Field } from "@/components/shared";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSignature, FileText, MapPin, MessageSquare, Package, PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

export interface RemovalEquipmentItem {
  id: string;
  qty: string;
  itemNumber: string;
  makeModelDescription: string;
  serialNumber: string;
}

export interface RemovalFormData {
  // Header
  idNumber: string;
  meterBlack: string;
  meterColor: string;
  meterTotal: string;

  // Ship To
  shipToCustomer: string;
  shipToAddress: string;
  shipToCityZip: string;
  shipToPhone: string;
  shipToContact: string;
  shipToEmail: string;

  // Bill To
  billToSameAsShipTo: boolean;
  billToCustomer: string;
  billToAddress: string;
  billToCityZip: string;
  billToPhone: string;
  billToContact: string;
  billToEmail: string;

  // Equipment
  equipmentItems: RemovalEquipmentItem[];

  // Additional Comments
  additionalComments: string;

  // Signature section
  salesRepresentative: string;
  termsInclude?: boolean;
  termsTemplateId?: string;
  termsCustomText?: string;
}

interface Company {
  name?: string;
  deliveryAddress?: string;
  deliveryAddress2?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  apAddress?: string;
  apAddress2?: string;
  apCity?: string;
  apState?: string;
  apZip?: string;
}

interface Contact {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

interface LabeledContacts {
  shippingContact?: Contact;
  apContact?: Contact;
}

interface DealOwner {
  firstName?: string;
  lastName?: string;
}

interface LineItem {
  hsObjectId?: string;
  name?: string;
  quantity?: number;
  properties?: {
    serial_number?: string;
  };
}

interface RemovalFormProps {
  company: Company | null;
  labeledContacts: LabeledContacts | null;
  dealOwner: DealOwner | null;
  lineItems: LineItem[] | null;
  onFormChange: (data: RemovalFormData) => void;
  savedConfig: RemovalFormData | null;
}

const MAX_EQUIPMENT_ROWS = 20;
const DEFAULT_EQUIPMENT_ROWS = 4;

export function getDefaultRemovalFormData(): RemovalFormData {
  return {
    idNumber: "",
    meterBlack: "",
    meterColor: "",
    meterTotal: "",
    shipToCustomer: "",
    shipToAddress: "",
    shipToCityZip: "",
    shipToPhone: "",
    shipToContact: "",
    shipToEmail: "",
    billToSameAsShipTo: false,
    billToCustomer: "",
    billToAddress: "",
    billToCityZip: "",
    billToPhone: "",
    billToContact: "",
    billToEmail: "",
    equipmentItems: Array.from({ length: DEFAULT_EQUIPMENT_ROWS }, (_, i) => ({
      id: `equip-${Date.now()}-${i}`,
      qty: "",
      itemNumber: "",
      makeModelDescription: "",
      serialNumber: "",
    })),
    additionalComments: "",
    salesRepresentative: "",
  };
}

function buildHubspotSeedData(params: {
  company: Company | null;
  labeledContacts: LabeledContacts | null;
  dealOwner: DealOwner | null;
  lineItems: LineItem[] | null;
}): RemovalFormData {
  const { company, labeledContacts, dealOwner, lineItems } = params;

  const formatCityStZip = (city?: string, state?: string, zip?: string): string => {
    const c = city || "";
    const s = state || "";
    const z = zip || "";
    return `${c}${c && s ? ", " : ""}${s}${(c || s) && z ? " " : ""}${z}`.trim();
  };

  const defaultData = getDefaultRemovalFormData();

  // Ship To from delivery address
  if (company) {
    defaultData.shipToCustomer = company.name || "";
    defaultData.shipToAddress = [company.deliveryAddress, company.deliveryAddress2].filter(Boolean).join(", ");
    defaultData.shipToCityZip = formatCityStZip(company.deliveryCity, company.deliveryState, company.deliveryZip);
  }

  if (labeledContacts?.shippingContact) {
    const sc = labeledContacts.shippingContact;
    defaultData.shipToContact = `${sc.firstName || ""} ${sc.lastName || ""}`.trim();
    defaultData.shipToPhone = sc.phone || "";
    defaultData.shipToEmail = sc.email || "";
  }

  // Bill To from AP address
  if (company) {
    defaultData.billToCustomer = company.name || "";
    defaultData.billToAddress = [company.apAddress, company.apAddress2].filter(Boolean).join(", ");
    defaultData.billToCityZip = formatCityStZip(company.apCity, company.apState, company.apZip);
  }

  if (labeledContacts?.apContact) {
    const ap = labeledContacts.apContact;
    defaultData.billToContact = `${ap.firstName || ""} ${ap.lastName || ""}`.trim();
    defaultData.billToPhone = ap.phone || "";
    defaultData.billToEmail = ap.email || "";
  }

  // Sales rep from deal owner
  if (dealOwner) {
    defaultData.salesRepresentative = `${dealOwner.firstName || ""} ${dealOwner.lastName || ""}`.trim();
  }

  // Pre-populate equipment from line items
  if (lineItems && lineItems.length > 0) {
    defaultData.equipmentItems = lineItems.slice(0, MAX_EQUIPMENT_ROWS).map((item, i) => ({
      id: item.hsObjectId || `equip-${Date.now()}-${i}`,
      qty: item.quantity?.toString() || "1",
      itemNumber: "",
      makeModelDescription: item.name || "",
      serialNumber: item.properties?.serial_number || "",
    }));

    // Pad with empty rows if less than default
    while (defaultData.equipmentItems.length < DEFAULT_EQUIPMENT_ROWS) {
      defaultData.equipmentItems.push({
        id: `equip-${Date.now()}-${defaultData.equipmentItems.length}`,
        qty: "",
        itemNumber: "",
        makeModelDescription: "",
        serialNumber: "",
      });
    }
  }

  return defaultData;
}

export function RemovalForm({
  company,
  labeledContacts,
  dealOwner,
  lineItems,
  onFormChange,
  savedConfig,
}: RemovalFormProps) {
  const hasAppliedSavedConfigRef = useRef(false);
  const hasAppliedHubspotSeedRef = useRef(false);
  const hasUserEditedRef = useRef(false);

  const [formData, setFormData] = useState<RemovalFormData>(getDefaultRemovalFormData());

  // Apply saved configuration once it becomes available (don’t block on first render).
  useEffect(() => {
    if (!savedConfig) return;
    if (hasUserEditedRef.current) return;
    if (hasAppliedSavedConfigRef.current) return;

    const equipment = savedConfig.equipmentItems?.length
      ? savedConfig.equipmentItems
      : Array.from({ length: DEFAULT_EQUIPMENT_ROWS }, (_, i) => ({
          id: `equip-${Date.now()}-${i}`,
          qty: "",
          itemNumber: "",
          makeModelDescription: "",
          serialNumber: "",
        }));

    setFormData({
      ...savedConfig,
      equipmentItems: equipment,
      salesRepresentative:
        savedConfig.salesRepresentative ||
        (dealOwner ? `${dealOwner.firstName || ""} ${dealOwner.lastName || ""}`.trim() : ""),
    });

    hasAppliedSavedConfigRef.current = true;
  }, [savedConfig, dealOwner]);

  // Seed from HubSpot once the data is available (prevents the “bill to updates after a few seconds” issue).
  useEffect(() => {
    if (savedConfig) return;
    if (hasUserEditedRef.current) return;
    if (hasAppliedHubspotSeedRef.current) return;

    const hasAnyHubspotData = Boolean(company || labeledContacts || dealOwner || (lineItems && lineItems.length > 0));
    if (!hasAnyHubspotData) return;

    setFormData(
      buildHubspotSeedData({
        company,
        labeledContacts,
        dealOwner,
        lineItems,
      }),
    );

    hasAppliedHubspotSeedRef.current = true;
  }, [savedConfig, company, labeledContacts, dealOwner, lineItems]);

  useEffect(() => {
    onFormChange(formData);
  }, [formData, onFormChange]);

  const updateField = (field: keyof RemovalFormData, value: any) => {
    hasUserEditedRef.current = true;
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // If toggling "Same as Ship To", copy Ship To values
      if (field === "billToSameAsShipTo" && value === true) {
        updated.billToCustomer = prev.shipToCustomer;
        updated.billToAddress = prev.shipToAddress;
        updated.billToCityZip = prev.shipToCityZip;
        updated.billToPhone = prev.shipToPhone;
        updated.billToContact = prev.shipToContact;
        updated.billToEmail = prev.shipToEmail;
      }

      return updated;
    });
  };

  const updateEquipmentItem = (index: number, field: keyof RemovalEquipmentItem, value: string) => {
    hasUserEditedRef.current = true;
    const newEquipment = [...formData.equipmentItems];
    newEquipment[index] = { ...newEquipment[index], [field]: value };
    setFormData((prev) => ({ ...prev, equipmentItems: newEquipment }));
  };

  const addEquipmentRow = () => {
    hasUserEditedRef.current = true;
    if (formData.equipmentItems.length >= MAX_EQUIPMENT_ROWS) return;
    setFormData((prev) => ({
      ...prev,
      equipmentItems: [
        ...prev.equipmentItems,
        {
          id: `equip-${Date.now()}`,
          qty: "",
          itemNumber: "",
          makeModelDescription: "",
          serialNumber: "",
        },
      ],
    }));
  };

  const removeEquipmentRow = (index: number) => {
    hasUserEditedRef.current = true;
    if (formData.equipmentItems.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      equipmentItems: prev.equipmentItems.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header Information */}
      <SectionCard title="Header Information" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="idNumber">ID Number</Label>
            <Input
              id="idNumber"
              value={formData.idNumber}
              onChange={(e) => updateField("idNumber", e.target.value)}
              placeholder="e.g., RM-12345"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meterBlack">Meter Black</Label>
            <Input
              id="meterBlack"
              value={formData.meterBlack}
              onChange={(e) => updateField("meterBlack", e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meterColor">Meter Color</Label>
            <Input
              id="meterColor"
              value={formData.meterColor}
              onChange={(e) => updateField("meterColor", e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meterTotal">Meter Total</Label>
            <Input
              id="meterTotal"
              value={formData.meterTotal}
              onChange={(e) => updateField("meterTotal", e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </SectionCard>

      {/* Ship To / Bill To */}
      <SectionCard title="Ship To / Bill To" icon={MapPin}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ship To */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-muted-foreground">Ship To</div>
            <div className="space-y-2">
              <Label htmlFor="shipToCustomer">Customer</Label>
              <Input
                id="shipToCustomer"
                value={formData.shipToCustomer}
                onChange={(e) => updateField("shipToCustomer", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipToAddress">Address</Label>
              <Input
                id="shipToAddress"
                value={formData.shipToAddress}
                onChange={(e) => updateField("shipToAddress", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipToCityZip">City, State Zip</Label>
              <Input
                id="shipToCityZip"
                value={formData.shipToCityZip}
                onChange={(e) => updateField("shipToCityZip", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="shipToPhone">Phone</Label>
                <Input
                  id="shipToPhone"
                  value={formData.shipToPhone}
                  onChange={(e) => updateField("shipToPhone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipToContact">Contact</Label>
                <Input
                  id="shipToContact"
                  value={formData.shipToContact}
                  onChange={(e) => updateField("shipToContact", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipToEmail">Email</Label>
              <Input
                id="shipToEmail"
                value={formData.shipToEmail}
                onChange={(e) => updateField("shipToEmail", e.target.value)}
              />
            </div>
          </div>

          {/* Bill To */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-muted-foreground">Bill To</div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="billToSameAsShipTo"
                  checked={formData.billToSameAsShipTo}
                  onCheckedChange={(checked) => updateField("billToSameAsShipTo", checked === true)}
                />
                <Label htmlFor="billToSameAsShipTo" className="text-xs">
                  Same as Ship To
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billToCustomer">Customer</Label>
              <Input
                id="billToCustomer"
                value={formData.billToCustomer}
                onChange={(e) => updateField("billToCustomer", e.target.value)}
                disabled={formData.billToSameAsShipTo}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billToAddress">Address</Label>
              <Input
                id="billToAddress"
                value={formData.billToAddress}
                onChange={(e) => updateField("billToAddress", e.target.value)}
                disabled={formData.billToSameAsShipTo}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billToCityZip">City, State Zip</Label>
              <Input
                id="billToCityZip"
                value={formData.billToCityZip}
                onChange={(e) => updateField("billToCityZip", e.target.value)}
                disabled={formData.billToSameAsShipTo}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="billToPhone">Phone</Label>
                <Input
                  id="billToPhone"
                  value={formData.billToPhone}
                  onChange={(e) => updateField("billToPhone", e.target.value)}
                  disabled={formData.billToSameAsShipTo}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billToContact">Contact</Label>
                <Input
                  id="billToContact"
                  value={formData.billToContact}
                  onChange={(e) => updateField("billToContact", e.target.value)}
                  disabled={formData.billToSameAsShipTo}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billToEmail">Email</Label>
              <Input
                id="billToEmail"
                value={formData.billToEmail}
                onChange={(e) => updateField("billToEmail", e.target.value)}
                disabled={formData.billToSameAsShipTo}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Equipment */}
      <SectionCard
        title={`Equipment (${formData.equipmentItems.length}/${MAX_EQUIPMENT_ROWS})`}
        icon={Package}
        action={
          <>
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
          </>
        }
      >
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
            <div className="col-span-1">Qty</div>
            <div className="col-span-2">Item #</div>
            <div className="col-span-5">Make * Model * Description</div>
            <div className="col-span-3">Serial #</div>
            <div className="col-span-1"></div>
          </div>
          {formData.equipmentItems.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2">
              <div className="col-span-1">
                <Input
                  value={item.qty}
                  onChange={(e) => updateEquipmentItem(index, "qty", e.target.value)}
                  placeholder="1"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={item.itemNumber}
                  onChange={(e) => updateEquipmentItem(index, "itemNumber", e.target.value)}
                  placeholder="Item #"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-5">
                <Input
                  value={item.makeModelDescription}
                  onChange={(e) => updateEquipmentItem(index, "makeModelDescription", e.target.value)}
                  placeholder="Make * Model * Description"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={item.serialNumber}
                  onChange={(e) => updateEquipmentItem(index, "serialNumber", e.target.value)}
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
                  disabled={formData.equipmentItems.length <= 1}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Additional Comments */}
        <SectionCard title="Additional Comments" icon={MessageSquare}>
          <Textarea
            value={formData.additionalComments}
            onChange={(e) => updateField("additionalComments", e.target.value)}
            placeholder="Enter any additional comments or notes..."
            rows={3}
          />
        </SectionCard>

        {/* Signature Information */}
        <SectionCard title="Signature Information" icon={PenLine}>
          <div className="space-y-2">
            <Label htmlFor="salesRepresentative">Sales Representative</Label>
            <Input
              id="salesRepresentative"
              value={formData.salesRepresentative}
              onChange={(e) => updateField("salesRepresentative", e.target.value)}
              placeholder="Sales rep name"
            />
            <p className="text-xs text-muted-foreground">
              Customer signature fields appear on the output document only
            </p>
          </div>
        </SectionCard>
      </div>

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

export default RemovalForm;
