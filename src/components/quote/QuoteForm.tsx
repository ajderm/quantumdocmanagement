import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AVAILABLE_TERMS = [12, 24, 36, 48, 60, 72];
const RATE_FACTORS: Record<number, number> = { 12: 0.088, 24: 0.046, 36: 0.032, 48: 0.026, 60: 0.022, 72: 0.019 };

export interface QuoteLineItem { id: string; quantity: number; model: string; description: string; price: number; }
export interface QuoteFormData { 
  quoteNumber: string; 
  quoteDate: string; 
  preparedBy: string; 
  preparedByPhone: string; 
  preparedByEmail: string; 
  companyName: string; 
  address: string; 
  address2: string; 
  city: string; 
  state: string; 
  zip: string; 
  phone: string; 
  lineItems: QuoteLineItem[]; 
  retailPrice: number; 
  cashDiscount: number; 
  selectedTerms: number[]; 
  serviceBaseRate: number; 
  includedBWCopies: number; 
  includedColorCopies: number; 
  overageBWRate: number; 
  overageColorRate: number;
  baseRateManuallySet: boolean;
  // Configuration fields
  leasingCompanyId: string;
  priceDisplay: 'both' | 'purchase_only' | 'lease_only';
  leasingPriceType: 'without_buyout' | 'with_buyout';
  leaseProgram: 'fmv' | 'dollar_buyout';
  // Buyout fields
  earlyTerminationFee: number;
  returnShipping: number;
  paymentsRemaining: number;
  paymentAmount: number;
  buyoutFinancingAmount: number;
}

interface QuoteFormProps { deal: any; company: any; contacts: any[]; lineItems: any[]; dealOwner: any; onFormChange: (data: QuoteFormData) => void; portalId?: string; savedConfig?: QuoteFormData; }

interface LeasingPartner {
  id: string;
  name: string;
}

// Currency input formatter
const formatCurrency = (value: number): string => {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
};

export function QuoteForm({ deal, company, lineItems, dealOwner, onFormChange, portalId, savedConfig }: QuoteFormProps) {
  const [formData, setFormData] = useState<QuoteFormData>({ 
    quoteNumber: '', 
    quoteDate: new Date().toISOString().split('T')[0], 
    preparedBy: '', 
    preparedByPhone: '', 
    preparedByEmail: '', 
    companyName: '', 
    address: '', 
    address2: '', 
    city: '', 
    state: '', 
    zip: '', 
    phone: '', 
    lineItems: [], 
    retailPrice: 0, 
    cashDiscount: 0, 
    selectedTerms: [36, 48, 60], 
    serviceBaseRate: 0, 
    includedBWCopies: 0, 
    includedColorCopies: 0, 
    overageBWRate: 0, 
    overageColorRate: 0,
    baseRateManuallySet: false,
    // Configuration defaults
    leasingCompanyId: '',
    priceDisplay: 'both',
    leasingPriceType: 'without_buyout',
    leaseProgram: 'fmv',
    // Buyout defaults
    earlyTerminationFee: 0,
    returnShipping: 0,
    paymentsRemaining: 0,
    paymentAmount: 0,
    buyoutFinancingAmount: 0,
  });

  // Local string state for overage inputs to allow typing "0.0123" naturally
  const [overageBWText, setOverageBWText] = useState('');
  const [overageColorText, setOverageColorText] = useState('');
  // Local string state for buyout fields to allow natural number entry
  const [buyoutFinancingText, setBuyoutFinancingText] = useState('');
  const [earlyTerminationFeeText, setEarlyTerminationFeeText] = useState('');
  const [returnShippingText, setReturnShippingText] = useState('');
  const [paymentAmountText, setPaymentAmountText] = useState('');
  
  // Leasing partners for dropdown
  const [leasingPartners, setLeasingPartners] = useState<LeasingPartner[]>([]);

  // Fetch leasing partners
  useEffect(() => {
    const fetchLeasingPartners = async () => {
      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      if (!currentPortalId) return;

      try {
        const { data, error } = await supabase.functions.invoke('dealer-account-get', {
          body: { portalId: currentPortalId }
        });

        if (error || !data?.dealer?.id) return;

        const { data: partners } = await supabase
          .from('leasing_partners')
          .select('id, name')
          .eq('dealer_account_id', data.dealer.id)
          .eq('is_active', true)
          .order('name');

        if (partners) {
          setLeasingPartners(partners);
        }
      } catch (err) {
        console.error('Failed to fetch leasing partners:', err);
      }
    };

    fetchLeasingPartners();
  }, [portalId]);

  // Calculate total buyout
  const totalBuyout = (formData.paymentAmount * formData.paymentsRemaining) + formData.earlyTerminationFee + formData.returnShipping;

  useEffect(() => {
    const totalPrice = lineItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    
    // Start with HubSpot data
    const hubspotData = { 
      quoteNumber: deal?.hsObjectId || '', 
      preparedBy: dealOwner ? `${dealOwner.firstName || ''} ${dealOwner.lastName || ''}`.trim() : '', 
      preparedByEmail: dealOwner?.email || '', 
      preparedByPhone: dealOwner?.phone || '', 
      companyName: company?.name || '', 
      address: company?.address || '', 
      address2: company?.address2 || '', 
      city: company?.city || '', 
      state: company?.state || '', 
      zip: company?.zip || '', 
      phone: company?.phone || '', 
      lineItems: lineItems.map((item: any) => ({ 
        id: item.id, 
        quantity: item.quantity, 
        model: item.model || item.sku || '', 
        description: item.description || item.name || '', 
        price: item.price 
      })), 
      retailPrice: totalPrice, 
      cashDiscount: totalPrice * 0.95 
    };

    // If we have saved config, merge it with HubSpot data
    // HubSpot data takes precedence for contact/company info
    if (savedConfig) {
      setFormData(prev => ({ 
        ...prev, 
        ...savedConfig,
        // Override with fresh HubSpot data for these fields
        quoteNumber: hubspotData.quoteNumber || savedConfig.quoteNumber,
        preparedBy: hubspotData.preparedBy || savedConfig.preparedBy,
        preparedByEmail: hubspotData.preparedByEmail || savedConfig.preparedByEmail,
        preparedByPhone: hubspotData.preparedByPhone || savedConfig.preparedByPhone,
        companyName: hubspotData.companyName || savedConfig.companyName,
        address: hubspotData.address || savedConfig.address,
        address2: hubspotData.address2 || savedConfig.address2,
        city: hubspotData.city || savedConfig.city,
        state: hubspotData.state || savedConfig.state,
        zip: hubspotData.zip || savedConfig.zip,
        phone: hubspotData.phone || savedConfig.phone,
        // Use saved lineItems if they exist, otherwise HubSpot's
        lineItems: savedConfig.lineItems?.length > 0 ? savedConfig.lineItems : hubspotData.lineItems,
        retailPrice: savedConfig.retailPrice || hubspotData.retailPrice,
        cashDiscount: savedConfig.cashDiscount || hubspotData.cashDiscount
      }));
      
      // Also restore text states for inputs
      if (savedConfig.overageBWRate > 0) setOverageBWText(String(savedConfig.overageBWRate));
      if (savedConfig.overageColorRate > 0) setOverageColorText(String(savedConfig.overageColorRate));
      if (savedConfig.buyoutFinancingAmount > 0) setBuyoutFinancingText(String(savedConfig.buyoutFinancingAmount));
      if (savedConfig.earlyTerminationFee > 0) setEarlyTerminationFeeText(String(savedConfig.earlyTerminationFee));
      if (savedConfig.returnShipping > 0) setReturnShippingText(String(savedConfig.returnShipping));
      if (savedConfig.paymentAmount > 0) setPaymentAmountText(String(savedConfig.paymentAmount));
    } else {
      setFormData(prev => ({ ...prev, ...hubspotData }));
    }
  }, [deal, company, dealOwner, lineItems, savedConfig]);

  // Auto-calculate base rate when service values change (if not manually set)
  useEffect(() => {
    if (!formData.baseRateManuallySet) {
      const calculatedBaseRate = (formData.includedBWCopies * formData.overageBWRate) + (formData.includedColorCopies * formData.overageColorRate);
      if (calculatedBaseRate !== formData.serviceBaseRate) {
        setFormData(prev => ({ ...prev, serviceBaseRate: calculatedBaseRate }));
      }
    }
  }, [formData.includedBWCopies, formData.includedColorCopies, formData.overageBWRate, formData.overageColorRate, formData.baseRateManuallySet]);

  useEffect(() => { onFormChange(formData); }, [formData, onFormChange]);

  const updateField = <K extends keyof QuoteFormData>(field: K, value: QuoteFormData[K]) => { setFormData(prev => ({ ...prev, [field]: value })); };
  const updateLineItem = (index: number, field: keyof QuoteLineItem, value: string | number) => { setFormData(prev => { const newItems = [...prev.lineItems]; newItems[index] = { ...newItems[index], [field]: value }; const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0); return { ...prev, lineItems: newItems, retailPrice: totalPrice, cashDiscount: totalPrice * 0.95 }; }); };
  const addLineItem = () => { setFormData(prev => ({ ...prev, lineItems: [...prev.lineItems, { id: `new-${Date.now()}`, quantity: 1, model: '', description: '', price: 0 }] })); };
  const removeLineItem = (index: number) => { setFormData(prev => { const newItems = prev.lineItems.filter((_, i) => i !== index); const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0); return { ...prev, lineItems: newItems, retailPrice: totalPrice, cashDiscount: totalPrice * 0.95 }; }); };
  const toggleTerm = (term: number) => { setFormData(prev => { const t = prev.selectedTerms; if (t.includes(term)) { return t.length > 1 ? { ...prev, selectedTerms: t.filter(x => x !== term) } : prev; } return t.length < 3 ? { ...prev, selectedTerms: [...t, term].sort((a, b) => a - b) } : prev; }); };
  const calcLease = (term: number) => Math.round(formData.retailPrice * (RATE_FACTORS[term] || 0.025));

  const handleBaseRateChange = (value: number) => {
    setFormData(prev => ({ ...prev, serviceBaseRate: value, baseRateManuallySet: true }));
  };

  const clearManualBaseRate = () => {
    const calculatedBaseRate = (formData.includedBWCopies * formData.overageBWRate) + (formData.includedColorCopies * formData.overageColorRate);
    setFormData(prev => ({ ...prev, serviceBaseRate: calculatedBaseRate, baseRateManuallySet: false }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div><Label className="text-xs">Quote Number</Label><Input value={formData.quoteNumber} onChange={e => updateField('quoteNumber', e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Quote Date</Label><Input type="date" value={formData.quoteDate} onChange={e => updateField('quoteDate', e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Prepared By</Label><Input value={formData.preparedBy} onChange={e => updateField('preparedBy', e.target.value)} className="h-8 text-sm" /></div>
        </div>
        <div className="space-y-3">
          <div><Label className="text-xs">Sales Rep Email</Label><Input type="email" value={formData.preparedByEmail} onChange={e => updateField('preparedByEmail', e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Sales Rep Phone</Label><Input value={formData.preparedByPhone} onChange={e => updateField('preparedByPhone', e.target.value)} className="h-8 text-sm" /></div>
        </div>
      </div>
      <Separator />
      <div>
        <h4 className="text-sm font-medium mb-3">Prepared For</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label className="text-xs">Company Name</Label><Input value={formData.companyName} onChange={e => updateField('companyName', e.target.value)} className="h-8 text-sm" /></div>
          <div className="col-span-2"><Label className="text-xs">Address</Label><Input value={formData.address} onChange={e => updateField('address', e.target.value)} className="h-8 text-sm" /></div>
          <div className="col-span-2"><Label className="text-xs">Address Line 2</Label><Input value={formData.address2} onChange={e => updateField('address2', e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">City</Label><Input value={formData.city} onChange={e => updateField('city', e.target.value)} className="h-8 text-sm" /></div>
          <div className="grid grid-cols-2 gap-2"><div><Label className="text-xs">State</Label><Input value={formData.state} onChange={e => updateField('state', e.target.value)} className="h-8 text-sm" /></div><div><Label className="text-xs">Zip</Label><Input value={formData.zip} onChange={e => updateField('zip', e.target.value)} className="h-8 text-sm" /></div></div>
          <div className="col-span-2"><Label className="text-xs">Phone</Label><Input value={formData.phone} onChange={e => updateField('phone', e.target.value)} className="h-8 text-sm" /></div>
        </div>
      </div>
      <Separator />
      <div>
        <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-medium">Equipment</h4><Button type="button" variant="outline" size="sm" onClick={addLineItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button></div>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2"><div className="col-span-1">Qty</div><div className="col-span-3">Model</div><div className="col-span-5">Description</div><div className="col-span-2">Price</div><div className="col-span-1"></div></div>
          {formData.lineItems.map((item, idx) => (<div key={item.id} className="grid grid-cols-12 gap-2 items-center"><div className="col-span-1"><Input type="number" min="1" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="h-8 text-sm" /></div><div className="col-span-3"><Input value={item.model} onChange={e => updateLineItem(idx, 'model', e.target.value)} className="h-8 text-sm" /></div><div className="col-span-5"><Input value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} className="h-8 text-sm" /></div><div className="col-span-2"><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span><Input type="number" min="0" step="0.01" value={item.price} onChange={e => updateLineItem(idx, 'price', parseFloat(e.target.value) || 0)} className="h-8 text-sm pl-5" /></div></div><div className="col-span-1"><Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(idx)} className="h-8 w-8 p-0 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></div></div>))}
          {formData.lineItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No equipment. Click Add Item.</p>}
        </div>
      </div>
      <Separator />
      
      {/* Configuration Section - moved between Equipment and Pricing */}
      <div>
        <h4 className="text-sm font-medium mb-3">Configuration</h4>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label className="text-xs">Leasing Company</Label>
            <Select value={formData.leasingCompanyId} onValueChange={(v) => updateField('leasingCompanyId', v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select leasing company" />
              </SelectTrigger>
              <SelectContent>
                {leasingPartners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>{partner.name}</SelectItem>
                ))}
                {leasingPartners.length === 0 && (
                  <SelectItem value="none" disabled>No leasing partners configured</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Price Display</Label>
            <Select value={formData.priceDisplay} onValueChange={(v) => updateField('priceDisplay', v as 'both' | 'purchase_only' | 'lease_only')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Show Purchase and Lease Price</SelectItem>
                <SelectItem value="purchase_only">Show Purchase Price Only</SelectItem>
                <SelectItem value="lease_only">Show Lease Price Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Leasing Price</Label>
            <Select value={formData.leasingPriceType} onValueChange={(v) => updateField('leasingPriceType', v as 'without_buyout' | 'with_buyout')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="without_buyout">Lease Price Without Buyout</SelectItem>
                <SelectItem value="with_buyout">Lease Price With Buyout</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Lease Program</Label>
            <Select value={formData.leaseProgram} onValueChange={(v) => updateField('leaseProgram', v as 'fmv' | 'dollar_buyout')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fmv">FMV (Fair Market Value)</SelectItem>
                <SelectItem value="dollar_buyout">$1 Buyout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <Separator />

      <div>
        <h4 className="text-sm font-medium mb-3">Pricing</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Retail Price</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="text" 
                  value={formatCurrency(formData.retailPrice)} 
                  onChange={e => updateField('retailPrice', parseCurrency(e.target.value))} 
                  className="h-8 text-sm pl-5" 
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cash Discount Price</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="text" 
                  value={formatCurrency(formData.cashDiscount)} 
                  onChange={e => updateField('cashDiscount', parseCurrency(e.target.value))} 
                  className="h-8 text-sm pl-5" 
                />
              </div>
            </div>
          </div>
          <div><Label className="text-xs mb-2 block">FMV Lease Terms (up to 3)</Label><div className="flex flex-wrap gap-2">{AVAILABLE_TERMS.map(t => <Button key={t} type="button" variant={formData.selectedTerms.includes(t) ? "default" : "outline"} size="sm" onClick={() => toggleTerm(t)} disabled={!formData.selectedTerms.includes(t) && formData.selectedTerms.length >= 3} className="h-7 text-xs">{t} mo</Button>)}</div><div className="mt-3 space-y-1">{formData.selectedTerms.map(t => <div key={t} className="flex justify-between text-sm bg-muted/50 rounded px-3 py-1.5"><span>{t} months</span><span className="font-medium">${calcLease(t).toLocaleString()}/mo</span></div>)}</div></div>
        </div>
      </div>
      <Separator />
      <div>
        <h4 className="text-sm font-medium mb-3">Service Agreement</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Included B/W</Label>
              <Input 
                type="number" 
                min="0"
                value={formData.includedBWCopies || ''} 
                onChange={e => updateField('includedBWCopies', parseInt(e.target.value) || 0)} 
                className="h-8 text-sm"
                placeholder="15000"
              />
            </div>
            <div>
              <Label className="text-xs">Included Color</Label>
              <Input 
                type="number"
                min="0" 
                value={formData.includedColorCopies || ''} 
                onChange={e => updateField('includedColorCopies', parseInt(e.target.value) || 0)} 
                className="h-8 text-sm"
                placeholder="5000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Overage B/W Rate</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="text"
                  value={overageBWText} 
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setOverageBWText(val);
                      const num = parseFloat(val);
                      if (!isNaN(num)) {
                        updateField('overageBWRate', num);
                      } else if (val === '') {
                        updateField('overageBWRate', 0);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (overageBWText === '' || overageBWText === '.') {
                      setOverageBWText('');
                      updateField('overageBWRate', 0);
                    } else {
                      const num = parseFloat(overageBWText);
                      if (!isNaN(num)) {
                        setOverageBWText(num === 0 ? '' : String(num));
                      }
                    }
                  }}
                  className="h-8 text-sm pl-5"
                  placeholder="0.0108"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Overage Color Rate</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="text"
                  value={overageColorText} 
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setOverageColorText(val);
                      const num = parseFloat(val);
                      if (!isNaN(num)) {
                        updateField('overageColorRate', num);
                      } else if (val === '') {
                        updateField('overageColorRate', 0);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (overageColorText === '' || overageColorText === '.') {
                      setOverageColorText('');
                      updateField('overageColorRate', 0);
                    } else {
                      const num = parseFloat(overageColorText);
                      if (!isNaN(num)) {
                        setOverageColorText(num === 0 ? '' : String(num));
                      }
                    }
                  }}
                  className="h-8 text-sm pl-5"
                  placeholder="0.065"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Base Rate Display - styled like Total Buyout */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Base Rate (per month)</span>
              {formData.baseRateManuallySet && (
                <button 
                  type="button" 
                  onClick={clearManualBaseRate} 
                  className="text-xs text-primary hover:underline"
                >
                  Auto-calculate
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">$</span>
              <Input 
                type="text" 
                value={formatCurrency(formData.serviceBaseRate)} 
                onChange={e => handleBaseRateChange(parseCurrency(e.target.value))} 
                className="h-7 w-24 text-right font-bold text-lg bg-transparent border-0 p-0 focus-visible:ring-0"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            (B/W Copies × B/W Rate) + (Color Copies × Color Rate)
          </p>
        </div>
      </div>

      {/* Buyout Section */}
      <Separator />
      <div>
        <h4 className="text-sm font-medium mb-3">Buyout Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Early Termination Fee</Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input 
                type="text" 
                value={earlyTerminationFeeText} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setEarlyTerminationFeeText(val);
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      updateField('earlyTerminationFee', num);
                    } else if (val === '') {
                      updateField('earlyTerminationFee', 0);
                    }
                  }
                }}
                onBlur={() => {
                  if (earlyTerminationFeeText === '' || earlyTerminationFeeText === '.') {
                    setEarlyTerminationFeeText('');
                    updateField('earlyTerminationFee', 0);
                  } else {
                    const num = parseFloat(earlyTerminationFeeText);
                    if (!isNaN(num)) {
                      setEarlyTerminationFeeText(num === 0 ? '' : String(num));
                    }
                  }
                }}
                className="h-8 text-sm pl-5"
                placeholder="500"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Return Shipping</Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input 
                type="text" 
                value={returnShippingText} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setReturnShippingText(val);
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      updateField('returnShipping', num);
                    } else if (val === '') {
                      updateField('returnShipping', 0);
                    }
                  }
                }}
                onBlur={() => {
                  if (returnShippingText === '' || returnShippingText === '.') {
                    setReturnShippingText('');
                    updateField('returnShipping', 0);
                  } else {
                    const num = parseFloat(returnShippingText);
                    if (!isNaN(num)) {
                      setReturnShippingText(num === 0 ? '' : String(num));
                    }
                  }
                }}
                className="h-8 text-sm pl-5"
                placeholder="200"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Payments Remaining</Label>
            <Input 
              type="number" 
              min="0"
              value={formData.paymentsRemaining || ''} 
              onChange={e => updateField('paymentsRemaining', parseInt(e.target.value) || 0)} 
              className="h-8 text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-xs">Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input 
                type="text" 
                value={paymentAmountText} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setPaymentAmountText(val);
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      updateField('paymentAmount', num);
                    } else if (val === '') {
                      updateField('paymentAmount', 0);
                    }
                  }
                }}
                onBlur={() => {
                  if (paymentAmountText === '' || paymentAmountText === '.') {
                    setPaymentAmountText('');
                    updateField('paymentAmount', 0);
                  } else {
                    const num = parseFloat(paymentAmountText);
                    if (!isNaN(num)) {
                      setPaymentAmountText(num === 0 ? '' : String(num));
                    }
                  }
                }}
                className="h-8 text-sm pl-5"
                placeholder="1500"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Buyout Financing Amount</Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input 
                type="text" 
                value={buyoutFinancingText} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setBuyoutFinancingText(val);
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      updateField('buyoutFinancingAmount', num);
                    } else if (val === '') {
                      updateField('buyoutFinancingAmount', 0);
                    }
                  }
                }}
                onBlur={() => {
                  if (buyoutFinancingText === '' || buyoutFinancingText === '.') {
                    setBuyoutFinancingText('');
                    updateField('buyoutFinancingAmount', 0);
                  } else {
                    const num = parseFloat(buyoutFinancingText);
                    if (!isNaN(num)) {
                      setBuyoutFinancingText(num === 0 ? '' : String(num));
                    }
                  }
                }}
                className="h-8 text-sm pl-5"
                placeholder="5000"
              />
            </div>
          </div>
        </div>
        {/* Total Buyout Display */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Buyout</span>
            <span className="text-lg font-bold">${formatCurrency(totalBuyout)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            (Payment Amount × Payments Remaining) + Early Termination Fee + Return Shipping
          </p>
        </div>
      </div>
    </div>
  );
}
