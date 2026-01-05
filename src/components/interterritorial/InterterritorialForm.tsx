import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PAYMENT_FREQUENCIES = [
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Semi-Annually", label: "Semi-Annually" },
  { value: "Annually", label: "Annually" },
];

export interface InterterritorialEquipmentItem {
  id: string;
  qty: number;
  vendorProductCode: string;
  description: string;
  price: number;
  cost: number;
  fee: number;
}

export interface InterterritorialRemovalItem {
  id: string;
  qty: number;
  description: string;
  serial: string;
  meters: string;
  instructions: string;
}

export interface InterterritorialFormData {
  // Header
  requestedInstallDate: Date | null;
  
  // Originating Dealer (pre-filled from Settings, overridable)
  originatingName: string;
  originatingBillTo: string;
  originatingPhone: string;
  originatingAttn: string;
  originatingEmail: string;
  originatingCca: string;
  
  // Installing Dealer (manual entry)
  installingName: string;
  installingAddress: string;
  installingPhone: string;
  installingAttn: string;
  installingEmail: string;
  installingCca: string;
  installingDealerNumber: string;
  
  // Customer Installed To (from FMV Lease Equipment Address)
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerAttn: string;
  customerEmail: string;
  customerFax: string;
  
  // Equipment To Be Installed
  equipmentItems: InterterritorialEquipmentItem[];
  
  // Service Agreement
  serviceBaseCharge: string;
  serviceIncludes: string;
  serviceOverageBW: string;
  serviceOverageColor: string;
  serviceFrequency: string;
  serviceBillTo: string;
  
  // Removal Equipment
  removalEquipment: InterterritorialRemovalItem[];
}

interface DealerInfo {
  companyName: string;
  address: string;
  phone: string;
  website: string;
  logoUrl?: string;
}

interface DealerSettings {
  cca_value?: string;
}

interface FMVLeaseFormData {
  companyLegalName?: string;
  equipmentAddress?: string;
  equipmentCity?: string;
  equipmentState?: string;
  equipmentZip?: string;
  phone?: string;
}

interface ServiceAgreementFormData {
  rates?: Record<string, {
    baseRate?: string;
    includesBW?: string;
    includesColor?: string;
    overagesBW?: string;
    overagesColor?: string;
  }>;
  contractLengthMonths?: string;
  // Ship To fields for Customer Installed To
  shipToCompany?: string;
  shipToAddress?: string;
  shipToCity?: string;
  shipToState?: string;
  shipToZip?: string;
  shipToAttn?: string;
  shipToPhone?: string;
  shipToEmail?: string;
}

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
  sku?: string;
  model?: string;
  category?: string;
  cost?: number;
}

interface QuoteFormData {
  phone?: string;
}

interface InterterritorialFormProps {
  formData: InterterritorialFormData;
  onChange: (data: InterterritorialFormData) => void;
  dealerInfo: DealerInfo | null;
  dealerSettings: DealerSettings;
  dealOwner: { firstName?: string; lastName?: string; email?: string } | null;
  lineItems: LineItem[];
  fmvLeaseFormData: FMVLeaseFormData | null;
  serviceAgreementFormData: ServiceAgreementFormData | null;
  savedConfig: InterterritorialFormData | null;
  quoteFormData: QuoteFormData | null;
}

const MAX_REMOVAL_EQUIPMENT = 10;

export function InterterritorialForm({
  formData,
  onChange,
  dealerInfo,
  dealerSettings,
  dealOwner,
  lineItems,
  fmvLeaseFormData,
  serviceAgreementFormData,
  savedConfig,
  quoteFormData,
}: InterterritorialFormProps) {
  const hasInitializedRef = useRef(false);

  // Initialize form data from saved config and cross-document data
  useEffect(() => {
    if (hasInitializedRef.current) return;

    const fillIfEmpty = (current: string, next: string) =>
      current?.trim() ? current : next;

    const base = savedConfig ? { ...formData, ...savedConfig } : { ...formData };

    // Build originating dealer address from dealerInfo
    const originatingAddress = dealerInfo?.address || '';

    // Build customer address from Service Agreement Ship To
    const customerAddress = serviceAgreementFormData
      ? `${serviceAgreementFormData.shipToAddress || ''}, ${serviceAgreementFormData.shipToCity || ''}, ${serviceAgreementFormData.shipToState || ''} ${serviceAgreementFormData.shipToZip || ''}`.replace(/^,\s*/, '').replace(/,\s*,/g, ',').trim()
      : '';

    // Initialize equipment items from line items
    const initialEquipmentItems: InterterritorialEquipmentItem[] = lineItems.map((item) => {
      const savedItem = base.equipmentItems?.find((e) => e.id === item.id);
      return {
        id: item.id,
        qty: savedItem?.qty ?? item.quantity,
        vendorProductCode: savedItem?.vendorProductCode ?? (item.sku || item.model || ''),
        description: savedItem?.description ?? (item.description || item.name || ''),
        price: savedItem?.price ?? item.price,
        cost: savedItem?.cost ?? (item.cost || 0),
        fee: savedItem?.fee ?? 0,
      };
    });

    // Get first service agreement rate for defaults
    const firstRate = serviceAgreementFormData?.rates
      ? Object.values(serviceAgreementFormData.rates)[0]
      : null;

    // Parse requestedInstallDate from saved config (handles string from JSON)
    let parsedInstallDate: Date | null = null;
    if (base.requestedInstallDate) {
      if (typeof base.requestedInstallDate === 'string') {
        parsedInstallDate = new Date(base.requestedInstallDate);
      } else {
        parsedInstallDate = base.requestedInstallDate;
      }
    }

    onChange({
      ...base,
      requestedInstallDate: parsedInstallDate,
      
      // Originating Dealer - use Quote phone if available
      originatingName: fillIfEmpty(base.originatingName, dealerInfo?.companyName || ''),
      originatingBillTo: fillIfEmpty(base.originatingBillTo, originatingAddress),
      originatingPhone: fillIfEmpty(base.originatingPhone, quoteFormData?.phone || dealerInfo?.phone || ''),
      originatingAttn: fillIfEmpty(base.originatingAttn, dealOwner ? `${dealOwner.firstName || ''} ${dealOwner.lastName || ''}`.trim() : ''),
      originatingEmail: fillIfEmpty(base.originatingEmail, dealOwner?.email || ''),
      originatingCca: fillIfEmpty(base.originatingCca, dealerSettings.cca_value || ''),
      
      // Installing Dealer - empty by default
      installingName: base.installingName || '',
      installingAddress: base.installingAddress || '',
      installingPhone: base.installingPhone || '',
      installingAttn: base.installingAttn || '',
      installingEmail: base.installingEmail || '',
      installingCca: base.installingCca || '',
      installingDealerNumber: base.installingDealerNumber || '',
      
      // Customer Installed To - from Service Agreement Ship To
      customerName: fillIfEmpty(base.customerName, serviceAgreementFormData?.shipToCompany || ''),
      customerAddress: fillIfEmpty(base.customerAddress, customerAddress),
      customerPhone: fillIfEmpty(base.customerPhone, serviceAgreementFormData?.shipToPhone || ''),
      customerAttn: fillIfEmpty(base.customerAttn, serviceAgreementFormData?.shipToAttn || ''),
      customerEmail: fillIfEmpty(base.customerEmail, serviceAgreementFormData?.shipToEmail || ''),
      customerFax: base.customerFax || '',
      
      // Equipment
      equipmentItems: base.equipmentItems?.length > 0 ? base.equipmentItems : initialEquipmentItems,
      
      // Service Agreement
      serviceBaseCharge: fillIfEmpty(base.serviceBaseCharge, firstRate?.baseRate || ''),
      serviceIncludes: fillIfEmpty(
        base.serviceIncludes,
        [
          firstRate?.includesBW ? `${firstRate.includesBW} B/W` : '',
          firstRate?.includesColor ? `${firstRate.includesColor} Color` : ''
        ].filter(Boolean).join(', ')
      ),
      serviceOverageBW: fillIfEmpty(base.serviceOverageBW, firstRate?.overagesBW || ''),
      serviceOverageColor: fillIfEmpty(base.serviceOverageColor, firstRate?.overagesColor || ''),
      serviceFrequency: base.serviceFrequency || 'Monthly',
      serviceBillTo: fillIfEmpty(base.serviceBillTo, 'Originating Dealer'),
      
      // Removal Equipment
      removalEquipment: base.removalEquipment || [],
    });

    hasInitializedRef.current = true;
  }, [savedConfig, dealerInfo, dealerSettings, dealOwner, lineItems, fmvLeaseFormData, serviceAgreementFormData]);

  const updateField = <K extends keyof InterterritorialFormData>(field: K, value: InterterritorialFormData[K]) => {
    onChange({ ...formData, [field]: value });
  };

  const updateEquipmentItem = (index: number, field: keyof InterterritorialEquipmentItem, value: string | number) => {
    const newItems = [...formData.equipmentItems];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...formData, equipmentItems: newItems });
  };

  const addRemovalEquipment = () => {
    if (formData.removalEquipment.length >= MAX_REMOVAL_EQUIPMENT) return;
    onChange({
      ...formData,
      removalEquipment: [
        ...formData.removalEquipment,
        {
          id: `removal-${Date.now()}`,
          qty: 1,
          description: '',
          serial: '',
          meters: '',
          instructions: '',
        },
      ],
    });
  };

  const updateRemovalEquipment = (index: number, field: keyof InterterritorialRemovalItem, value: string | number) => {
    const newItems = [...formData.removalEquipment];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...formData, removalEquipment: newItems });
  };

  const removeRemovalEquipment = (index: number) => {
    onChange({
      ...formData,
      removalEquipment: formData.removalEquipment.filter((_, i) => i !== index),
    });
  };

  const calculateTotalFee = () => {
    return formData.equipmentItems.reduce((sum, item) => sum + (item.fee || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header - Requested Install Date */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Requested Install Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.requestedInstallDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.requestedInstallDate
                    ? format(formData.requestedInstallDate, "MM/dd/yyyy")
                    : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.requestedInstallDate || undefined}
                  onSelect={(date) => updateField('requestedInstallDate', date || null)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Three-Column Dealer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Originating Dealer */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Originating Dealer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={formData.originatingName}
                onChange={(e) => updateField('originatingName', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bill To Address</Label>
              <Input
                value={formData.originatingBillTo}
                onChange={(e) => updateField('originatingBillTo', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                value={formData.originatingPhone}
                onChange={(e) => updateField('originatingPhone', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ATTN (Sales Rep)</Label>
              <Input
                value={formData.originatingAttn}
                onChange={(e) => updateField('originatingAttn', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                value={formData.originatingEmail}
                onChange={(e) => updateField('originatingEmail', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CCA</Label>
              <Input
                value={formData.originatingCca}
                onChange={(e) => updateField('originatingCca', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Installing Dealer */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Installing Dealer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={formData.installingName}
                onChange={(e) => updateField('installingName', e.target.value)}
                className="h-8 text-sm"
                placeholder="Enter installing dealer name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Address</Label>
              <Input
                value={formData.installingAddress}
                onChange={(e) => updateField('installingAddress', e.target.value)}
                className="h-8 text-sm"
                placeholder="Enter address"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                value={formData.installingPhone}
                onChange={(e) => updateField('installingPhone', e.target.value)}
                className="h-8 text-sm"
                placeholder="Enter phone"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ATTN</Label>
              <Input
                value={formData.installingAttn}
                onChange={(e) => updateField('installingAttn', e.target.value)}
                className="h-8 text-sm"
                placeholder="Enter contact name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                value={formData.installingEmail}
                onChange={(e) => updateField('installingEmail', e.target.value)}
                className="h-8 text-sm"
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CCA</Label>
              <Input
                value={formData.installingCca}
                onChange={(e) => updateField('installingCca', e.target.value)}
                className="h-8 text-sm"
                placeholder="Enter CCA"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customer Installed To */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Customer Installed To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={formData.customerName}
                onChange={(e) => updateField('customerName', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Address</Label>
              <Input
                value={formData.customerAddress}
                onChange={(e) => updateField('customerAddress', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                value={formData.customerPhone}
                onChange={(e) => updateField('customerPhone', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ATTN</Label>
              <Input
                value={formData.customerAttn}
                onChange={(e) => updateField('customerAttn', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                value={formData.customerEmail}
                onChange={(e) => updateField('customerEmail', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fax</Label>
              <Input
                value={formData.customerFax}
                onChange={(e) => updateField('customerFax', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment To Be Installed */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Equipment To Be Installed</CardTitle>
        </CardHeader>
        <CardContent>
          {formData.equipmentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No equipment items available</p>
          ) : (
            <div className="space-y-3">
              {formData.equipmentItems.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateEquipmentItem(index, 'qty', parseInt(e.target.value) || 1)}
                        className="h-8 text-sm text-center"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Vendor Product Code</Label>
                      <Input
                        value={item.vendorProductCode}
                        onChange={(e) => updateEquipmentItem(index, 'vendorProductCode', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateEquipmentItem(index, 'description', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateEquipmentItem(index, 'price', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.cost}
                        onChange={(e) => updateEquipmentItem(index, 'cost', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Fee</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.fee}
                        onChange={(e) => updateEquipmentItem(index, 'fee', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-right font-semibold text-sm pt-2 border-t">
                Total Fee: ${calculateTotalFee().toFixed(2)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Agreement & Removal Equipment Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Service Agreement */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Service Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Base Charge</Label>
                <Input
                  value={formData.serviceBaseCharge}
                  onChange={(e) => updateField('serviceBaseCharge', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="$0.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Includes</Label>
                <Input
                  value={formData.serviceIncludes}
                  onChange={(e) => updateField('serviceIncludes', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="e.g., 5,000 BW"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">CPC/Overage (Black)</Label>
                <Input
                  value={formData.serviceOverageBW}
                  onChange={(e) => updateField('serviceOverageBW', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="$0.0000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CPC/Overage (Color)</Label>
                <Input
                  value={formData.serviceOverageColor}
                  onChange={(e) => updateField('serviceOverageColor', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="$0.0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Frequency</Label>
                <Select
                  value={formData.serviceFrequency}
                  onValueChange={(value) => updateField('serviceFrequency', value)}
                >
                  <SelectTrigger className="h-8 text-sm">
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
              <div className="space-y-1">
                <Label className="text-xs">Bill To</Label>
                <Input
                  value={formData.serviceBillTo}
                  onChange={(e) => updateField('serviceBillTo', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Removal Equipment */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Removal Equipment</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRemovalEquipment}
                disabled={formData.removalEquipment.length >= MAX_REMOVAL_EQUIPMENT}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formData.removalEquipment.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No removal equipment. Click "Add" to add items.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.removalEquipment.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-2 space-y-2 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => removeRemovalEquipment(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <div className="grid grid-cols-12 gap-2 pr-8">
                      <div className="col-span-2">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateRemovalEquipment(index, 'qty', parseInt(e.target.value) || 1)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="col-span-5">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateRemovalEquipment(index, 'description', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Serial</Label>
                        <Input
                          value={item.serial}
                          onChange={(e) => updateRemovalEquipment(index, 'serial', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Meters</Label>
                        <Input
                          value={item.meters}
                          onChange={(e) => updateRemovalEquipment(index, 'meters', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Instructions</Label>
                      <Input
                        value={item.instructions}
                        onChange={(e) => updateRemovalEquipment(index, 'instructions', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Removal instructions..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
