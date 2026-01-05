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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface ServiceAgreementFormData {
  // Header
  customerNumber: string;
  customerNumberOverride: string;
  meterMethod: string;
  
  // Ship To
  shipToCompany: string;
  shipToAddress: string;
  shipToCity: string;
  shipToState: string;
  shipToZip: string;
  shipToAttn: string;
  shipToPhone: string;
  shipToEmail: string;
  
  // Bill To
  billToCompany: string;
  billToAddress: string;
  billToCity: string;
  billToState: string;
  billToZip: string;
  billToAttn: string;
  billToPhone: string;
  billToEmail: string;
  
  // Terms
  maintenanceType: string;
  paperStaples: string;
  drumToner: string;
  effectiveDate: Date | null;
  contractLengthMonths: string;
  
  // Rates per line item (keyed by line item ID)
  rates: Record<string, {
    includesBW: string;
    includesColor: string;
    overagesBW: string;
    overagesColor: string;
    baseRate: string;
  }>;
}

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
  category?: string;
  serial?: string;
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

interface QuoteFormData {
  includedBWCopies: string;
  includedColorCopies: string;
  overageBWRate: string;
  overageColorRate: string;
  serviceBaseRate: string;
}

interface ServiceAgreementFormProps {
  formData: ServiceAgreementFormData;
  onChange: (data: ServiceAgreementFormData) => void;
  company: { 
    name?: string; 
    customerNumber?: string;
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
  } | null;
  lineItems: LineItem[];
  dealerSettings: { meter_methods?: string[] } | null;
  savedConfig: ServiceAgreementFormData | null;
  labeledContacts: LabeledContacts;
  quoteFormData?: QuoteFormData | null;
}

export function ServiceAgreementForm({
  formData,
  onChange,
  company,
  lineItems,
  dealerSettings,
  savedConfig,
  labeledContacts,
  quoteFormData,
}: ServiceAgreementFormProps) {
  const meterMethods = dealerSettings?.meter_methods || ["FMAudit", "PrintFleet", "Manual Entry"];
  
  // Filter hardware line items for rates table
  const hardwareLineItems = lineItems.filter(
    (item) => item.category?.toLowerCase() === 'hardware'
  );

  // Track if we've done initial setup
  const hasInitializedRef = useRef(false);

  // Initialize form data from saved config, company, contacts, and quote data
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (savedConfig && !company) {
      onChange(savedConfig);
      hasInitializedRef.current = true;
      return;
    }
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

    const fillIfEmpty = (current: string, next: string) => (current?.trim() ? current : next);

    const base = savedConfig ? { ...formData, ...savedConfig } : { ...formData };

    const shipToContact = labeledContacts.shippingContact;
    const billToContact = labeledContacts.apContact;

    const initialRates: ServiceAgreementFormData["rates"] = {};
    hardwareLineItems.forEach((item) => {
      initialRates[item.id] = {
        includesBW: quoteFormData?.includedBWCopies || "",
        includesColor: quoteFormData?.includedColorCopies || "",
        overagesBW: quoteFormData?.overageBWRate || "",
        overagesColor: quoteFormData?.overageColorRate || "",
        baseRate: quoteFormData?.serviceBaseRate || "",
      };
    });

    const shipToAddress = company && pick(
      buildAddress(company.deliveryAddress, company.deliveryAddress2),
      buildAddress(company.address, company.address2)
    );
    const shipToCity = company ? pick(company.deliveryCity, company.city) : "";
    const shipToState = company ? pick(company.deliveryState, company.state) : "";
    const shipToZip = company ? pick(company.deliveryZip, company.zip) : "";

    const billToAddress = company && pick(
      buildAddress(company.apAddress, company.apAddress2),
      buildAddress(company.address, company.address2)
    );
    const billToCity = company ? pick(company.apCity, company.city) : "";
    const billToState = company ? pick(company.apState, company.state) : "";
    const billToZip = company ? pick(company.apZip, company.zip) : "";

    const nextRates = base.rates && Object.keys(base.rates).length > 0 ? base.rates : initialRates;

    onChange({
      ...base,
      customerNumber: fillIfEmpty(base.customerNumber, company?.customerNumber || ""),
      shipToCompany: fillIfEmpty(base.shipToCompany, company?.name || ""),
      shipToAddress: fillIfEmpty(base.shipToAddress, shipToAddress || ""),
      shipToCity: fillIfEmpty(base.shipToCity, shipToCity),
      shipToState: fillIfEmpty(base.shipToState, shipToState),
      shipToZip: fillIfEmpty(base.shipToZip, shipToZip),
      shipToAttn: fillIfEmpty(base.shipToAttn, shipToContact ? `${shipToContact.firstName || ""} ${shipToContact.lastName || ""}`.trim() : ""),
      shipToPhone: fillIfEmpty(base.shipToPhone, shipToContact?.phone || ""),
      shipToEmail: fillIfEmpty(base.shipToEmail, shipToContact?.email || ""),
      billToCompany: fillIfEmpty(base.billToCompany, company?.name || ""),
      billToAddress: fillIfEmpty(base.billToAddress, billToAddress || ""),
      billToCity: fillIfEmpty(base.billToCity, billToCity),
      billToState: fillIfEmpty(base.billToState, billToState),
      billToZip: fillIfEmpty(base.billToZip, billToZip),
      billToAttn: fillIfEmpty(base.billToAttn, billToContact ? `${billToContact.firstName || ""} ${billToContact.lastName || ""}`.trim() : ""),
      billToPhone: fillIfEmpty(base.billToPhone, billToContact?.phone || ""),
      billToEmail: fillIfEmpty(base.billToEmail, billToContact?.email || ""),
      rates: nextRates,
    });

    hasInitializedRef.current = true;
  }, [savedConfig, company, labeledContacts, quoteFormData, hardwareLineItems]);

  // Backfill addresses from company if left blank
  useEffect(() => {
    if (!company) return;

    const pick = (...vals: Array<string | undefined | null>) =>
      vals.map((v) => (v ?? "").trim()).find(Boolean) || "";

    const buildAddress = (line1?: string | null, line2?: string | null) => {
      const a1 = (line1 ?? "").trim();
      const a2 = (line2 ?? "").trim();
      if (!a1 && !a2) return "";
      if (a1 && a2) return `${a1}, ${a2}`;
      return a1 || a2;
    };

    const shipToAddress = pick(buildAddress(company.deliveryAddress, company.deliveryAddress2), buildAddress(company.address, company.address2));
    const shipToCity = pick(company.deliveryCity, company.city);
    const shipToState = pick(company.deliveryState, company.state);
    const shipToZip = pick(company.deliveryZip, company.zip);
    const billToAddress = pick(buildAddress(company.apAddress, company.apAddress2), buildAddress(company.address, company.address2));
    const billToCity = pick(company.apCity, company.city);
    const billToState = pick(company.apState, company.state);
    const billToZip = pick(company.apZip, company.zip);

    const patch: Partial<ServiceAgreementFormData> = {};
    if (!formData.shipToCompany?.trim() && company.name) patch.shipToCompany = company.name;
    if (!formData.billToCompany?.trim() && company.name) patch.billToCompany = company.name;
    if (!formData.shipToAddress?.trim() && shipToAddress) patch.shipToAddress = shipToAddress;
    if (!formData.shipToCity?.trim() && shipToCity) patch.shipToCity = shipToCity;
    if (!formData.shipToState?.trim() && shipToState) patch.shipToState = shipToState;
    if (!formData.shipToZip?.trim() && shipToZip) patch.shipToZip = shipToZip;
    if (!formData.billToAddress?.trim() && billToAddress) patch.billToAddress = billToAddress;
    if (!formData.billToCity?.trim() && billToCity) patch.billToCity = billToCity;
    if (!formData.billToState?.trim() && billToState) patch.billToState = billToState;
    if (!formData.billToZip?.trim() && billToZip) patch.billToZip = billToZip;

    if (Object.keys(patch).length > 0) {
      onChange({ ...formData, ...patch });
    }
  }, [company, formData.shipToCompany, formData.billToCompany, formData.shipToAddress, formData.shipToCity, formData.shipToState, formData.shipToZip, formData.billToAddress, formData.billToCity, formData.billToState, formData.billToZip]);

  // Backfill contact fields
  useEffect(() => {
    if (!labeledContacts) return;

    const patch: Partial<ServiceAgreementFormData> = {};
    const shipToContact = labeledContacts.shippingContact;
    if (shipToContact) {
      if (!formData.shipToAttn?.trim()) {
        const name = `${shipToContact.firstName || ''} ${shipToContact.lastName || ''}`.trim();
        if (name) patch.shipToAttn = name;
      }
      if (!formData.shipToPhone?.trim() && shipToContact.phone) patch.shipToPhone = shipToContact.phone;
      if (!formData.shipToEmail?.trim() && shipToContact.email) patch.shipToEmail = shipToContact.email;
    }

    const billToContact = labeledContacts.apContact;
    if (billToContact) {
      if (!formData.billToAttn?.trim()) {
        const name = `${billToContact.firstName || ''} ${billToContact.lastName || ''}`.trim();
        if (name) patch.billToAttn = name;
      }
      if (!formData.billToPhone?.trim() && billToContact.phone) patch.billToPhone = billToContact.phone;
      if (!formData.billToEmail?.trim() && billToContact.email) patch.billToEmail = billToContact.email;
    }

    if (Object.keys(patch).length > 0) {
      onChange({ ...formData, ...patch });
    }
  }, [labeledContacts, formData.shipToAttn, formData.shipToPhone, formData.shipToEmail, formData.billToAttn, formData.billToPhone, formData.billToEmail]);

  const updateField = (field: keyof ServiceAgreementFormData, value: any) => {
    onChange({ ...formData, [field]: value });
  };

  const updateRate = (lineItemId: string, field: string, value: string) => {
    onChange({
      ...formData,
      rates: {
        ...formData.rates,
        [lineItemId]: {
          ...formData.rates[lineItemId],
          [field]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Agreement Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerNumber">Customer Number</Label>
              <Input
                id="customerNumber"
                value={formData.customerNumberOverride || formData.customerNumber}
                onChange={(e) => updateField('customerNumberOverride', e.target.value)}
                placeholder={company?.customerNumber || 'Enter customer number'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meterMethod">Meter Method</Label>
              <Select
                value={formData.meterMethod}
                onValueChange={(value) => updateField('meterMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select meter method" />
                </SelectTrigger>
                <SelectContent>
                  {meterMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ship To / Bill To Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ship To */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Customer Ship To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label htmlFor="shipToCompany">Company</Label>
                <Input id="shipToCompany" value={formData.shipToCompany} onChange={(e) => updateField('shipToCompany', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shipToAddress">Address</Label>
                <Input id="shipToAddress" value={formData.shipToAddress} onChange={(e) => updateField('shipToAddress', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="shipToCity">City</Label>
                  <Input id="shipToCity" value={formData.shipToCity} onChange={(e) => updateField('shipToCity', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="shipToState">State</Label>
                  <Input id="shipToState" value={formData.shipToState} onChange={(e) => updateField('shipToState', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="shipToZip">Zip</Label>
                  <Input id="shipToZip" value={formData.shipToZip} onChange={(e) => updateField('shipToZip', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="shipToAttn">Attn</Label>
                <Input id="shipToAttn" value={formData.shipToAttn} onChange={(e) => updateField('shipToAttn', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="shipToPhone">Phone</Label>
                  <Input id="shipToPhone" value={formData.shipToPhone} onChange={(e) => updateField('shipToPhone', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="shipToEmail">Email</Label>
                  <Input id="shipToEmail" value={formData.shipToEmail} onChange={(e) => updateField('shipToEmail', e.target.value)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bill To */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Customer Bill To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label htmlFor="billToCompany">Company</Label>
                <Input id="billToCompany" value={formData.billToCompany} onChange={(e) => updateField('billToCompany', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="billToAddress">Address</Label>
                <Input id="billToAddress" value={formData.billToAddress} onChange={(e) => updateField('billToAddress', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="billToCity">City</Label>
                  <Input id="billToCity" value={formData.billToCity} onChange={(e) => updateField('billToCity', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="billToState">State</Label>
                  <Input id="billToState" value={formData.billToState} onChange={(e) => updateField('billToState', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="billToZip">Zip</Label>
                  <Input id="billToZip" value={formData.billToZip} onChange={(e) => updateField('billToZip', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="billToAttn">Attn</Label>
                <Input id="billToAttn" value={formData.billToAttn} onChange={(e) => updateField('billToAttn', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="billToPhone">Phone</Label>
                  <Input id="billToPhone" value={formData.billToPhone} onChange={(e) => updateField('billToPhone', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="billToEmail">Email</Label>
                  <Input id="billToEmail" value={formData.billToEmail} onChange={(e) => updateField('billToEmail', e.target.value)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terms Section */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maintenanceType">Maintenance Type</Label>
              <Select value={formData.maintenanceType} onValueChange={(value) => updateField('maintenanceType', value)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Base + Overages">Base + Overages</SelectItem>
                  <SelectItem value="CPC (Cost-Per-Copy)">CPC (Cost-Per-Copy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paperStaples">Paper & Staples</Label>
              <Select value={formData.paperStaples} onValueChange={(value) => updateField('paperStaples', value)}>
                <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excludes Paper">Excludes Paper</SelectItem>
                  <SelectItem value="Excludes Paper & Staples">Excludes Paper & Staples</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="drumToner">Drum & Toner</Label>
              <Select value={formData.drumToner} onValueChange={(value) => updateField('drumToner', value)}>
                <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Drum & Toner Included MDT">Drum & Toner Included MDT</SelectItem>
                  <SelectItem value="Drum Included MD">Drum Included MD</SelectItem>
                  <SelectItem value="Drum Excluded MA">Drum Excluded MA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.effectiveDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.effectiveDate ? format(formData.effectiveDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formData.effectiveDate || undefined} onSelect={(date) => updateField('effectiveDate', date)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractLengthMonths">Contract Length (Months)</Label>
              <Input id="contractLengthMonths" type="number" value={formData.contractLengthMonths} onChange={(e) => updateField('contractLengthMonths', e.target.value)} placeholder="e.g., 36" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Equipment</CardTitle>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">No line items associated with this deal.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Qty</th>
                    <th className="px-4 py-2 text-left font-medium">Model</th>
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                    <th className="px-4 py-2 text-left font-medium">Serial</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">{item.description || '-'}</td>
                      <td className="px-4 py-2">{item.serial || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rates Table (Hardware Only) */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Rates</CardTitle>
        </CardHeader>
        <CardContent>
          {hardwareLineItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hardware line items available for rates.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Model</th>
                    <th className="px-3 py-2 text-left font-medium">Includes (B/W)</th>
                    <th className="px-3 py-2 text-left font-medium">Includes (Color)</th>
                    <th className="px-3 py-2 text-left font-medium">Overages (B/W)</th>
                    <th className="px-3 py-2 text-left font-medium">Overages (Color)</th>
                    <th className="px-3 py-2 text-left font-medium">Base Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {hardwareLineItems.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="px-3 py-2 font-medium">{item.name}</td>
                      <td className="px-3 py-1">
                        <Input className="h-8" value={formData.rates[item.id]?.includesBW || ''} onChange={(e) => updateRate(item.id, 'includesBW', e.target.value)} placeholder="0" />
                      </td>
                      <td className="px-3 py-1">
                        <Input className="h-8" value={formData.rates[item.id]?.includesColor || ''} onChange={(e) => updateRate(item.id, 'includesColor', e.target.value)} placeholder="0" />
                      </td>
                      <td className="px-3 py-1">
                        <Input className="h-8" value={formData.rates[item.id]?.overagesBW || ''} onChange={(e) => updateRate(item.id, 'overagesBW', e.target.value)} placeholder="0.00" />
                      </td>
                      <td className="px-3 py-1">
                        <Input className="h-8" value={formData.rates[item.id]?.overagesColor || ''} onChange={(e) => updateRate(item.id, 'overagesColor', e.target.value)} placeholder="0.00" />
                      </td>
                      <td className="px-3 py-1">
                        <Input className="h-8" value={formData.rates[item.id]?.baseRate || ''} onChange={(e) => updateRate(item.id, 'baseRate', e.target.value)} placeholder="0.00" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
