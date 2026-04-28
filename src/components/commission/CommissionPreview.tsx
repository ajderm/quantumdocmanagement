import { forwardRef } from "react";
import { CommissionFormData } from "./CommissionForm";

interface DealerInfo {
  companyName?: string;
  address?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
}

export interface DocumentStyles {
  fontFamily?: string;
  fontColor?: string;
  tableBorderColor?: string;
  tableLineColor?: string;
}

interface CommissionPreviewProps {
  formData: CommissionFormData;
  dealerInfo?: DealerInfo;
  documentStyles?: DocumentStyles;
}

const fmt = (v: number) => (v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CommissionPreview = forwardRef<HTMLDivElement, CommissionPreviewProps>(
  ({ formData, dealerInfo, documentStyles }, ref) => {
    const totalBilled = formData.lineItems.reduce((s, i) => s + i.billed * i.quantity, 0);
    const totalRepCost = formData.lineItems.reduce((s, i) => s + i.repCost * i.quantity, 0);

    const costRows = [
      { label: "Buyout/TradeUp", billed: formData.buyoutTradeUp, repCost: formData.buyoutTradeUp },
      { label: "Shipping Costs", billed: formData.shippingCosts, repCost: formData.shippingCosts },
      { label: "Setup Cost", billed: formData.setupCost, repCost: formData.setupCost },
      { label: "Delivery Cost", billed: formData.deliveryCost, repCost: formData.deliveryCost },
      { label: "Networking", billed: formData.connectivity, repCost: formData.connectivity },
      { label: "Lead Fee", billed: formData.leadFee, repCost: formData.leadFee },
      { label: formData.otherSalesFeesNote ? `Other Sales Fees (${formData.otherSalesFeesNote})` : "Other Sales Fees", billed: formData.otherSalesFees, repCost: formData.otherSalesFees },
    ];

    const additionalCosts = costRows.reduce((s, r) => s + r.repCost, 0);
    const totalsBilled = totalBilled + costRows.reduce((s, r) => s + r.billed, 0);
    const totalsRepCost = totalRepCost + additionalCosts;

    const leaseEquipRev = formData.approvalAmount || totalBilled;
    const netEquipRev = leaseEquipRev;
    const equipmentAGP = netEquipRev - totalsRepCost;

    // Per-item commission calculation
    const perItemCommission = formData.lineItems.reduce((sum, item) => {
      const itemProfit = (item.billed - item.repCost) * item.quantity;
      const itemCommPct = item.commissionPercent !== undefined ? item.commissionPercent : formData.commissionPercentage;
      return sum + (itemProfit * (itemCommPct / 100));
    }, 0);

    const allSamePercent = formData.lineItems.every(item =>
      item.commissionPercent === undefined || item.commissionPercent === formData.commissionPercentage
    );
    const baseCommission = allSamePercent
      ? equipmentAGP * (formData.commissionPercentage / 100)
      : perItemCommission - (additionalCosts * (formData.commissionPercentage / 100));

    const splitMultiplier = formData.splitPercentage > 0 ? formData.splitPercentage / 100 : 1;
    const totalCommission = baseCommission * splitMultiplier;

    const borderColor = documentStyles?.tableBorderColor || '#000000';
    const lineColor = documentStyles?.tableLineColor || '#d1d5db';

    const isPurchase = formData.transactionType === "Purchase" || formData.transactionType === "Rental";
    const isLease = formData.transactionType.startsWith("Lease -- ");

    return (
      <div
        ref={ref}
        className="bg-white p-6 min-h-[11in] w-[8.5in] text-[14px] leading-tight"
        style={{
          fontFamily: documentStyles?.fontFamily || "Arial, sans-serif",
          color: documentStyles?.fontColor || "#000000",
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-start gap-3">
            {dealerInfo?.logoUrl && (
              <img src={dealerInfo.logoUrl} alt="Logo" className="h-10 object-contain" crossOrigin="anonymous" />
            )}
            <div className="text-[10px]">
              <p className="font-bold text-[14px]">{dealerInfo?.companyName || ""}</p>
              {dealerInfo?.address && <p>{dealerInfo.address}</p>}
              {dealerInfo?.phone && <p>Phone: {dealerInfo.phone}</p>}
              {dealerInfo?.website && <p>{dealerInfo.website}</p>}
            </div>
          </div>
          <h1 className="text-sm font-bold">Commission Worksheet</h1>
        </div>

        {/* Sale Info */}
        <div className="mb-3">
          <div className="font-bold pb-1 mb-2" style={{ borderBottom: `2px solid ${borderColor}` }}>SALE INFO</div>
          <div className="grid grid-cols-[140px_1fr] gap-y-0.5 text-[10px]">
            <span className="font-semibold">Sales Representative</span><span>{formData.salesRepresentative}</span>
            <span className="font-semibold">Sold On Date</span><span>{formData.soldOnDate}</span>
            <span className="font-semibold">Customer</span><span>{formData.customer}</span>
            <span className="font-semibold">Order Number</span><span>{formData.orderNumber}</span>
            <span className="font-semibold">Address</span><span>{formData.address}</span>
            <span className="font-semibold">City/State/Zip</span><span>{formData.cityStateZip}</span>
            <span className="font-semibold">County</span><span>{formData.county}</span>
          </div>
        </div>

        {/* Customer/Sale Type */}
        {(formData.transactionType || formData.promoDiscounts) && (
          <div className="mb-3">
            <div className="font-bold pb-1 mb-2" style={{ borderBottom: `2px solid ${borderColor}` }}>CUSTOMER/SALE TYPE</div>
            <div className="text-[10px] space-y-0.5">
              {formData.transactionType && (
                <div><span className="font-semibold">Transaction Type: </span>{formData.transactionType}</div>
              )}
              {formData.promoDiscounts && (
                <div><span className="font-semibold">Promo / Discount: </span>{formData.promoDiscounts}</div>
              )}
            </div>
          </div>
        )}

        {/* Items & Lease Info side by side */}
        <div className="mb-3">
          <div className="font-bold pb-1 mb-2" style={{ borderBottom: `2px solid ${borderColor}` }}>ITEM</div>
          <div className={isPurchase ? "" : "grid grid-cols-[1fr_200px] gap-4"}>
            {/* Left: Billed / Rep Cost / Condition table */}
            <div>
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <th className="text-left py-0.5 font-bold">Billed</th>
                    <th className="text-right py-0.5 font-bold w-16">Rep Cost</th>
                    <th className="text-center py-0.5 font-bold w-12">Comm %</th>
                    <th className="text-left py-0.5 font-bold w-20 pl-2">Condition</th>
                    <th className="text-left py-0.5 font-bold w-20 pl-2">Pricing Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${lineColor}` }}>
                    <td className="py-0.5 font-semibold">Total Billed Revenue</td>
                    <td className="py-0.5 text-right">${fmt(totalRepCost)}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  {formData.lineItems.map((item, i) => (
                    <tr key={item.id || i} style={{ borderBottom: `1px solid ${lineColor}` }}>
                      <td className="py-0.5 pl-2">{item.description} <span style={{ color: '#6b7280' }}>${fmt(item.billed)}</span></td>
                      <td className="py-0.5 text-right"></td>
                      <td className="py-0.5 text-center">{item.commissionPercent !== undefined ? item.commissionPercent : formData.commissionPercentage}%</td>
                      <td className="py-0.5 pl-2">{item.condition}</td>
                      <td className="py-0.5 pl-2">{item.dealerSource}</td>
                    </tr>
                  ))}
                  {/* Cost breakdown rows */}
                  {costRows.map((row) => (
                    <tr key={row.label} style={{ borderBottom: `1px solid ${lineColor}` }}>
                      <td className="py-0.5">{row.label}</td>
                      <td className="py-0.5 text-right">${fmt(row.repCost)}</td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
                  <tr className="font-bold" style={{ borderTop: `2px solid ${borderColor}` }}>
                    <td className="py-0.5">Totals  ${fmt(totalsBilled)}</td>
                    <td className="py-0.5 text-right">${fmt(totalsRepCost)}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Lease Information - hidden for Purchase/Rental */}
            {!isPurchase && (
            <div className="text-[10px]">
              <div className="font-bold pb-0.5 mb-1" style={{ borderBottom: `1px solid ${borderColor}` }}>Lease Information</div>
              <div className="space-y-0.5">
                <div className="flex justify-between"><span>Lease Company</span><span>{formData.leaseCompany}</span></div>
                <div className="flex justify-between"><span>Term</span><span>{formData.leaseTerm || "-"}</span></div>
                <div className="flex justify-between"><span>Approval Amount</span><span>${fmt(formData.approvalAmount)}</span></div>
                <div className="flex justify-between"><span>Approval Date</span><span>{formData.approvalDate}</span></div>
                <div className="flex justify-between"><span>Rate Used</span><span>{formData.rateUsed || "-"}</span></div>
                <div className="flex justify-between"><span>Lease Payment</span><span>${fmt(formData.leasePayment)}</span></div>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Commission */}
        <div className="mb-3">
          <div className="font-bold pb-1 mb-2" style={{ borderBottom: `2px solid ${borderColor}` }}>COMMISSION</div>
          <table className="text-[10px]">
            <tbody>
              <tr>
                <td className="pr-8 py-0.5 font-semibold">Equipment Revenue</td>
                <td></td>
                <td className="text-right">${fmt(netEquipRev)}</td>
              </tr>
              <tr>
                <td className="pr-8 py-0.5 font-semibold">Total Rep Cost</td>
                <td></td>
                <td className="text-right">${fmt(totalsRepCost)}</td>
              </tr>
              <tr style={{ borderTop: `1px solid ${lineColor}` }}>
                <td className="pr-8 py-0.5 font-bold">Equipment Gross Profit</td>
                <td></td>
                <td className="text-right font-bold">${fmt(equipmentAGP)}</td>
              </tr>
              <tr>
                <td className="pr-8 py-0.5 font-semibold">Commission Rate</td>
                <td></td>
                <td className="text-right">{formData.commissionPercentage}%</td>
              </tr>
              <tr>
                <td className="pr-8 py-0.5 font-semibold">Commission Amount</td>
                <td></td>
                <td className="text-right">${fmt(baseCommission)}</td>
              </tr>
              {formData.splitPercentage > 0 && (
                <tr>
                  <td className="pr-8 py-0.5 font-semibold">Split</td>
                  <td className="pr-8">{formData.splitRepName ? `with ${formData.splitRepName}` : ''}</td>
                  <td className="text-right">{formData.splitPercentage}%</td>
                </tr>
              )}
              <tr className="font-bold" style={{ borderTop: `2px solid ${borderColor}` }}>
                <td className="py-0.5">Total Commission</td>
                <td></td>
                <td className="text-right">${fmt(totalCommission)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div>
          <div className="font-bold pb-1 mb-3" style={{ borderBottom: `2px solid ${borderColor}` }}>SIGNATURES</div>
          <div className="space-y-4 text-[10px]">
            {[
              { label: "Sales Rep", name: formData.salesRepSignature },
              { label: "Sales Manager", name: formData.salesManagerSignature },
              { label: "President", name: formData.presidentSignature },
            ].map(({ label, name }) => (
              <div key={label} className="grid grid-cols-[1fr_150px] gap-4">
                <div>
                  {name && <p className="text-[10px] mb-0.5">{name}</p>}
                  <div className="h-5 mb-0.5" style={{ borderBottom: `1px solid ${borderColor}` }}></div>
                  <p className="text-[8px]">{label} Signature</p>
                </div>
                <div>
                  <div className="h-5 mb-0.5" style={{ borderBottom: `1px solid ${borderColor}`, marginTop: name ? '14px' : '0' }}></div>
                  <p className="text-[8px]">Date</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

CommissionPreview.displayName = "CommissionPreview";
