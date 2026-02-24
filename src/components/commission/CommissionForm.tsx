import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export interface CommissionLineItem {
  id: string;
  quantity: number;
  description: string;
  billed: number;
  repCost: number;
  condition: string;
  dealerSource: string;
  specialPricing: string;
}

export interface CommissionFormData {
  // Sale Info
  salesRepresentative: string;
  soldOnDate: string;
  customer: string;
  orderNumber: string;
  address: string;
  cityStateZip: string;
  county: string;

  // Customer/Sale Type
  transactionType: string;

  // Line Items
  lineItems: CommissionLineItem[];

  // Cost Breakdown
  promoDiscounts: number;
  buyoutTradeUp: number;
  shippingCosts: number;
  setupCost: number;
  deliveryCost: number;
  connectivity: number;
  itProfessionalServices: number;
  leadFee: number;
  splitPercentage: number;
  otherSalesFees: number;

  // Lease Information
  leaseCompany: string;
  leaseTerm: number;
  approvalAmount: number;
  approvalDate: string;
  rateUsed: number;
  leasePayment: number;

  // Commission
  commissionPercentage: number;
  connectedAmount: number;
  connectedCommission: number;

  // Signatures
  salesRepSignature: string;
  salesManagerSignature: string;
  presidentSignature: string;
}

interface CommissionFormProps {
  deal: any;
  company: any;
  contacts: any[];
  lineItems: any[];
  dealOwner: any;
  portalId: string | null;
  onFormChange: (data: CommissionFormData) => void;
  savedConfig: CommissionFormData | null;
  quoteConfig?: any;
  commissionUsers?: Array<{ hubspot_user_name: string; hubspot_user_id?: string; commission_percentage: number }>;
}

const formatCurrency = (value: number): string =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseCurrency = (value: string): number =>
  parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;

export function getDefaultCommissionFormData(): CommissionFormData {
  return {
    salesRepresentative: "",
    soldOnDate: new Date().toISOString().split("T")[0],
    customer: "",
    orderNumber: "",
    address: "",
    cityStateZip: "",
    county: "",
    transactionType: "",
    lineItems: [],
    promoDiscounts: 0,
    buyoutTradeUp: 0,
    shippingCosts: 170,
    setupCost: 100,
    deliveryCost: 100,
    connectivity: 0,
    itProfessionalServices: 0,
    leadFee: 0,
    splitPercentage: 0,
    otherSalesFees: 0,
    leaseCompany: "",
    leaseTerm: 0,
    approvalAmount: 0,
    approvalDate: "",
    rateUsed: 0,
    leasePayment: 0,
    commissionPercentage: 40,
    connectedAmount: 0,
    connectedCommission: 0,
    salesRepSignature: "",
    salesManagerSignature: "",
    presidentSignature: "",
  };
}

export function CommissionForm({ deal, company, lineItems, dealOwner, portalId, onFormChange, savedConfig, quoteConfig, commissionUsers }: CommissionFormProps) {
  const hasInitializedRef = useRef(false);
  const [formData, setFormData] = useState<CommissionFormData>(getDefaultCommissionFormData());
  const [leasingCompanies, setLeasingCompanies] = useState<string[]>([]);
  const [rateFactors, setRateFactors] = useState<Array<{ leasing_company: string; term_months: number; rate_factor: number }>>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Local text states for currency inputs
  const [promoText, setPromoText] = useState("");
  const [buyoutText, setBuyoutText] = useState("");
  const [shippingText, setShippingText] = useState("170");
  const [setupCostText, setSetupCostText] = useState("100");
  const [deliveryCostText, setDeliveryCostText] = useState("100");
  const [connectivityText, setConnectivityText] = useState("");
  const [itText, setItText] = useState("");
  const [leadFeeText, setLeadFeeText] = useState("");
  const [splitText, setSplitText] = useState("");
  const [otherText, setOtherText] = useState("");
  const [connectedText, setConnectedText] = useState("");
  const [rateText, setRateText] = useState("");

  // Fetch leasing companies and rate factors from rate sheet
  useEffect(() => {
    const fetchLeasingCompanies = async () => {
      if (!portalId) return;
      setLoadingCompanies(true);
      try {
        const { data } = await supabase.functions.invoke('get-rate-factors', {
          body: { portalId }
        });
        if (data?.leasingCompanies) {
          setLeasingCompanies(data.leasingCompanies);
        }
        if (data?.rateFactors) {
          setRateFactors(data.rateFactors);
        }
      } catch (err) {
        console.error('Failed to fetch leasing companies:', err);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchLeasingCompanies();
  }, [portalId]);

  // Available terms for selected leasing company
  const availableTerms = formData.leaseCompany
    ? [...new Set(rateFactors.filter(r => r.leasing_company === formData.leaseCompany).map(r => r.term_months))].sort((a, b) => a - b)
    : [];

  // Auto-populate rate when term changes
  const autoPopulateRate = (company: string, term: number) => {
    const match = rateFactors.find(r => r.leasing_company === company && r.term_months === term);
    if (match) {
      setFormData(prev => ({ ...prev, rateUsed: match.rate_factor }));
      setRateText(String(match.rate_factor));
    }
  };

  // Auto-populate commission % from commissionUsers when salesRepresentative changes
  useEffect(() => {
    if (!commissionUsers?.length || !formData.salesRepresentative) return;
    const match = commissionUsers.find(u =>
      u.hubspot_user_name.toLowerCase() === formData.salesRepresentative.toLowerCase()
    );
    if (match) {
      setFormData(prev => ({ ...prev, commissionPercentage: match.commission_percentage }));
    }
  }, [formData.salesRepresentative, commissionUsers]);

  // Initialize from HubSpot data and/or saved config
  useEffect(() => {
    if (hasInitializedRef.current) return;

    const closeDate = deal?.closeDate || deal?.properties?.closedate || deal?.closedate;
    const formattedCloseDate = closeDate
      ? new Date(closeDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const hubspotData: Partial<CommissionFormData> = {
      salesRepresentative: dealOwner ? `${dealOwner.firstName || ""} ${dealOwner.lastName || ""}`.trim() : "",
      soldOnDate: formattedCloseDate,
      customer: company?.name || "",
      orderNumber: deal?.hsObjectId || "",
      address: company?.apAddress || company?.address || "",
      cityStateZip: [
        company?.apCity || company?.city,
        company?.apState || company?.state,
        company?.apZip || company?.zip
      ].filter(Boolean).join(", "),
      county: company?.county || "",
      lineItems: (lineItems || []).map((item: any) => ({
        id: item.id || `li-${Date.now()}-${Math.random()}`,
        quantity: item.quantity || 1,
        description: `${item.quantity || 1} - ${item.name || item.description || ""}`,
        billed: item.price || 0,
        repCost: item.cost || 0,
        condition: item.condition || item.properties?.condition || item.properties?.hs_product_condition || "New",
        dealerSource: item.dealer || item.properties?.dealer || "",
        specialPricing: "",
      })),
      approvalAmount: parseFloat(deal?.amount) || 0,
    };

    // Try to pre-populate buyout from quote config
    let buyoutFromQuote = 0;
    if (quoteConfig) {
      if (quoteConfig.buyoutFinancingAmount) {
        buyoutFromQuote = parseFloat(quoteConfig.buyoutFinancingAmount) || 0;
      } else if (quoteConfig.paymentAmount && quoteConfig.paymentsRemaining) {
        buyoutFromQuote = (parseFloat(quoteConfig.paymentAmount) || 0) * (parseFloat(quoteConfig.paymentsRemaining) || 0)
          + (parseFloat(quoteConfig.earlyTerminationFee) || 0)
          + (parseFloat(quoteConfig.returnShipping) || 0);
      }
    }

    if (savedConfig) {
      const merged = { ...getDefaultCommissionFormData(), ...savedConfig };
      
      // Backward compatibility: migrate old fields
      const sc = savedConfig as any;
      if (sc.setupDeliveryCosts !== undefined && merged.setupCost === 100 && merged.deliveryCost === 100) {
        const half = (sc.setupDeliveryCosts || 0) / 2;
        merged.setupCost = half;
        merged.deliveryCost = half;
      }
      if (sc.leadFeeOrSplit !== undefined && merged.leadFee === 0) {
        merged.leadFee = sc.leadFeeOrSplit || 0;
      }
      // Ensure new fields have defaults if missing from old config
      if (merged.splitPercentage === undefined) merged.splitPercentage = 0;

      // Re-apply fresh HubSpot condition/dealer values
      if (lineItems?.length && merged.lineItems?.length) {
        merged.lineItems = merged.lineItems.map((savedItem: any, idx: number) => {
          const freshItem = (lineItems as any[])[idx];
          if (freshItem) {
            return {
              ...savedItem,
              condition: freshItem.condition || freshItem.properties?.condition || freshItem.properties?.hs_product_condition || savedItem.condition || "New",
              dealerSource: freshItem.dealer || freshItem.properties?.dealer || savedItem.dealerSource || "",
            };
          }
          return savedItem;
        });
      }

      // Pre-populate buyout from quote if not already set
      if (buyoutFromQuote > 0 && !merged.buyoutTradeUp) {
        merged.buyoutTradeUp = buyoutFromQuote;
      }

      setFormData(merged);
      // Restore text fields
      if (savedConfig.promoDiscounts) setPromoText(String(savedConfig.promoDiscounts));
      if (merged.buyoutTradeUp) setBuyoutText(String(merged.buyoutTradeUp));
      if (merged.shippingCosts) setShippingText(String(merged.shippingCosts));
      if (merged.setupCost) setSetupCostText(String(merged.setupCost));
      if (merged.deliveryCost) setDeliveryCostText(String(merged.deliveryCost));
      if (merged.connectivity) setConnectivityText(String(merged.connectivity));
      if (merged.itProfessionalServices) setItText(String(merged.itProfessionalServices));
      if (merged.leadFee) setLeadFeeText(String(merged.leadFee));
      if (merged.splitPercentage) setSplitText(String(merged.splitPercentage));
      if (merged.otherSalesFees) setOtherText(String(merged.otherSalesFees));
      if (savedConfig.connectedAmount) setConnectedText(String(savedConfig.connectedAmount));
      if (savedConfig.rateUsed) setRateText(String(savedConfig.rateUsed));
    } else {
      const initData = { ...getDefaultCommissionFormData(), ...hubspotData };
      if (buyoutFromQuote > 0) {
        initData.buyoutTradeUp = buyoutFromQuote;
        setBuyoutText(String(buyoutFromQuote));
      }
      setFormData(initData);
    }

    hasInitializedRef.current = true;
  }, [deal, company, dealOwner, lineItems, savedConfig, quoteConfig]);

  useEffect(() => {
    onFormChange(formData);
  }, [formData, onFormChange]);

  const updateField = <K extends keyof CommissionFormData>(field: K, value: CommissionFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLineItem = (index: number, field: keyof CommissionLineItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.lineItems];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, lineItems: newItems };
    });
  };

  // Computed values
  const totalBilled = formData.lineItems.reduce((sum, item) => sum + (item.billed * item.quantity), 0);
  const totalRepCost = formData.lineItems.reduce((sum, item) => sum + (item.repCost * item.quantity), 0);

  const totalRepCostWithCosts = totalRepCost +
    formData.shippingCosts + formData.setupCost + formData.deliveryCost +
    formData.connectivity + formData.itProfessionalServices +
    formData.leadFee + formData.otherSalesFees;

  // Lease calculations
  const leaseEquipRev = formData.approvalAmount || totalBilled;
  const netEquipRev = leaseEquipRev - formData.promoDiscounts;
  const equipmentAGP = netEquipRev - totalRepCostWithCosts;

  // Commission with split
  const baseCommission = equipmentAGP * (formData.commissionPercentage / 100);
  const splitMultiplier = formData.splitPercentage > 0 ? formData.splitPercentage / 100 : 1;
  const totalCommission = (baseCommission * splitMultiplier) + formData.connectedCommission;

  return (
    <div className="space-y-4">
      {/* Sale Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sale Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sales Representative</Label>
              <Input className="h-8 text-sm" value={formData.salesRepresentative} onChange={e => updateField("salesRepresentative", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Sold On Date</Label>
              <Input className="h-8 text-sm" type="date" value={formData.soldOnDate} onChange={e => updateField("soldOnDate", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Customer</Label>
              <Input className="h-8 text-sm" value={formData.customer} onChange={e => updateField("customer", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Order Number</Label>
              <Input className="h-8 text-sm" value={formData.orderNumber} onChange={e => updateField("orderNumber", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Address</Label>
              <Input className="h-8 text-sm" value={formData.address} onChange={e => updateField("address", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">City / State / Zip</Label>
              <Input className="h-8 text-sm" value={formData.cityStateZip} onChange={e => updateField("cityStateZip", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">County</Label>
              <Input className="h-8 text-sm" value={formData.county} onChange={e => updateField("county", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Transaction Type</Label>
              <Input className="h-8 text-sm" value={formData.transactionType} onChange={e => updateField("transactionType", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Equipment Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_80px_80px_100px_1fr] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Description</span>
              <span>Billed</span>
              <span>Rep Cost</span>
              <span>Condition</span>
              <span>Dealer Source</span>
              <span>Special Pricing / Credits</span>
            </div>
            {formData.lineItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[1fr_80px_80px_80px_100px_1fr] gap-2">
                <Input className="h-8 text-sm" value={item.description} onChange={e => updateLineItem(index, "description", e.target.value)} />
                <Input className="h-8 text-sm text-right" value={item.billed ? formatCurrency(item.billed) : ""} onChange={e => updateLineItem(index, "billed", parseCurrency(e.target.value))} />
                <Input className="h-8 text-sm text-right" value={item.repCost ? formatCurrency(item.repCost) : ""} onChange={e => updateLineItem(index, "repCost", parseCurrency(e.target.value))} />
                <Input className="h-8 text-sm" value={item.condition} onChange={e => updateLineItem(index, "condition", e.target.value)} />
                <Input className="h-8 text-sm" value={item.dealerSource} onChange={e => updateLineItem(index, "dealerSource", e.target.value)} />
                <Input className="h-8 text-sm" placeholder="DIR, nonprofit, promo..." value={item.specialPricing} onChange={e => updateLineItem(index, "specialPricing", e.target.value)} />
              </div>
            ))}
            <div className="grid grid-cols-[1fr_80px_80px_80px_100px_1fr] gap-2 text-xs font-bold px-1 pt-1 border-t">
              <span>Total Equipment</span>
              <span className="text-right">${formatCurrency(totalBilled)}</span>
              <span className="text-right">${formatCurrency(totalRepCost)}</span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown & Lease Info side by side */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Additional Costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Promo Discounts", field: "promoDiscounts" as const, text: promoText, setText: setPromoText },
              { label: "Buyout / TradeUp", field: "buyoutTradeUp" as const, text: buyoutText, setText: setBuyoutText },
              { label: "Shipping Costs", field: "shippingCosts" as const, text: shippingText, setText: setShippingText },
              { label: "Setup Cost", field: "setupCost" as const, text: setupCostText, setText: setSetupCostText },
              { label: "Delivery Cost", field: "deliveryCost" as const, text: deliveryCostText, setText: setDeliveryCostText },
              { label: "Connectivity", field: "connectivity" as const, text: connectivityText, setText: setConnectivityText },
              { label: "IT Professional Services", field: "itProfessionalServices" as const, text: itText, setText: setItText },
              { label: "Lead Fee", field: "leadFee" as const, text: leadFeeText, setText: setLeadFeeText },
              { label: "Other Sales Fees", field: "otherSalesFees" as const, text: otherText, setText: setOtherText },
            ].map(({ label, field, text, setText }) => (
              <div key={field} className="flex items-center gap-2">
                <Label className="text-xs flex-1 min-w-[140px]">{label}</Label>
                <Input
                  className="h-7 text-sm text-right w-28"
                  value={text || (formData[field] ? formatCurrency(formData[field] as number) : "")}
                  onChange={e => { setText(e.target.value); updateField(field, parseCurrency(e.target.value)); }}
                  onBlur={() => { if (formData[field]) setText(formatCurrency(formData[field] as number)); }}
                />
              </div>
            ))}
            {/* Split Percentage */}
            <div className="flex items-center gap-2">
              <Label className="text-xs flex-1 min-w-[140px]">Split %</Label>
              <Input
                className="h-7 text-sm text-right w-28"
                placeholder="0 = no split"
                value={splitText || (formData.splitPercentage ? String(formData.splitPercentage) : "")}
                onChange={e => { setSplitText(e.target.value); updateField("splitPercentage", parseFloat(e.target.value) || 0); }}
                onBlur={() => { if (formData.splitPercentage) setSplitText(String(formData.splitPercentage)); }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lease Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label className="text-xs">Lease Company</Label>
              {leasingCompanies.length > 0 ? (
                <Select value={formData.leaseCompany} onValueChange={v => {
                  updateField("leaseCompany", v);
                  // Reset term when company changes
                  updateField("leaseTerm", 0);
                  updateField("rateUsed", 0);
                  setRateText("");
                }}>
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue placeholder={loadingCompanies ? "Loading..." : "Select lease company"} />
                  </SelectTrigger>
                  <SelectContent>
                    {leasingCompanies.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input className="h-7 text-sm" value={formData.leaseCompany} onChange={e => updateField("leaseCompany", e.target.value)} placeholder={loadingCompanies ? "Loading..." : "Enter lease company"} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Term (months)</Label>
                {availableTerms.length > 0 ? (
                  <Select value={formData.leaseTerm ? String(formData.leaseTerm) : ""} onValueChange={v => {
                    const term = parseInt(v) || 0;
                    updateField("leaseTerm", term);
                    autoPopulateRate(formData.leaseCompany, term);
                  }}>
                    <SelectTrigger className="h-7 text-sm">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTerms.map(t => (
                        <SelectItem key={t} value={String(t)}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input className="h-7 text-sm" type="number" value={formData.leaseTerm || ""} onChange={e => updateField("leaseTerm", parseInt(e.target.value) || 0)} />
                )}
              </div>
              <div>
                <Label className="text-xs">Approval Amount</Label>
                <Input className="h-7 text-sm text-right" value={formData.approvalAmount ? formatCurrency(formData.approvalAmount) : ""} onChange={e => updateField("approvalAmount", parseCurrency(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Approval Date</Label>
                <Input className="h-7 text-sm" type="date" value={formData.approvalDate} onChange={e => updateField("approvalDate", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Rate Used</Label>
                <Input
                  className="h-7 text-sm text-right bg-muted/50"
                  readOnly
                  value={rateText || (formData.rateUsed ? String(formData.rateUsed) : "")}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Lease Payment</Label>
              <Input className="h-7 text-sm text-right" value={formData.leasePayment ? formatCurrency(formData.leasePayment) : ""} onChange={e => updateField("leasePayment", parseCurrency(e.target.value))} />
            </div>

            <div className="pt-2 border-t space-y-1 text-xs">
              <div className="flex justify-between"><span>Lease/Equip Rev</span><span>${formatCurrency(leaseEquipRev)}</span></div>
              <div className="flex justify-between"><span>Net Equip Rev</span><span>${formatCurrency(netEquipRev)}</span></div>
              <div className="flex justify-between font-bold"><span>Equipment AGP</span><span>${formatCurrency(equipmentAGP)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Commission</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Commission %</Label>
              <Input className="h-8 text-sm text-right bg-muted/50" readOnly value={formData.commissionPercentage || ""} />
            </div>
            <div>
              <Label className="text-xs">Connected Amount</Label>
              <Input
                className="h-8 text-sm text-right"
                value={connectedText || (formData.connectedAmount ? formatCurrency(formData.connectedAmount) : "")}
                onChange={e => { setConnectedText(e.target.value); updateField("connectedAmount", parseCurrency(e.target.value)); }}
                onBlur={() => { if (formData.connectedAmount) setConnectedText(formatCurrency(formData.connectedAmount)); }}
              />
            </div>
            <div>
              <Label className="text-xs">Connected Commission</Label>
              <Input
                className="h-8 text-sm text-right"
                value={formData.connectedCommission ? formatCurrency(formData.connectedCommission) : ""}
                onChange={e => updateField("connectedCommission", parseCurrency(e.target.value))}
              />
            </div>
          </div>
          {formData.splitPercentage > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              Split {formData.splitPercentage}% applied: ${formatCurrency(baseCommission)} × {formData.splitPercentage}% = ${formatCurrency(baseCommission * (formData.splitPercentage / 100))}
            </div>
          )}
          <div className="mt-3 pt-2 border-t text-sm font-bold flex justify-between">
            <span>Total Commission</span>
            <span>${formatCurrency(totalCommission)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Signatures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Sales Rep Name</Label>
            <Input className="h-8 text-sm" value={formData.salesRepSignature} onChange={e => updateField("salesRepSignature", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Sales Manager Name</Label>
            <Input className="h-8 text-sm" value={formData.salesManagerSignature} onChange={e => updateField("salesManagerSignature", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">President Name</Label>
            <Input className="h-8 text-sm" value={formData.presidentSignature} onChange={e => updateField("presidentSignature", e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
