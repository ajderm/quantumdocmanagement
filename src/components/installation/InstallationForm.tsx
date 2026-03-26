import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Package } from 'lucide-react';

export interface RemovedEquipmentItem {
  id: string;
  qty: number;
  itemNumber: string;
  makeModelDescription: string;
  serial: string;
  meterBW: string;
  meterColor: string;
}

export interface LabeledContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface LabeledContacts {
  shippingContact: LabeledContact | null;
  apContact: LabeledContact | null;
  itContact: LabeledContact | null;
}

export interface LinkedAccessoryItem {
  id: string;
  model: string;
  description: string;
  quantity: number;
  productType: string;
  itemNumber?: string;
}

export interface InstallationFormData {
  // Selected line item
  selectedLineItemId: string;
  
  // Installation Report fields
  meterBlack: string;
  meterColor: string;
  meterTotal: string;
  idNumber: string;
  customerNumber: string;
  customerNumberOverride: string;
  salesRep: string;
  meterMethod: string;
  cca: string;
  
  // Customer Ship To
  shipToCompany: string;
  shipToAddress: string;
  shipToCity: string;
  shipToState: string;
  shipToZip: string;
  shipToAttn: string;
  shipToPhone: string;
  shipToEmail: string;
  
  // Customer Bill To
  billToCompany: string;
  billToAddress: string;
  billToCity: string;
  billToState: string;
  billToZip: string;
  billToAttn: string;
  billToPhone: string;
  billToEmail: string;
  
  // Equipment Installed (auto-populated from selected line item)
  installedQty: number;
  installedModel: string;
  installedDescription: string;
  installedItemNumber: string;
  installedSerial: string;
  installedMacAddress: string;
  installedIpAddress: string;
  
  // Linked accessories/software for this hardware
  linkedAccessories: LinkedAccessoryItem[];
  
  // Networking - Dealer Setup Print
  dealerSetupPrint: string;
  printWindowsComputers: string;
  printMacComputers: string;
  allowPrintFromUSB: string;
  allowMobilePrint: string;
  
  // Networking - Dealer Setup Scan
  dealerSetupScan: string;
  scanWindowsComputers: string;
  scanMacComputers: string;
  emailAssigned: string;
  emailPassword: string;
  
  // Additional Contacts
  itContactName: string;
  itContactPhone: string;
  itContactEmail: string;
  meterContactName: string;
  meterContactPhone: string;
  meterContactEmail: string;
  
  // Equipment Removed
  removedEquipment: RemovedEquipmentItem[];
  
  // Removal Instructions
  removalInstructions: string;
}

interface QuoteLineItemRef {
  id: string;
  model: string;
  description: string;
  quantity: number;
  productType?: string;
  parentLineItemId?: string;
}

interface InstallationFormProps {
  deal: any;
  company: any;
  contacts: any[];
  lineItems: any[];
  dealOwner: any;
  meterMethods: string[];
  ccaValue: string;
  onFormChange: (data: InstallationFormData) => void;
  onLineItemSwitch?: (newLineItemId: string, currentFormData: InstallationFormData) => void;
  savedConfig?: InstallationFormData;
  labeledContacts?: LabeledContacts;
  quoteLineItems?: QuoteLineItemRef[];
}

const MAX_REMOVED_EQUIPMENT = 10;

export function InstallationForm({
  deal,
  company,
  contacts,
  lineItems,
  dealOwner,
  meterMethods,
  ccaValue,
  onFormChange,
  onLineItemSwitch,
  savedConfig,
  labeledContacts,
  quoteLineItems,
}: InstallationFormProps) {
  // Helper: check if a line item is hardware
  const isHardware = (item: any): boolean => {
    const type = (item.productType || item.category || item.product_type || item.hs_product_type || '').toLowerCase().trim();
    return type === 'hardware' || type === 'hw';
  };

  // Filter line items to show only hardware
  // Prefer quoteLineItems (live quote data) over raw HubSpot lineItems
  const baseHardwareLineItems = (() => {
    if (quoteLineItems && quoteLineItems.length > 0) {
      // Use quote line items — productType is the field name
      const hwItems = quoteLineItems
        .filter(item => isHardware(item))
        .map(item => ({
          ...item,
          name: item.description,
          sku: item.model,
          category: item.productType,
        }));
      // If no items are explicitly typed as hardware, treat ALL items as installable
      // This handles the case where products from HubSpot don't have hs_product_type set
      if (hwItems.length === 0) {
        return quoteLineItems.map(item => ({
          ...item,
          name: item.description,
          sku: item.model,
          category: item.productType || 'Untyped',
        }));
      }
      return hwItems;
    }
    // Fall back to HubSpot line items
    const hwItems = lineItems.filter(item => isHardware(item));
    if (hwItems.length === 0 && lineItems.length > 0) {
      return lineItems; // Show all if none are typed as hardware
    }
    return hwItems;
  })();

  // Track whether we're showing all items vs just hardware
  const showingAllItems = (() => {
    if (quoteLineItems && quoteLineItems.length > 0) {
      return quoteLineItems.filter(item => isHardware(item)).length === 0 && quoteLineItems.length > 0;
    }
    return lineItems.filter(item => isHardware(item)).length === 0 && lineItems.length > 0;
  })();

  // Expand hardware line items by quantity - each unit gets its own installation doc
  // E.g., "Canon Printer qty:2" becomes "Canon Printer (1 of 2)" and "Canon Printer (2 of 2)"
  const hardwareLineItems = baseHardwareLineItems.flatMap((item) => {
    const qty = item.quantity || 1;
    if (qty <= 1) {
      return [{ ...item, instanceIndex: 1, totalInstances: 1 }];
    }
    return Array.from({ length: qty }, (_, i) => ({
      ...item,
      id: `${item.id}_${i + 1}`, // Create unique ID for each instance
      instanceIndex: i + 1,
      totalInstances: qty,
      quantity: 1, // Each instance represents 1 unit
    }));
  });

  const [formData, setFormData] = useState<InstallationFormData>({
    selectedLineItemId: '',
    meterBlack: '',
    meterColor: '',
    meterTotal: '',
    idNumber: '',
    customerNumber: company?.customerNumber || '',
    customerNumberOverride: '',
    salesRep: dealOwner ? `${dealOwner.firstName || ''} ${dealOwner.lastName || ''}`.trim() : '',
    meterMethod: '',
    cca: ccaValue || '',
    // Ship To - use delivery address fields from HubSpot
    shipToCompany: company?.name || '',
    shipToAddress: company?.deliveryAddress || company?.address || '',
    shipToCity: company?.deliveryCity || company?.city || '',
    shipToState: company?.deliveryState || company?.state || '',
    shipToZip: company?.deliveryZip || company?.zip || '',
    shipToAttn: '',
    shipToPhone: '',
    shipToEmail: '',
    // Bill To - use AP address fields from HubSpot
    billToCompany: company?.name || '',
    billToAddress: company?.apAddress || company?.address || '',
    billToCity: company?.apCity || company?.city || '',
    billToState: company?.apState || company?.state || '',
    billToZip: company?.apZip || company?.zip || '',
    billToAttn: '',
    billToPhone: '',
    billToEmail: '',
    installedQty: 1,
    installedModel: '',
    installedDescription: '',
    installedItemNumber: '',
    installedSerial: '',
    installedMacAddress: '',
    installedIpAddress: '',
    dealerSetupPrint: '',
    printWindowsComputers: '',
    printMacComputers: '',
    allowPrintFromUSB: '',
    allowMobilePrint: '',
    dealerSetupScan: '',
    scanWindowsComputers: '',
    scanMacComputers: '',
    emailAssigned: '',
    emailPassword: '',
    itContactName: '',
    itContactPhone: '',
    itContactEmail: '',
    meterContactName: '',
    meterContactPhone: '',
    meterContactEmail: '',
    removedEquipment: [],
    removalInstructions: '',
    linkedAccessories: [],
  });

  // Load saved config
  useEffect(() => {
    if (savedConfig) {
      setFormData(prev => ({
        ...prev,
        ...savedConfig,
        // Keep fresh HubSpot data for certain fields if not overridden
        salesRep: savedConfig.salesRep || (dealOwner ? `${dealOwner.firstName || ''} ${dealOwner.lastName || ''}`.trim() : ''),
        cca: savedConfig.cca || ccaValue || '',
        customerNumber: savedConfig.customerNumber || company?.customerNumber || '',
        // Use saved config for addresses, but fall back to HubSpot data if empty
        shipToAddress: savedConfig.shipToAddress || company?.deliveryAddress || company?.address || '',
        shipToCity: savedConfig.shipToCity || company?.deliveryCity || company?.city || '',
        shipToState: savedConfig.shipToState || company?.deliveryState || company?.state || '',
        shipToZip: savedConfig.shipToZip || company?.deliveryZip || company?.zip || '',
        billToAddress: savedConfig.billToAddress || company?.apAddress || company?.address || '',
        billToCity: savedConfig.billToCity || company?.apCity || company?.city || '',
        billToState: savedConfig.billToState || company?.apState || company?.state || '',
        billToZip: savedConfig.billToZip || company?.apZip || company?.zip || '',
      }));
    }
  }, [savedConfig, dealOwner, ccaValue, company]);

  // Update customer number when company data loads
  useEffect(() => {
    if (company?.customerNumber && !formData.customerNumber && !formData.customerNumberOverride) {
      setFormData(prev => ({
        ...prev,
        customerNumber: company.customerNumber
      }));
    }
  }, [company?.customerNumber]);

  // Pre-fill labeled contacts (Ship To, Bill To, IT Contact) when available
  // Apply labeled contacts to fill empty fields - check saved config values too
  // Pre-fill labeled contacts - runs after initial load to fill empty fields
  useEffect(() => {
    if (!labeledContacts) return;
    
    // Small delay to ensure savedConfig has been applied first
    const timer = setTimeout(() => {
      setFormData(prev => {
        const updates: Partial<InstallationFormData> = {};

        // Shipping contact -> Ship To ATTN, Email, Phone
        if (labeledContacts.shippingContact) {
          const c = labeledContacts.shippingContact;
          // Apply if current value is empty (regardless of savedConfig - we want fresh data if empty)
          if (!prev.shipToAttn || prev.shipToAttn.trim() === '') {
            const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
            if (name) updates.shipToAttn = name;
          }
          if (!prev.shipToEmail || prev.shipToEmail.trim() === '') {
            if (c.email) updates.shipToEmail = c.email;
          }
          if (!prev.shipToPhone || prev.shipToPhone.trim() === '') {
            if (c.phone) updates.shipToPhone = c.phone;
          }
        }

        // AP contact -> Bill To ATTN, Email, Phone
        if (labeledContacts.apContact) {
          const c = labeledContacts.apContact;
          if (!prev.billToAttn || prev.billToAttn.trim() === '') {
            const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
            if (name) updates.billToAttn = name;
          }
          if (!prev.billToEmail || prev.billToEmail.trim() === '') {
            if (c.email) updates.billToEmail = c.email;
          }
          if (!prev.billToPhone || prev.billToPhone.trim() === '') {
            if (c.phone) updates.billToPhone = c.phone;
          }
        }

        // IT contact -> IT Contact fields
        if (labeledContacts.itContact) {
          const c = labeledContacts.itContact;
          if (!prev.itContactName || prev.itContactName.trim() === '') {
            const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
            if (name) updates.itContactName = name;
          }
          if (!prev.itContactEmail || prev.itContactEmail.trim() === '') {
            if (c.email) updates.itContactEmail = c.email;
          }
          if (!prev.itContactPhone || prev.itContactPhone.trim() === '') {
            if (c.phone) updates.itContactPhone = c.phone;
          }
        }

        if (Object.keys(updates).length > 0) {
          console.log('Applying labeled contacts:', updates);
          return { ...prev, ...updates };
        }
        return prev;
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [labeledContacts]);

  // Update form when line item is selected
  useEffect(() => {
    if (formData.selectedLineItemId) {
      // Use hardwareLineItems to find expanded items (e.g., id_1, id_2 for qty > 1)
      const selectedItem = hardwareLineItems.find(item => item.id === formData.selectedLineItemId);
      if (selectedItem) {
        // Find linked accessories from quote line items
        // For expanded items (id_1, id_2), match on the base ID (before the underscore)
        const baseId = formData.selectedLineItemId.includes('_') 
          ? formData.selectedLineItemId.split('_').slice(0, -1).join('_')
          : formData.selectedLineItemId;
        
        const accessories: LinkedAccessoryItem[] = (quoteLineItems || [])
          .filter(ql => ql.parentLineItemId === baseId || ql.parentLineItemId === formData.selectedLineItemId)
          .map(ql => ({
            id: ql.id,
            model: ql.model,
            description: ql.description,
            quantity: ql.quantity,
            productType: ql.productType || '',
            itemNumber: ql.itemNumber || '',
          }));

        setFormData(prev => ({
          ...prev,
          installedQty: selectedItem.quantity || 1,
          installedModel: selectedItem.model || selectedItem.sku || '',
          installedDescription: selectedItem.description || selectedItem.name || '',
          installedItemNumber: selectedItem.itemNumber || '',
          linkedAccessories: accessories,
        }));
      }
    }
  }, [formData.selectedLineItemId, lineItems, quoteLineItems]);

  // Notify parent of changes
  useEffect(() => {
    onFormChange(formData);
  }, [formData, onFormChange]);

  const updateField = <K extends keyof InstallationFormData>(field: K, value: InstallationFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLineItemChange = useCallback((newLineItemId: string) => {
    // If switching items and there's current data, notify parent to save first
    if (formData.selectedLineItemId && formData.selectedLineItemId !== newLineItemId && onLineItemSwitch) {
      onLineItemSwitch(newLineItemId, formData);
    }
    updateField('selectedLineItemId', newLineItemId);
  }, [formData, onLineItemSwitch]);

  const addRemovedEquipment = () => {
    if (formData.removedEquipment.length >= MAX_REMOVED_EQUIPMENT) {
      return;
    }
    setFormData(prev => ({
      ...prev,
      removedEquipment: [
        ...prev.removedEquipment,
        {
          id: `removed-${Date.now()}`,
          qty: 1,
          itemNumber: '',
          makeModelDescription: '',
          serial: '',
          meterBW: '',
          meterColor: '',
        },
      ],
    }));
  };

  const updateRemovedEquipment = (index: number, field: keyof RemovedEquipmentItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.removedEquipment];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, removedEquipment: newItems };
    });
  };

  const removeRemovedEquipment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      removedEquipment: prev.removedEquipment.filter((_, i) => i !== index),
    }));
  };

  const getEffectiveCustomerNumber = () => {
    return formData.customerNumberOverride || formData.customerNumber || '';
  };

  return (
    <div className="space-y-6">
      {/* Hardware Item Selector */}
      <Card className="border-primary/20">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            {showingAllItems ? 'Select Line Item' : 'Select Hardware Item'}
            <Badge variant="secondary" className="ml-auto">
              {hardwareLineItems.length} {showingAllItems ? 'item' : 'hardware item'}{hardwareLineItems.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          {showingAllItems && (
            <p className="text-xs text-amber-600 mt-1">Tip: Set the Type column to "Hardware" on the Quote tab to separate hardware from accessories for grouped install docs.</p>
          )}
        </CardHeader>
        <CardContent className="py-3">
          <Select
            value={formData.selectedLineItemId}
            onValueChange={handleLineItemChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a hardware item to create installation doc..." />
            </SelectTrigger>
            <SelectContent>
              {hardwareLineItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.model || item.sku || item.name}
                  {item.totalInstances > 1 ? ` (${item.instanceIndex} of ${item.totalInstances})` : ''}
                  {' - '}{item.description || item.name}
                </SelectItem>
              ))}
              {hardwareLineItems.length === 0 && (
                <SelectItem value="none" disabled>
                  No hardware items found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {formData.selectedLineItemId && (
        <>
          {/* Installation Report Section */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Installation Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Meter (Black)</Label>
                  <Input
                    value={formData.meterBlack}
                    onChange={(e) => updateField('meterBlack', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Meter (Color)</Label>
                  <Input
                    value={formData.meterColor}
                    onChange={(e) => updateField('meterColor', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Meter (Total)</Label>
                  <Input
                    value={formData.meterTotal}
                    onChange={(e) => updateField('meterTotal', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">ID Number</Label>
                  <Input
                    value={formData.idNumber}
                    onChange={(e) => updateField('idNumber', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Customer Number</Label>
                  <Input
                    value={getEffectiveCustomerNumber() || ''}
                    onChange={(e) => updateField('customerNumberOverride', e.target.value)}
                    className="h-8 text-sm"
                    placeholder={formData.customerNumber || 'From HubSpot'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Sales Rep</Label>
                  <Input
                    value={formData.salesRep}
                    onChange={(e) => updateField('salesRep', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Meter Method</Label>
                  <Select
                    value={formData.meterMethod}
                    onValueChange={(value) => updateField('meterMethod', value)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {meterMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))
                      }
                      {meterMethods.length === 0 && (
                        <SelectItem value="none" disabled>
                          Configure in Settings
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">CCA</Label>
                <Input
                  value={formData.cca}
                  onChange={(e) => updateField('cca', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Equipment Installed Section */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Equipment (Installed)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    value={formData.installedQty}
                    onChange={(e) => updateField('installedQty', parseInt(e.target.value) || 1)}
                    className="h-8 text-sm text-center"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Model</Label>
                  <Input
                    value={formData.installedModel}
                    onChange={(e) => updateField('installedModel', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-8">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={formData.installedDescription}
                    onChange={(e) => updateField('installedDescription', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Serial #</Label>
                  <Input
                    value={formData.installedSerial}
                    onChange={(e) => updateField('installedSerial', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">MAC Address</Label>
                  <Input
                    value={formData.installedMacAddress}
                    onChange={(e) => updateField('installedMacAddress', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">IP Address</Label>
                  <Input
                    value={formData.installedIpAddress}
                    onChange={(e) => updateField('installedIpAddress', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              
              {/* Linked Accessories */}
              {formData.linkedAccessories.length > 0 && (
                <div className="mt-4">
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">Linked Accessories / Software</Label>
                  <div className="space-y-1">
                    {formData.linkedAccessories.map((acc) => (
                      <div key={acc.id} className="grid grid-cols-12 gap-3 items-center bg-muted/30 rounded px-2 py-1">
                        <div className="col-span-1 text-xs text-center">{acc.quantity}</div>
                        <div className="col-span-3 text-xs">{acc.model}</div>
                        <div className="col-span-6 text-xs text-muted-foreground">{acc.description}</div>
                        <div className="col-span-2">
                          <Badge variant="secondary" className="text-[10px]">{acc.productType}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Customer Ship To / Bill To */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Customer Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground">Ship To</h4>
                  <div>
                    <Label className="text-xs">Company</Label>
                    <Input value={formData.shipToCompany} onChange={(e) => updateField('shipToCompany', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Input value={formData.shipToAddress} onChange={(e) => updateField('shipToAddress', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={formData.shipToCity} onChange={(e) => updateField('shipToCity', e.target.value)} className="h-8 text-sm" placeholder="City" />
                    <Input value={formData.shipToState} onChange={(e) => updateField('shipToState', e.target.value)} className="h-8 text-sm" placeholder="State" />
                    <Input value={formData.shipToZip} onChange={(e) => updateField('shipToZip', e.target.value)} className="h-8 text-sm" placeholder="ZIP" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">ATTN</Label>
                      <Input value={formData.shipToAttn} onChange={(e) => updateField('shipToAttn', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input value={formData.shipToPhone} onChange={(e) => updateField('shipToPhone', e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={formData.shipToEmail} onChange={(e) => updateField('shipToEmail', e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground">Bill To</h4>
                  <div>
                    <Label className="text-xs">Company</Label>
                    <Input value={formData.billToCompany} onChange={(e) => updateField('billToCompany', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Input value={formData.billToAddress} onChange={(e) => updateField('billToAddress', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={formData.billToCity} onChange={(e) => updateField('billToCity', e.target.value)} className="h-8 text-sm" placeholder="City" />
                    <Input value={formData.billToState} onChange={(e) => updateField('billToState', e.target.value)} className="h-8 text-sm" placeholder="State" />
                    <Input value={formData.billToZip} onChange={(e) => updateField('billToZip', e.target.value)} className="h-8 text-sm" placeholder="ZIP" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">ATTN</Label>
                      <Input value={formData.billToAttn} onChange={(e) => updateField('billToAttn', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input value={formData.billToPhone} onChange={(e) => updateField('billToPhone', e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={formData.billToEmail} onChange={(e) => updateField('billToEmail', e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Networking */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Networking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Dealer Setup - Print */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground">Dealer Setup - Print</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Dealer Setup Print</Label>
                      <Select value={formData.dealerSetupPrint} onValueChange={(v) => updateField('dealerSetupPrint', v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Windows Computers</Label>
                      <Input 
                        type="number" 
                        min="0"
                        value={formData.printWindowsComputers} 
                        onChange={(e) => updateField('printWindowsComputers', e.target.value)} 
                        className="h-8 text-sm" 
                        placeholder="0" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Mac Computers</Label>
                      <Input 
                        type="number" 
                        min="0"
                        value={formData.printMacComputers} 
                        onChange={(e) => updateField('printMacComputers', e.target.value)} 
                        className="h-8 text-sm" 
                        placeholder="0" 
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Allow Print From USB</Label>
                      <Select value={formData.allowPrintFromUSB} onValueChange={(v) => updateField('allowPrintFromUSB', v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Allow Mobile Print</Label>
                    <Select value={formData.allowMobilePrint} onValueChange={(v) => updateField('allowMobilePrint', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dealer Setup - Scan */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground">Dealer Setup - Scan</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Dealer Setup Scan</Label>
                      <Select value={formData.dealerSetupScan} onValueChange={(v) => updateField('dealerSetupScan', v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Windows Computers</Label>
                      <Input 
                        type="number" 
                        min="0"
                        value={formData.scanWindowsComputers} 
                        onChange={(e) => updateField('scanWindowsComputers', e.target.value)} 
                        className="h-8 text-sm" 
                        placeholder="0" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Mac Computers</Label>
                      <Input 
                        type="number" 
                        min="0"
                        value={formData.scanMacComputers} 
                        onChange={(e) => updateField('scanMacComputers', e.target.value)} 
                        className="h-8 text-sm" 
                        placeholder="0" 
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Email Assigned to Copier</Label>
                      <Input value={formData.emailAssigned} onChange={(e) => updateField('emailAssigned', e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Password</Label>
                    <Input value={formData.emailPassword} onChange={(e) => updateField('emailPassword', e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Contacts */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Additional Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">IT Contact</Label>
                  <Input value={formData.itContactName} onChange={(e) => updateField('itContactName', e.target.value)} className="h-8 text-sm" placeholder="Name" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={formData.itContactPhone} onChange={(e) => updateField('itContactPhone', e.target.value)} className="h-8 text-sm" placeholder="Phone" />
                    <Input value={formData.itContactEmail} onChange={(e) => updateField('itContactEmail', e.target.value)} className="h-8 text-sm" placeholder="Email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Meter Contact</Label>
                  <Input value={formData.meterContactName} onChange={(e) => updateField('meterContactName', e.target.value)} className="h-8 text-sm" placeholder="Name" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={formData.meterContactPhone} onChange={(e) => updateField('meterContactPhone', e.target.value)} className="h-8 text-sm" placeholder="Phone" />
                    <Input value={formData.meterContactEmail} onChange={(e) => updateField('meterContactEmail', e.target.value)} className="h-8 text-sm" placeholder="Email" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Equipment Removed */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Equipment (Removed)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formData.removedEquipment.length}/{MAX_REMOVED_EQUIPMENT}
                  </span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addRemovedEquipment}
                    disabled={formData.removedEquipment.length >= MAX_REMOVED_EQUIPMENT}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.removedEquipment.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No removed equipment</p>
              ) : (
                <div className="space-y-2">
                  {formData.removedEquipment.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-7 gap-2 items-end">
                      <div>
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" value={item.qty} onChange={(e) => updateRemovedEquipment(index, 'qty', parseInt(e.target.value) || 1)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Item #</Label>
                        <Input value={item.itemNumber} onChange={(e) => updateRemovedEquipment(index, 'itemNumber', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Make/Model/Description</Label>
                        <Input value={item.makeModelDescription} onChange={(e) => updateRemovedEquipment(index, 'makeModelDescription', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Serial</Label>
                        <Input value={item.serial} onChange={(e) => updateRemovedEquipment(index, 'serial', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Meter (BW)</Label>
                        <Input value={item.meterBW} onChange={(e) => updateRemovedEquipment(index, 'meterBW', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1">
                          <Label className="text-xs">Meter (COL)</Label>
                          <Input value={item.meterColor} onChange={(e) => updateRemovedEquipment(index, 'meterColor', e.target.value)} className="h-8 text-sm" />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-5 text-destructive" onClick={() => removeRemovedEquipment(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Removal Instructions */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Removal Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.removalInstructions}
                onChange={(e) => updateField('removalInstructions', e.target.value)}
                placeholder="Enter removal instructions..."
                className="min-h-[80px]"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
