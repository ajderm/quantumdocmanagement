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
  setupDeliveryCosts: number;
  connectivity: number;
  tonerCost: number;
  tonerCostMA: boolean;
  itProfessionalServices: number;
  leadFeeOrSplit: number;
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
    shippingCosts: 0,
    setupDeliveryCosts: 0,
    connectivity: 0,
    tonerCost: 0,
    tonerCostMA: false,
    itProfessionalServices: 0,
    leadFeeOrSplit: 0,
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
  };
}

export function CommissionForm({ deal, company, lineItems, dealOwner, portalId, onFormChange, savedConfig }: CommissionFormProps) {
  const hasInitializedRef = useRef(false);
  const [formData, setFormData] = useState<CommissionFormData>(getDefaultCommissionFormData());
  const [leasingCompanies, setLeasingCompanies] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Local text states for currency inputs
  const [promoText, setPromoText] = useState("");
  const [buyoutText, setBuyoutText] = useState("");
  const [shippingText, setShippingText] = useState("");
  const [setupText, setSetupText] = useState("");
  const [connectivityText, setConnectivityText] = useState("");
  const [tonerText, setTonerText] = useState("");
  const [itText, setItText] = useState("");
  const [leadText, setLeadText] = useState("");
  const [otherText, setOtherText] = useState("");
  const [connectedText, setConnectedText] = useState("");
  const [rateText, setRateText] = useState("");

  // Fetch leasing companies from rate sheet
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
      } catch (err) {
        console.error('Failed to fetch leasing companies:', err);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchLeasingCompanies();
  }, [portalId]);

  // Initialize from HubSpot data and/or saved config
  useEffect(() => {
    if (hasInitializedRef.current) return;

    const hubspotData: Partial<CommissionFormData> = {
      salesRepresentative: dealOwner ? `${dealOwner.firstName || ""} ${dealOwner.lastName || ""}`.trim() : "",
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
        condition: item.properties?.condition || item.properties?.hs_product_type || "",
      })),
      approvalAmount: parseFloat(deal?.amount) || 0,
    };

    if (savedConfig) {
      setFormData({ ...getDefaultCommissionFormData(), ...savedConfig });
      // Restore text fields
      if (savedConfig.promoDiscounts) setPromoText(String(savedConfig.promoDiscounts));
      if (savedConfig.buyoutTradeUp) setBuyoutText(String(savedConfig.buyoutTradeUp));
      if (savedConfig.shippingCosts) setShippingText(String(savedConfig.shippingCosts));
      if (savedConfig.setupDeliveryCosts) setSetupText(String(savedConfig.setupDeliveryCosts));
      if (savedConfig.connectivity) setConnectivityText(String(savedConfig.connectivity));
      if (savedConfig.tonerCost) setTonerText(String(savedConfig.tonerCost));
      if (savedConfig.itProfessionalServices) setItText(String(savedConfig.itProfessionalServices));
      if (savedConfig.leadFeeOrSplit) setLeadText(String(savedConfig.leadFeeOrSplit));
      if (savedConfig.otherSalesFees) setOtherText(String(savedConfig.otherSalesFees));
      if (savedConfig.connectedAmount) setConnectedText(String(savedConfig.connectedAmount));
      if (savedConfig.rateUsed) setRateText(String(savedConfig.rateUsed));
    } else {
      setFormData(prev => ({ ...prev, ...hubspotData }));
    }

    hasInitializedRef.current = true;
  }, [deal, company, dealOwner, lineItems, savedConfig]);

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

  const totalBilledWithCosts = totalBilled +
    formData.promoDiscounts + formData.buyoutTradeUp + formData.shippingCosts +
    formData.setupDeliveryCosts + formData.connectivity +
    (formData.tonerCostMA ? 0 : formData.tonerCost) +
    formData.itProfessionalServices + formData.leadFeeOrSplit + formData.otherSalesFees;

  const totalRepCostWithCosts = totalRepCost +
    formData.shippingCosts + formData.setupDeliveryCosts + formData.connectivity +
    (formData.tonerCostMA ? 0 : formData.tonerCost) +
    formData.itProfessionalServices + formData.leadFeeOrSplit + formData.otherSalesFees;

  // Lease calculations
  const leaseEquipRev = formData.approvalAmount || totalBilled;
  const netEquipRev = leaseEquipRev - formData.promoDiscounts;
  const equipmentAGP = netEquipRev - totalRepCostWithCosts;

  // Commission
  const totalCommission = equipmentAGP * (formData.commissionPercentage / 100) + formData.connectedCommission;

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
            <div className="grid grid-cols-[1fr_100px_100px_100px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Description</span>
              <span>Billed</span>
              <span>Rep Cost</span>
              <span>Condition</span>
            </div>
            {formData.lineItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[1fr_100px_100px_100px] gap-2">
                <Input className="h-8 text-sm" value={item.description} onChange={e => updateLineItem(index, "description", e.target.value)} />
                <Input className="h-8 text-sm text-right" value={item.billed ? formatCurrency(item.billed) : ""} onChange={e => updateLineItem(index, "billed", parseCurrency(e.target.value))} />
                <Input className="h-8 text-sm text-right" value={item.repCost ? formatCurrency(item.repCost) : ""} onChange={e => updateLineItem(index, "repCost", parseCurrency(e.target.value))} />
                <Input className="h-8 text-sm" value={item.condition} onChange={e => updateLineItem(index, "condition", e.target.value)} />
              </div>
            ))}
            <div className="grid grid-cols-[1fr_100px_100px_100px] gap-2 text-xs font-bold px-1 pt-1 border-t">
              <span>Total Equipment</span>
              <span className="text-right">${formatCurrency(totalBilled)}</span>
              <span className="text-right">${formatCurrency(totalRepCost)}</span>
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
              { label: "Setup / Delivery Costs", field: "setupDeliveryCosts" as const, text: setupText, setText: setSetupText },
              { label: "Connectivity", field: "connectivity" as const, text: connectivityText, setText: setConnectivityText },
              { label: "IT Professional Services", field: "itProfessionalServices" as const, text: itText, setText: setItText },
              { label: "Lead Fee or Split", field: "leadFeeOrSplit" as const, text: leadText, setText: setLeadText },
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
            {/* Toner with MA toggle */}
            <div className="flex items-center gap-2">
              <Label className="text-xs flex-1 min-w-[140px]">
                Toner Cost
                <label className="ml-2 inline-flex items-center gap-1 text-[10px]">
                  <input type="checkbox" checked={formData.tonerCostMA} onChange={e => updateField("tonerCostMA", e.target.checked)} className="h-3 w-3" />
                  MA
                </label>
              </Label>
              <Input
                className="h-7 text-sm text-right w-28"
                disabled={formData.tonerCostMA}
                value={formData.tonerCostMA ? "MA" : (tonerText || (formData.tonerCost ? formatCurrency(formData.tonerCost) : ""))}
                onChange={e => { setTonerText(e.target.value); updateField("tonerCost", parseCurrency(e.target.value)); }}
                onBlur={() => { if (formData.tonerCost) setTonerText(formatCurrency(formData.tonerCost)); }}
              />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t font-bold text-xs">
              <span className="flex-1">Totals</span>
              <span className="w-28 text-right">${formatCurrency(totalBilledWithCosts)}</span>
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
                <Select value={formData.leaseCompany} onValueChange={v => updateField("leaseCompany", v)}>
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
                <Input className="h-7 text-sm" type="number" value={formData.leaseTerm || ""} onChange={e => updateField("leaseTerm", parseInt(e.target.value) || 0)} />
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
                  className="h-7 text-sm text-right"
                  value={rateText || (formData.rateUsed ? String(formData.rateUsed) : "")}
                  onChange={e => { setRateText(e.target.value); updateField("rateUsed", parseFloat(e.target.value) || 0); }}
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
              <Input className="h-8 text-sm text-right" value={formData.commissionPercentage || ""} onChange={e => updateField("commissionPercentage", parseFloat(e.target.value) || 0)} />
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
          <div className="mt-3 pt-2 border-t text-sm font-bold flex justify-between">
            <span>Total Commission</span>
            <span>${formatCurrency(totalCommission)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
