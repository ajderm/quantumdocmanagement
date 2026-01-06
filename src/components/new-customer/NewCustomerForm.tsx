import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface BankReference {
  id: string;
  bankName: string;
  address: string;
  cityStZip: string;
  contact: string;
  phone: string;
  accountNumber: string;
}

export interface BusinessReference {
  id: string;
  company: string;
  contact: string;
  title: string;
  phone: string;
  email: string;
}

export interface NewCustomerFormData {
  // Customer Information
  companyName: string;
  tradeName: string;
  businessDescription: string;
  taxId: string;
  taxIdState: string;
  yearEstablished: string;
  yearsOwned: string;
  creditRequested: string;
  businessType: 'corporation' | 'llc' | 'sole_proprietor' | 'partnership' | 'non_profit' | 'government' | '';
  
  // Headquarters Address
  hqAddress: string;
  hqAddress2: string;
  hqCity: string;
  hqState: string;
  hqZip: string;
  hqPhone: string;
  hqFax: string;
  hqEmail: string;
  
  // Branch Office
  branchSameAsHq: boolean;
  branchAddress: string;
  branchAddress2: string;
  branchCity: string;
  branchState: string;
  branchZip: string;
  branchPhone: string;
  branchFax: string;
  branchEmail: string;
  
  // Billing Office
  billingSameAsHq: boolean;
  billingSameAsBranch: boolean;
  billingAddress: string;
  billingAddress2: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingPhone: string;
  billingFax: string;
  billingEmail: string;
  
  // Contacts
  principalName: string;
  principalTitle: string;
  principalPhone: string;
  principalEmail: string;
  
  equipmentContactName: string;
  equipmentContactTitle: string;
  equipmentContactPhone: string;
  equipmentContactEmail: string;
  
  apContactName: string;
  apContactTitle: string;
  apContactPhone: string;
  apContactEmail: string;
  
  // Interests
  interestOfficeMachines: boolean;
  interestFurniture: boolean;
  interestSupplies: boolean;
  interestOther: string;
  
  // References
  bankReferences: BankReference[];
  businessReferences: BusinessReference[];
  
  // Invoicing Preferences
  invoiceDelivery: 'mail' | 'email' | 'both';
  invoiceEmail: string;
  invoiceSecondaryEmail: string;
  
  // Payment Options
  paymentMethod: 'check' | 'credit_card' | 'eft_ach' | '';
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

interface NewCustomerFormProps {
  formData: NewCustomerFormData;
  onChange: (data: NewCustomerFormData) => void;
  company: {
    name?: string;
    phone?: string;
    address?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    deliveryAddress?: string;
    deliveryCity?: string;
    deliveryState?: string;
    deliveryZip?: string;
    apAddress?: string;
    apCity?: string;
    apState?: string;
    apZip?: string;
  } | null;
  dealOwner: { firstName?: string; lastName?: string; email?: string; phone?: string } | null;
  labeledContacts?: LabeledContacts;
  savedConfig: NewCustomerFormData | null;
  onClearAll: () => void;
}

const BUSINESS_TYPES = [
  { value: 'corporation', label: 'Corporation' },
  { value: 'llc', label: 'LLC' },
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'non_profit', label: 'Non-Profit' },
  { value: 'government', label: 'Government' },
];

export function NewCustomerForm({
  formData,
  onChange,
  company,
  dealOwner,
  labeledContacts,
  savedConfig,
  onClearAll,
}: NewCustomerFormProps) {
  const hasInitializedRef = useRef(false);

  // Initialize form from saved config and HubSpot data
  useEffect(() => {
    if (hasInitializedRef.current) return;

    const fillIfEmpty = (current: string, next: string) =>
      current?.trim() ? current : next;

    const base = savedConfig ? { ...formData, ...savedConfig } : { ...formData };

    // Build default values from HubSpot
    const principalName = dealOwner ? `${dealOwner.firstName || ''} ${dealOwner.lastName || ''}`.trim() : '';
    const shippingContactName = labeledContacts?.shippingContact 
      ? `${labeledContacts.shippingContact.firstName || ''} ${labeledContacts.shippingContact.lastName || ''}`.trim() 
      : '';
    const apContactName = labeledContacts?.apContact 
      ? `${labeledContacts.apContact.firstName || ''} ${labeledContacts.apContact.lastName || ''}`.trim() 
      : '';

    onChange({
      ...base,
      companyName: fillIfEmpty(base.companyName, company?.name || ''),
      hqAddress: fillIfEmpty(base.hqAddress, company?.address || ''),
      hqAddress2: fillIfEmpty(base.hqAddress2, company?.address2 || ''),
      hqCity: fillIfEmpty(base.hqCity, company?.city || ''),
      hqState: fillIfEmpty(base.hqState, company?.state || ''),
      hqZip: fillIfEmpty(base.hqZip, company?.zip || ''),
      hqPhone: fillIfEmpty(base.hqPhone, company?.phone || ''),
      
      branchAddress: fillIfEmpty(base.branchAddress, company?.deliveryAddress || ''),
      branchCity: fillIfEmpty(base.branchCity, company?.deliveryCity || ''),
      branchState: fillIfEmpty(base.branchState, company?.deliveryState || ''),
      branchZip: fillIfEmpty(base.branchZip, company?.deliveryZip || ''),
      
      billingAddress: fillIfEmpty(base.billingAddress, company?.apAddress || ''),
      billingCity: fillIfEmpty(base.billingCity, company?.apCity || ''),
      billingState: fillIfEmpty(base.billingState, company?.apState || ''),
      billingZip: fillIfEmpty(base.billingZip, company?.apZip || ''),
      
      principalName: fillIfEmpty(base.principalName, principalName),
      principalEmail: fillIfEmpty(base.principalEmail, dealOwner?.email || ''),
      principalPhone: fillIfEmpty(base.principalPhone, dealOwner?.phone || ''),
      
      equipmentContactName: fillIfEmpty(base.equipmentContactName, shippingContactName),
      equipmentContactEmail: fillIfEmpty(base.equipmentContactEmail, labeledContacts?.shippingContact?.email || ''),
      equipmentContactPhone: fillIfEmpty(base.equipmentContactPhone, labeledContacts?.shippingContact?.phone || ''),
      
      apContactName: fillIfEmpty(base.apContactName, apContactName),
      apContactEmail: fillIfEmpty(base.apContactEmail, labeledContacts?.apContact?.email || ''),
      apContactPhone: fillIfEmpty(base.apContactPhone, labeledContacts?.apContact?.phone || ''),
      
      bankReferences: base.bankReferences?.length > 0 ? base.bankReferences : [
        { id: 'bank-1', bankName: '', address: '', cityStZip: '', contact: '', phone: '', accountNumber: '' },
        { id: 'bank-2', bankName: '', address: '', cityStZip: '', contact: '', phone: '', accountNumber: '' },
      ],
      businessReferences: base.businessReferences?.length > 0 ? base.businessReferences : [
        { id: 'biz-1', company: '', contact: '', title: '', phone: '', email: '' },
        { id: 'biz-2', company: '', contact: '', title: '', phone: '', email: '' },
      ],
    });

    hasInitializedRef.current = true;
  }, [savedConfig, company, dealOwner, labeledContacts]);

  const updateField = <K extends keyof NewCustomerFormData>(field: K, value: NewCustomerFormData[K]) => {
    onChange({ ...formData, [field]: value });
  };

  const updateBankReference = (index: number, field: keyof BankReference, value: string) => {
    const newRefs = [...formData.bankReferences];
    newRefs[index] = { ...newRefs[index], [field]: value };
    onChange({ ...formData, bankReferences: newRefs });
  };

  const updateBusinessReference = (index: number, field: keyof BusinessReference, value: string) => {
    const newRefs = [...formData.businessReferences];
    newRefs[index] = { ...newRefs[index], [field]: value };
    onChange({ ...formData, businessReferences: newRefs });
  };

  // Handler for Branch Same as HQ toggle
  const handleBranchSameAsHq = (checked: boolean) => {
    if (checked) {
      onChange({
        ...formData,
        branchSameAsHq: true,
        branchAddress: formData.hqAddress,
        branchAddress2: formData.hqAddress2,
        branchCity: formData.hqCity,
        branchState: formData.hqState,
        branchZip: formData.hqZip,
        branchPhone: formData.hqPhone,
        branchFax: formData.hqFax,
        branchEmail: formData.hqEmail,
      });
    } else {
      onChange({ ...formData, branchSameAsHq: false });
    }
  };

  // Handler for Billing Same as HQ toggle
  const handleBillingSameAsHq = (checked: boolean) => {
    if (checked) {
      onChange({
        ...formData,
        billingSameAsHq: true,
        billingSameAsBranch: false,
        billingAddress: formData.hqAddress,
        billingAddress2: formData.hqAddress2,
        billingCity: formData.hqCity,
        billingState: formData.hqState,
        billingZip: formData.hqZip,
        billingPhone: formData.hqPhone,
        billingFax: formData.hqFax,
        billingEmail: formData.hqEmail,
      });
    } else {
      onChange({ ...formData, billingSameAsHq: false });
    }
  };

  // Handler for Billing Same as Branch toggle
  const handleBillingSameAsBranch = (checked: boolean) => {
    if (checked) {
      onChange({
        ...formData,
        billingSameAsBranch: true,
        billingSameAsHq: false,
        billingAddress: formData.branchAddress,
        billingAddress2: formData.branchAddress2,
        billingCity: formData.branchCity,
        billingState: formData.branchState,
        billingZip: formData.branchZip,
        billingPhone: formData.branchPhone,
        billingFax: formData.branchFax,
        billingEmail: formData.branchEmail,
      });
    } else {
      onChange({ ...formData, billingSameAsBranch: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* Clear All Button */}
      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Clear All Data?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all form data. You can print a blank form after clearing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onClearAll}>Clear All</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Company Legal Name</Label>
              <Input value={formData.companyName} onChange={e => updateField('companyName', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Trade Name (DBA)</Label>
              <Input value={formData.tradeName} onChange={e => updateField('tradeName', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Description of Business</Label>
            <Input value={formData.businessDescription} onChange={e => updateField('businessDescription', e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Tax ID #</Label>
              <Input value={formData.taxId} onChange={e => updateField('taxId', e.target.value)} className="h-8 text-sm" placeholder="XX-XXXXXXX" />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={formData.taxIdState} onChange={e => updateField('taxIdState', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Year Established</Label>
              <Input value={formData.yearEstablished} onChange={e => updateField('yearEstablished', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Years Owned</Label>
              <Input value={formData.yearsOwned} onChange={e => updateField('yearsOwned', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Credit Requested</Label>
              <Input value={formData.creditRequested} onChange={e => updateField('creditRequested', e.target.value)} className="h-8 text-sm" placeholder="$" />
            </div>
            <div>
              <Label className="text-xs">Business Type</Label>
              <Select value={formData.businessType} onValueChange={v => updateField('businessType', v as NewCustomerFormData['businessType'])}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addresses - Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Headquarters */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Headquarters Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Address</Label><Input value={formData.hqAddress} onChange={e => updateField('hqAddress', e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Address 2</Label><Input value={formData.hqAddress2} onChange={e => updateField('hqAddress2', e.target.value)} className="h-8 text-sm" /></div>
            <div className="grid grid-cols-3 gap-2">
              <Input value={formData.hqCity} onChange={e => updateField('hqCity', e.target.value)} className="h-8 text-sm" placeholder="City" />
              <Input value={formData.hqState} onChange={e => updateField('hqState', e.target.value)} className="h-8 text-sm" placeholder="State" />
              <Input value={formData.hqZip} onChange={e => updateField('hqZip', e.target.value)} className="h-8 text-sm" placeholder="ZIP" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Phone</Label><Input value={formData.hqPhone} onChange={e => updateField('hqPhone', e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Fax</Label><Input value={formData.hqFax} onChange={e => updateField('hqFax', e.target.value)} className="h-8 text-sm" /></div>
            </div>
            <div><Label className="text-xs">Email</Label><Input value={formData.hqEmail} onChange={e => updateField('hqEmail', e.target.value)} className="h-8 text-sm" /></div>
          </CardContent>
        </Card>

        {/* Branch Office */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Branch Office</span>
              <div className="flex items-center gap-2">
                <Checkbox id="branchSameAsHq" checked={formData.branchSameAsHq} onCheckedChange={c => handleBranchSameAsHq(!!c)} />
                <Label htmlFor="branchSameAsHq" className="text-xs font-normal">Same as HQ</Label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Address</Label><Input value={formData.branchAddress} onChange={e => updateField('branchAddress', e.target.value)} className="h-8 text-sm" disabled={formData.branchSameAsHq} /></div>
            <div><Label className="text-xs">Address 2</Label><Input value={formData.branchAddress2} onChange={e => updateField('branchAddress2', e.target.value)} className="h-8 text-sm" disabled={formData.branchSameAsHq} /></div>
            <div className="grid grid-cols-3 gap-2">
              <Input value={formData.branchCity} onChange={e => updateField('branchCity', e.target.value)} className="h-8 text-sm" placeholder="City" disabled={formData.branchSameAsHq} />
              <Input value={formData.branchState} onChange={e => updateField('branchState', e.target.value)} className="h-8 text-sm" placeholder="State" disabled={formData.branchSameAsHq} />
              <Input value={formData.branchZip} onChange={e => updateField('branchZip', e.target.value)} className="h-8 text-sm" placeholder="ZIP" disabled={formData.branchSameAsHq} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Phone</Label><Input value={formData.branchPhone} onChange={e => updateField('branchPhone', e.target.value)} className="h-8 text-sm" disabled={formData.branchSameAsHq} /></div>
              <div><Label className="text-xs">Fax</Label><Input value={formData.branchFax} onChange={e => updateField('branchFax', e.target.value)} className="h-8 text-sm" disabled={formData.branchSameAsHq} /></div>
            </div>
            <div><Label className="text-xs">Email</Label><Input value={formData.branchEmail} onChange={e => updateField('branchEmail', e.target.value)} className="h-8 text-sm" disabled={formData.branchSameAsHq} /></div>
          </CardContent>
        </Card>

        {/* Billing Office */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Billing Office</span>
              <div className="flex items-center gap-2">
                <Checkbox id="billingSameAsHq" checked={formData.billingSameAsHq} onCheckedChange={c => handleBillingSameAsHq(!!c)} />
                <Label htmlFor="billingSameAsHq" className="text-xs font-normal">HQ</Label>
                <Checkbox id="billingSameAsBranch" checked={formData.billingSameAsBranch} onCheckedChange={c => handleBillingSameAsBranch(!!c)} />
                <Label htmlFor="billingSameAsBranch" className="text-xs font-normal">Branch</Label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Address</Label><Input value={formData.billingAddress} onChange={e => updateField('billingAddress', e.target.value)} className="h-8 text-sm" disabled={formData.billingSameAsHq || formData.billingSameAsBranch} /></div>
            <div><Label className="text-xs">Address 2</Label><Input value={formData.billingAddress2} onChange={e => updateField('billingAddress2', e.target.value)} className="h-8 text-sm" disabled={formData.billingSameAsHq || formData.billingSameAsBranch} /></div>
            <div className="grid grid-cols-3 gap-2">
              <Input value={formData.billingCity} onChange={e => updateField('billingCity', e.target.value)} className="h-8 text-sm" placeholder="City" disabled={formData.billingSameAsHq || formData.billingSameAsBranch} />
              <Input value={formData.billingState} onChange={e => updateField('billingState', e.target.value)} className="h-8 text-sm" placeholder="State" disabled={formData.billingSameAsHq || formData.billingSameAsBranch} />
              <Input value={formData.billingZip} onChange={e => updateField('billingZip', e.target.value)} className="h-8 text-sm" placeholder="ZIP" disabled={formData.billingSameAsHq || formData.billingSameAsBranch} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Phone</Label><Input value={formData.billingPhone} onChange={e => updateField('billingPhone', e.target.value)} className="h-8 text-sm" disabled={formData.billingSameAsHq || formData.billingSameAsBranch} /></div>
              <div><Label className="text-xs">Fax</Label><Input value={formData.billingFax} onChange={e => updateField('billingFax', e.target.value)} className="h-8 text-sm" disabled={formData.billingSameAsHq || formData.billingSameAsBranch} /></div>
            </div>
            <div><Label className="text-xs">Email</Label><Input value={formData.billingEmail} onChange={e => updateField('billingEmail', e.target.value)} className="h-8 text-sm" disabled={formData.billingSameAsHq || formData.billingSameAsBranch} /></div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts - Three Column Layout */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Principal */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground">Principal / Owner</h4>
              <div><Label className="text-xs">Name</Label><Input value={formData.principalName} onChange={e => updateField('principalName', e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Title</Label><Input value={formData.principalTitle} onChange={e => updateField('principalTitle', e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Phone</Label><Input value={formData.principalPhone} onChange={e => updateField('principalPhone', e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Email</Label><Input value={formData.principalEmail} onChange={e => updateField('principalEmail', e.target.value)} className="h-8 text-sm" /></div>
            </div>
            {/* Equipment Contact */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground">Equipment / Meter Contact</h4>
              <div><Label className="text-xs">Name</Label><Input value={formData.equipmentContactName} onChange={e => updateField('equipmentContactName', e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Title</Label><Input value={formData.equipmentContactTitle} onChange={e => updateField('equipmentContactTitle', e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Phone</Label><Input value={formData.equipmentContactPhone} onChange={e => updateField('equipmentContactPhone', e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Email</Label><Input value={formData.equipmentContactEmail} onChange={e => updateField('equipmentContactEmail', e.target.value)} className="h-8 text-sm" /></div>
            </div>
            {/* AP Contact */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground">Accounts Payable Contact</h4>
              <div><Label className="text-xs">Name</Label><Input value={formData.apContactName} onChange={e => updateField('apContactName', e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Title</Label><Input value={formData.apContactTitle} onChange={e => updateField('apContactTitle', e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Phone</Label><Input value={formData.apContactPhone} onChange={e => updateField('apContactPhone', e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Email</Label><Input value={formData.apContactEmail} onChange={e => updateField('apContactEmail', e.target.value)} className="h-8 text-sm" /></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Interests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="interestOfficeMachines" checked={formData.interestOfficeMachines} onCheckedChange={c => updateField('interestOfficeMachines', !!c)} />
              <Label htmlFor="interestOfficeMachines" className="text-sm">Office Machines</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="interestFurniture" checked={formData.interestFurniture} onCheckedChange={c => updateField('interestFurniture', !!c)} />
              <Label htmlFor="interestFurniture" className="text-sm">Furniture</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="interestSupplies" checked={formData.interestSupplies} onCheckedChange={c => updateField('interestSupplies', !!c)} />
              <Label htmlFor="interestSupplies" className="text-sm">Supplies</Label>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Label className="text-sm whitespace-nowrap">Other:</Label>
              <Input value={formData.interestOther} onChange={e => updateField('interestOther', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* References */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bank References */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Bank References</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.bankReferences.map((ref, index) => (
              <div key={ref.id} className="border rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Bank Reference {index + 1}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Bank Name</Label><Input value={ref.bankName} onChange={e => updateBankReference(index, 'bankName', e.target.value)} className="h-7 text-xs" /></div>
                  <div><Label className="text-xs">Contact</Label><Input value={ref.contact} onChange={e => updateBankReference(index, 'contact', e.target.value)} className="h-7 text-xs" /></div>
                </div>
                <div><Label className="text-xs">Address</Label><Input value={ref.address} onChange={e => updateBankReference(index, 'address', e.target.value)} className="h-7 text-xs" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">City, State, ZIP</Label><Input value={ref.cityStZip} onChange={e => updateBankReference(index, 'cityStZip', e.target.value)} className="h-7 text-xs" /></div>
                  <div><Label className="text-xs">Phone</Label><Input value={ref.phone} onChange={e => updateBankReference(index, 'phone', e.target.value)} className="h-7 text-xs" /></div>
                </div>
                <div><Label className="text-xs">Account #</Label><Input value={ref.accountNumber} onChange={e => updateBankReference(index, 'accountNumber', e.target.value)} className="h-7 text-xs" /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Business References */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Business References</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.businessReferences.map((ref, index) => (
              <div key={ref.id} className="border rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Business Reference {index + 1}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Company</Label><Input value={ref.company} onChange={e => updateBusinessReference(index, 'company', e.target.value)} className="h-7 text-xs" /></div>
                  <div><Label className="text-xs">Contact</Label><Input value={ref.contact} onChange={e => updateBusinessReference(index, 'contact', e.target.value)} className="h-7 text-xs" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Title</Label><Input value={ref.title} onChange={e => updateBusinessReference(index, 'title', e.target.value)} className="h-7 text-xs" /></div>
                  <div><Label className="text-xs">Phone</Label><Input value={ref.phone} onChange={e => updateBusinessReference(index, 'phone', e.target.value)} className="h-7 text-xs" /></div>
                </div>
                <div><Label className="text-xs">Email</Label><Input value={ref.email} onChange={e => updateBusinessReference(index, 'email', e.target.value)} className="h-7 text-xs" /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Invoicing & Payment */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Invoicing & Payment Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Invoice Delivery Method</Label>
                <Select value={formData.invoiceDelivery} onValueChange={v => updateField('invoiceDelivery', v as NewCustomerFormData['invoiceDelivery'])}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mail">Mail</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Invoice Email</Label><Input value={formData.invoiceEmail} onChange={e => updateField('invoiceEmail', e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Secondary Email</Label><Input value={formData.invoiceSecondaryEmail} onChange={e => updateField('invoiceSecondaryEmail', e.target.value)} className="h-8 text-sm" /></div>
            </div>
            <div className="space-y-3">
              <Label className="text-xs">Payment Method</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="payCheck" checked={formData.paymentMethod === 'check'} onCheckedChange={c => c && updateField('paymentMethod', 'check')} />
                  <Label htmlFor="payCheck" className="text-sm">Check</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="payCreditCard" checked={formData.paymentMethod === 'credit_card'} onCheckedChange={c => c && updateField('paymentMethod', 'credit_card')} />
                  <Label htmlFor="payCreditCard" className="text-sm">Credit Card</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="payEft" checked={formData.paymentMethod === 'eft_ach'} onCheckedChange={c => c && updateField('paymentMethod', 'eft_ach')} />
                  <Label htmlFor="payEft" className="text-sm">EFT / ACH</Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
