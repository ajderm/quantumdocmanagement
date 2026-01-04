import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

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
}

interface QuoteFormProps { deal: any; company: any; contacts: any[]; lineItems: any[]; dealOwner: any; onFormChange: (data: QuoteFormData) => void; }

// Currency input formatter
const formatCurrency = (value: number): string => {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
};

export function QuoteForm({ deal, company, lineItems, dealOwner, onFormChange }: QuoteFormProps) {
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
  });

  // Local string state for overage inputs to allow typing "0.0123" naturally
  const [overageBWText, setOverageBWText] = useState('');
  const [overageColorText, setOverageColorText] = useState('');

  useEffect(() => {
    const totalPrice = lineItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    setFormData(prev => ({ 
      ...prev, 
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
    }));
  }, [deal, company, dealOwner, lineItems]);

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
          <div>
            <Label className="text-xs flex items-center justify-between">
              <span>Base Rate (per month)</span>
              {formData.baseRateManuallySet && (
                <button 
                  type="button" 
                  onClick={clearManualBaseRate} 
                  className="text-xs text-primary hover:underline"
                >
                  Auto-calculate
                </button>
              )}
            </Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input 
                type="text" 
                value={formatCurrency(formData.serviceBaseRate)} 
                onChange={e => handleBaseRateChange(parseCurrency(e.target.value))} 
                className="h-8 text-sm pl-5" 
              />
            </div>
            {!formData.baseRateManuallySet && (formData.includedBWCopies > 0 || formData.includedColorCopies > 0) && (
              <p className="text-xs text-muted-foreground mt-1">Auto-calculated from includes × rates</p>
            )}
          </div>
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
          <div>
            <Label className="text-xs">Overage B/W Rate</Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input 
                type="text"
                value={overageBWText} 
                onChange={e => {
                  const val = e.target.value;
                  // Allow empty, digits, decimals - including "0.0123", ".0123", "0.", etc.
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setOverageBWText(val);
                    // Only update numeric state when we have a valid parseable number
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      updateField('overageBWRate', num);
                    } else if (val === '') {
                      updateField('overageBWRate', 0);
                    }
                  }
                }}
                onBlur={() => {
                  // Normalize on blur
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
                  // Allow empty, digits, decimals - including "0.0123", ".0123", "0.", etc.
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setOverageColorText(val);
                    // Only update numeric state when we have a valid parseable number
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      updateField('overageColorRate', num);
                    } else if (val === '') {
                      updateField('overageColorRate', 0);
                    }
                  }
                }}
                onBlur={() => {
                  // Normalize on blur
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
    </div>
  );
}
