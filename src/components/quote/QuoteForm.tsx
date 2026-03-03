import { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

export interface QuoteLineItem { id: string; quantity: number; model: string; description: string; price: number; cost: number; markupPercent: number; msrp: number; dealerSource: string; }
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
  cashDiscountPercent?: number;
  cashDiscount?: number; 
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
  // Special Pricing Tier (deal-level)
  specialPricingTier: string;
  // Buyout fields
  earlyTerminationFee: number;
  returnShipping: number;
  paymentsRemaining: number;
  paymentAmount: number;
  buyoutFinancingAmount: number;
  // Calculated payments (from dynamic rates)
  calculatedPayments: Record<number, number>;
  // Manual payment overrides per term (null = use calculated)
  paymentOverrides: Record<number, number | null>;
  // Total buyout override
  totalBuyoutManuallySet?: boolean;
  totalBuyoutOverride?: number;
}

interface QuoteFormProps { deal: any; company: any; contacts: any[]; lineItems: any[]; dealOwner: any; onFormChange: (data: QuoteFormData) => void; portalId?: string; savedConfig?: QuoteFormData; }

interface RateFactor {
  id: string;
  leasing_company: string;
  lease_program: string;
  min_amount: number | null;
  max_amount: number | null;
  term_months: number;
  rate_factor: number;
}

// Currency input formatter
const formatCurrency = (value: number): string => {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
};

// Default fallback rate factors if no rate sheet uploaded
const DEFAULT_RATE_FACTORS: Record<number, number> = { 12: 0.088, 24: 0.046, 36: 0.032, 48: 0.026, 60: 0.022, 72: 0.019 };

export function QuoteForm({ deal, company, lineItems, dealOwner, onFormChange, portalId, savedConfig }: QuoteFormProps) {
  const hasInitializedRef = useRef(false);
  const savedConfigRef = useRef(savedConfig);
  const leasingCompanyIdRef = useRef('');
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
    cashDiscountPercent: 0,
    cashDiscount: 0, 
    selectedTerms: [], 
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
    specialPricingTier: '',
    // Buyout defaults
    earlyTerminationFee: 0,
    returnShipping: 0,
    paymentsRemaining: 0,
    paymentAmount: 0,
    buyoutFinancingAmount: 0,
    calculatedPayments: {},
    paymentOverrides: {},
  });

  // Local state for payment override text inputs
  const [paymentOverrideTexts, setPaymentOverrideTexts] = useState<Record<number, string>>({});

  // Local string state for overage inputs to allow typing "0.0123" naturally
  const [overageBWText, setOverageBWText] = useState('');
  const [overageColorText, setOverageColorText] = useState('');
  // Local string state for buyout fields to allow natural number entry
  const [buyoutFinancingText, setBuyoutFinancingText] = useState('');
  const [earlyTerminationFeeText, setEarlyTerminationFeeText] = useState('');
  const [returnShippingText, setReturnShippingText] = useState('');
  const [paymentAmountText, setPaymentAmountText] = useState('');
  
  // Rate sheet data
  const [rateFactors, setRateFactors] = useState<RateFactor[]>([]);
  const [leasingCompanies, setLeasingCompanies] = useState<string[]>([]);
  const [hasRateSheet, setHasRateSheet] = useState(false);

  // Pricing tiers
  const [pricingTiers, setPricingTiers] = useState<Array<{ id: string; name: string; prices: Array<{ product_model: string; rep_cost: number }> }>>([]);
  const [originalCosts, setOriginalCosts] = useState<Record<string, number>>({});

  // Keep refs in sync for stale closure prevention
  useEffect(() => { savedConfigRef.current = savedConfig; }, [savedConfig]);
  useEffect(() => { leasingCompanyIdRef.current = formData.leasingCompanyId; }, [formData.leasingCompanyId]);

  // Fetch rate factors from database
  useEffect(() => {
    const fetchRateFactors = async () => {
      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      if (!currentPortalId) return;

      try {
        const { data, error } = await supabase.functions.invoke('get-rate-factors', {
          body: { portalId: currentPortalId }
        });

        if (error) {
          console.error('Failed to fetch rate factors:', error);
          return;
        }

        if (data?.rateFactors?.length > 0) {
          setRateFactors(data.rateFactors);
          setLeasingCompanies(data.leasingCompanies || []);
          setHasRateSheet(true);
          
          // Auto-select first company if none selected (use refs to avoid stale closure)
          if (!leasingCompanyIdRef.current && !savedConfigRef.current?.leasingCompanyId && data.leasingCompanies?.length > 0) {
            setFormData(prev => ({ ...prev, leasingCompanyId: data.leasingCompanies[0] }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch rate factors:', err);
      }
    };

    fetchRateFactors();
  }, [portalId]);

  // Get available terms for selected company and program
  const availableTerms = useMemo(() => {
    if (!hasRateSheet || !formData.leasingCompanyId) {
      return [12, 24, 36, 48, 60, 72]; // Default terms
    }

    const programKey = formData.leaseProgram === 'fmv' ? 'FMV' : '$1';
    const terms = rateFactors
      .filter(r => r.leasing_company === formData.leasingCompanyId && r.lease_program === programKey)
      .map(r => r.term_months);
    
    return [...new Set(terms)].sort((a, b) => a - b);
  }, [rateFactors, formData.leasingCompanyId, formData.leaseProgram, hasRateSheet]);

  // Check if the selected company has any rates for the selected program
  const hasRatesForSelection = useMemo(() => {
    if (!hasRateSheet || !formData.leasingCompanyId) return true; // No warning needed if no rate sheet
    return availableTerms.length > 0;
  }, [hasRateSheet, formData.leasingCompanyId, availableTerms]);

  // Calculate total buyout for "with buyout" formula
  const totalBuyoutForCalc = (formData.paymentAmount * formData.paymentsRemaining) + formData.earlyTerminationFee + formData.returnShipping;

  // Calculate lease payment using database rates
  const calculateLeasePayment = (term: number): number => {
    let baseAmount = formData.retailPrice;
    
    // If "with buyout" is selected, add total buyout to the base amount
    if (formData.leasingPriceType === 'with_buyout') {
      baseAmount = baseAmount + totalBuyoutForCalc;
    }
    
    if (!hasRateSheet || !formData.leasingCompanyId) {
      // Fall back to default rates
      const rateFactor = DEFAULT_RATE_FACTORS[term] || 0.025;
      return Math.round(baseAmount * rateFactor);
    }

    const programKey = formData.leaseProgram === 'fmv' ? 'FMV' : '$1';
    
    // Find matching rate factor
    const matchingRate = rateFactors.find(r => 
      r.leasing_company === formData.leasingCompanyId &&
      r.lease_program === programKey &&
      r.term_months === term &&
      (r.min_amount === null || baseAmount >= r.min_amount) &&
      (r.max_amount === null || baseAmount <= r.max_amount)
    );

    if (matchingRate) {
      return Math.round(baseAmount * matchingRate.rate_factor);
    }

    // If no amount tier match, try without amount constraints
    const fallbackRate = rateFactors.find(r =>
      r.leasing_company === formData.leasingCompanyId &&
      r.lease_program === programKey &&
      r.term_months === term
    );

    if (fallbackRate) {
      return Math.round(baseAmount * fallbackRate.rate_factor);
    }

    // Final fallback to default
    return Math.round(baseAmount * (DEFAULT_RATE_FACTORS[term] || 0.025));
  };

  // Get the effective payment for a term (override or calculated)
  const getEffectivePayment = (term: number): number => {
    const override = formData.paymentOverrides[term];
    if (override !== null && override !== undefined && override > 0) {
      return override;
    }
    return formData.calculatedPayments[term] || calculateLeasePayment(term);
  };

  // Handle payment override change
  const handlePaymentOverrideChange = (term: number, value: string) => {
    setPaymentOverrideTexts(prev => ({ ...prev, [term]: value }));
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num) && num > 0) {
      setFormData(prev => ({
        ...prev,
        paymentOverrides: { ...prev.paymentOverrides, [term]: num }
      }));
    } else if (value === '') {
      setFormData(prev => ({
        ...prev,
        paymentOverrides: { ...prev.paymentOverrides, [term]: null }
      }));
    }
  };

  // Clear payment override for a term
  const clearPaymentOverride = (term: number) => {
    setPaymentOverrideTexts(prev => ({ ...prev, [term]: '' }));
    setFormData(prev => ({
      ...prev,
      paymentOverrides: { ...prev.paymentOverrides, [term]: null }
    }));
  };

  // Update calculated payments when relevant values change
  useEffect(() => {
    const payments: Record<number, number> = {};
    formData.selectedTerms.forEach(term => {
      payments[term] = calculateLeasePayment(term);
    });
    
    // Only update if different to avoid infinite loop
    const currentPayments = JSON.stringify(formData.calculatedPayments);
    const newPayments = JSON.stringify(payments);
    if (currentPayments !== newPayments) {
      setFormData(prev => ({ ...prev, calculatedPayments: payments }));
    }
  }, [formData.selectedTerms, formData.retailPrice, formData.buyoutFinancingAmount, formData.leasingCompanyId, formData.leaseProgram, formData.leasingPriceType, formData.paymentAmount, formData.paymentsRemaining, formData.earlyTerminationFee, formData.returnShipping, rateFactors]);

  // Reset selected terms when company or program changes (but not during initial load if we have saved terms)
  useEffect(() => {
    // Skip if we have saved config with terms and haven't initialized yet
    if (savedConfig?.selectedTerms?.length > 0 && !hasInitializedRef.current) {
      return;
    }
    
    if (availableTerms.length > 0 && formData.selectedTerms.length === 0) {
      // Auto-select up to 3 terms from available
      const defaultTerms = availableTerms.slice(0, 3);
      setFormData(prev => ({ ...prev, selectedTerms: defaultTerms }));
    } else if (availableTerms.length > 0) {
      // Filter out any selected terms that are no longer available
      const validTerms = formData.selectedTerms.filter(t => availableTerms.includes(t));
      if (validTerms.length !== formData.selectedTerms.length) {
        setFormData(prev => ({ ...prev, selectedTerms: validTerms.length > 0 ? validTerms : availableTerms.slice(0, 3) }));
      }
    }
  }, [availableTerms, savedConfig]);

  // Calculate total buyout (for display)
  const totalBuyout = totalBuyoutForCalc;

  useEffect(() => {
    if (hasInitializedRef.current) return;

    // Get retail price from deal amount
    const dealAmount = parseFloat(deal?.amount) || 0;
    
    // Start with HubSpot data - use delivery address for quote (Ship To)
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
        cost: item.cost || 0,
        markupPercent: 0,
        price: item.price || 0,
        msrp: item.price || 0,
        dealerSource: item.dealer || item.properties?.dealer || item.properties?.manufacturer || item.properties?.vendor || '',
      })),
      retailPrice: dealAmount
    };

    // If we have saved config, merge it with HubSpot data
    if (savedConfig) {
      // Use saved retailPrice if available, otherwise fall back to HubSpot deal amount
      const retailPriceToUse = savedConfig.retailPrice || hubspotData.retailPrice;
      // Ensure saved line items have cost/markupPercent fields (backward compat)
      const savedLineItems = (savedConfig.lineItems?.length > 0 ? savedConfig.lineItems : hubspotData.lineItems).map((item: any, idx: number) => {
        const freshItem = hubspotData.lineItems[idx];
        return {
          ...item,
          cost: item.cost ?? 0,
          markupPercent: item.markupPercent ?? 0,
          msrp: item.msrp ?? item.price ?? 0,
          dealerSource: freshItem?.dealerSource || item.dealerSource || '',
        };
      });
      setFormData(prev => ({ 
        ...prev, 
        ...savedConfig,
        // Override with fresh HubSpot data for CRM-identity fields
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
        lineItems: savedLineItems,
        retailPrice: retailPriceToUse,
        calculatedPayments: savedConfig.calculatedPayments || {},
      }));
      
      // Also restore text states for inputs
      if (savedConfig.overageBWRate > 0) setOverageBWText(String(savedConfig.overageBWRate));
      if (savedConfig.overageColorRate > 0) setOverageColorText(String(savedConfig.overageColorRate));
      if (savedConfig.buyoutFinancingAmount > 0) setBuyoutFinancingText(String(savedConfig.buyoutFinancingAmount));
      if (savedConfig.earlyTerminationFee > 0) setEarlyTerminationFeeText(String(savedConfig.earlyTerminationFee));
      if (savedConfig.returnShipping > 0) setReturnShippingText(String(savedConfig.returnShipping));
      if (savedConfig.paymentAmount > 0) setPaymentAmountText(String(savedConfig.paymentAmount));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        ...hubspotData,
      }));
    }

    hasInitializedRef.current = true;
  }, [deal, company, dealOwner, lineItems, savedConfig]);

  // Auto-recalculate retailPrice when line items change
  useEffect(() => {
    if (!formData.lineItems || formData.lineItems.length === 0) return;
    const total = formData.lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setFormData(prev => {
      if (Math.abs(total - prev.retailPrice) > 0.01) {
        return { ...prev, retailPrice: total };
      }
      return prev;
    });
  }, [formData.lineItems]);

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
  const updateLineItem = (index: number, field: keyof QuoteLineItem, value: string | number) => { 
    setFormData(prev => { 
      const newItems = [...prev.lineItems]; 
      newItems[index] = { ...newItems[index], [field]: value };
      // Auto-recalculate sell price when cost or markupPercent changes
      if (field === 'cost' || field === 'markupPercent') {
        const cost = field === 'cost' ? (value as number) : newItems[index].cost;
        const markup = field === 'markupPercent' ? (value as number) : newItems[index].markupPercent;
        newItems[index].price = Math.round(cost * (1 + markup / 100) * 100) / 100;
      }
      return { ...prev, lineItems: newItems }; 
    }); 
  };
  const addLineItem = () => { setFormData(prev => ({ ...prev, lineItems: [...prev.lineItems, { id: `new-${Date.now()}`, quantity: 1, model: '', description: '', price: 0, cost: 0, markupPercent: 0, msrp: 0, dealerSource: '' }] })); };
  const removeLineItem = (index: number) => { setFormData(prev => { const newItems = prev.lineItems.filter((_, i) => i !== index); return { ...prev, lineItems: newItems }; }); };
  
  const toggleTerm = (term: number) => { 
    setFormData(prev => { 
      const t = prev.selectedTerms; 
      if (t.includes(term)) { 
        return t.length > 1 ? { ...prev, selectedTerms: t.filter(x => x !== term) } : prev; 
      } 
      return t.length < 3 ? { ...prev, selectedTerms: [...t, term].sort((a, b) => a - b) } : prev; 
    }); 
  };

  const handleBaseRateChange = (value: number) => {
    setFormData(prev => ({ ...prev, serviceBaseRate: value, baseRateManuallySet: true }));
  };

  const clearManualBaseRate = () => {
    const calculatedBaseRate = (formData.includedBWCopies * formData.overageBWRate) + (formData.includedColorCopies * formData.overageColorRate);
    setFormData(prev => ({ ...prev, serviceBaseRate: calculatedBaseRate, baseRateManuallySet: false }));
  };

  return (
    <div className="space-y-4">
      {/* Quote Details */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Quote Details</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Prepared For */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Prepared For</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Company Name</Label><Input value={formData.companyName} onChange={e => updateField('companyName', e.target.value)} className="h-8 text-sm" /></div>
            <div className="col-span-2"><Label className="text-xs">Address</Label><Input value={formData.address} onChange={e => updateField('address', e.target.value)} className="h-8 text-sm" /></div>
            <div className="col-span-2"><Label className="text-xs">Address Line 2</Label><Input value={formData.address2} onChange={e => updateField('address2', e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">City</Label><Input value={formData.city} onChange={e => updateField('city', e.target.value)} className="h-8 text-sm" /></div>
            <div className="grid grid-cols-2 gap-2"><div><Label className="text-xs">State</Label><Input value={formData.state} onChange={e => updateField('state', e.target.value)} className="h-8 text-sm" /></div><div><Label className="text-xs">Zip</Label><Input value={formData.zip} onChange={e => updateField('zip', e.target.value)} className="h-8 text-sm" /></div></div>
            <div className="col-span-2"><Label className="text-xs">Phone</Label><Input value={formData.phone} onChange={e => updateField('phone', e.target.value)} className="h-8 text-sm" /></div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Equipment</span>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-[50px_1fr_1.2fr_100px_100px_100px_70px_100px_40px] gap-2 text-xs font-medium text-muted-foreground px-2">
              <div>Qty</div>
              <div>Model</div>
              <div>Description</div>
              <div>Dealer</div>
              <div>MSRP</div>
              <div>Rep Cost</div>
              <div>Markup %</div>
              <div>Your Price</div>
              <div></div>
            </div>
            {formData.lineItems.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-[50px_1fr_1.2fr_100px_100px_100px_70px_100px_40px] gap-2 items-center">
                <div>
                  <Input type="number" min="1" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="h-8 text-sm" />
                </div>
                <div>
                  <Input value={item.model} onChange={e => updateLineItem(idx, 'model', e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Input value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Input value={item.dealerSource} onChange={e => updateLineItem(idx, 'dealerSource', e.target.value)} className="h-8 text-sm" placeholder="Dealer" />
                </div>
                <div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input type="text" value={formatCurrency(item.msrp || 0)} readOnly className="h-8 text-sm pl-5 bg-muted/50" />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input type="number" min="0" step="0.01" value={item.cost} onChange={e => updateLineItem(idx, 'cost', parseFloat(e.target.value) || 0)} className="h-8 text-sm pl-5" />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <Input type="number" min="0" step="1" value={item.markupPercent} onChange={e => updateLineItem(idx, 'markupPercent', parseFloat(e.target.value) || 0)} className="h-8 text-sm pr-6" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input type="text" value={formatCurrency(item.price)} readOnly className="h-8 text-sm pl-5 bg-muted/50" />
                  </div>
                </div>
                <div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(idx)} className="h-8 w-8 p-0 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
            {formData.lineItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No equipment. Click Add Item.</p>}
          </div>
        </CardContent>
      </Card>
      
      {/* Configuration */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Leasing Company</Label>
              <Select value={formData.leasingCompanyId} onValueChange={(v) => updateField('leasingCompanyId', v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select leasing company" />
                </SelectTrigger>
                <SelectContent>
                  {leasingCompanies.length > 0 ? (
                    leasingCompanies.map((company) => (
                      <SelectItem key={company} value={company}>{company}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No rate sheet uploaded</SelectItem>
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
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Total Sell Price</Label>
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
            </div>
            <div>
              <Label className="text-xs mb-2 block">
                {formData.leaseProgram === 'fmv' ? 'FMV' : '$1 Buyout'} Lease Terms (up to 3)
              </Label>
              
              {/* Warning when no rates available for company + program combination */}
              {!hasRatesForSelection && hasRateSheet && formData.leasingCompanyId && (
                <Alert className="mb-3 bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-xs">
                    No rates available for <strong>{formData.leasingCompanyId}</strong> with <strong>{formData.leaseProgram === 'fmv' ? 'FMV' : '$1 Buyout'}</strong> program. 
                    Please select a different leasing company or lease program.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex flex-wrap gap-2">
                {availableTerms.map(t => (
                  <Button 
                    key={t} 
                    type="button" 
                    variant={formData.selectedTerms.includes(t) ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => toggleTerm(t)} 
                    disabled={!formData.selectedTerms.includes(t) && formData.selectedTerms.length >= 3} 
                    className="h-7 text-xs"
                  >
                    {t} mo
                  </Button>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                {formData.selectedTerms.map(t => {
                  const calculatedPayment = calculateLeasePayment(t);
                  const hasOverride = formData.paymentOverrides[t] !== null && formData.paymentOverrides[t] !== undefined && formData.paymentOverrides[t]! > 0;
                  const effectivePayment = getEffectivePayment(t);
                  
                  return (
                    <div key={t} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-2">
                      <span className="min-w-[70px]">{t} months</span>
                      <span className={`font-medium min-w-[90px] ${hasOverride ? 'text-muted-foreground line-through' : ''}`}>
                        ${calculatedPayment.toLocaleString()}/mo
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-xs text-muted-foreground">Override:</span>
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                          <Input
                            type="text"
                            value={paymentOverrideTexts[t] || ''}
                            onChange={(e) => handlePaymentOverrideChange(t, e.target.value)}
                            placeholder={calculatedPayment.toLocaleString()}
                            className="h-7 text-xs pl-5 pr-7"
                          />
                          {hasOverride && (
                            <button
                              type="button"
                              onClick={() => clearPaymentOverride(t)}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {hasOverride && (
                          <span className="font-medium text-primary min-w-[80px]">
                            ${effectivePayment.toLocaleString()}/mo
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Agreement */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Service Agreement</CardTitle>
        </CardHeader>
        <CardContent>
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
          {/* Base Rate Display */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Base Rate (per month)</span>
                {formData.baseRateManuallySet && (
                  <button 
                    type="button" 
                    onClick={clearManualBaseRate}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Reset to calculated
                  </button>
                )}
              </div>
              <div className="relative w-32">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.serviceBaseRate || ''}
                  onChange={e => handleBaseRateChange(parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm pl-5 font-medium"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyout Information */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Buyout Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-2">
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
                <Label className="text-xs">Current Payment</Label>
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
                        if (!isNaN(num)) updateField('paymentAmount', num);
                        else if (val === '') updateField('paymentAmount', 0);
                      }
                    }}
                    className="h-8 text-sm pl-5"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Early Term. Fee</Label>
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
                        if (!isNaN(num)) updateField('earlyTerminationFee', num);
                        else if (val === '') updateField('earlyTerminationFee', 0);
                      }
                    }}
                    className="h-8 text-sm pl-5"
                    placeholder="0.00"
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
                        if (!isNaN(num)) updateField('returnShipping', num);
                        else if (val === '') updateField('returnShipping', 0);
                      }
                    }}
                    className="h-8 text-sm pl-5"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Total Buyout</span>
                {formData.totalBuyoutManuallySet && (
                  <button 
                    type="button" 
                    onClick={() => updateField('totalBuyoutManuallySet', false)}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Reset to calculated
                  </button>
                )}
              </div>
              <div className="relative w-32">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.totalBuyoutManuallySet && formData.totalBuyoutOverride !== undefined ? formData.totalBuyoutOverride : totalBuyout}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    updateField('totalBuyoutOverride', val);
                    updateField('totalBuyoutManuallySet', true);
                  }}
                  className="h-8 text-sm pl-5 font-medium"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
