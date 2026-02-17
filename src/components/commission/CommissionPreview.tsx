import { forwardRef } from "react";
import { CommissionFormData } from "./CommissionForm";

interface DealerInfo {
  companyName?: string;
  address?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
}

interface CommissionPreviewProps {
  formData: CommissionFormData;
  dealerInfo?: DealerInfo;
}

const fmt = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CommissionPreview = forwardRef<HTMLDivElement, CommissionPreviewProps>(
  ({ formData, dealerInfo }, ref) => {
    const totalBilled = formData.lineItems.reduce((s, i) => s + i.billed * i.quantity, 0);
    const totalRepCost = formData.lineItems.reduce((s, i) => s + i.repCost * i.quantity, 0);

    const costRows = [
      { label: "Promo Discounts", billed: formData.promoDiscounts, repCost: 0 },
      { label: "Buyout/TradeUp", billed: formData.buyoutTradeUp, repCost: 0 },
      { label: "Shipping Costs", billed: formData.shippingCosts, repCost: formData.shippingCosts },
      { label: "Setup/Delivery Costs", billed: formData.setupDeliveryCosts, repCost: formData.setupDeliveryCosts },
      { label: "Connectivity", billed: formData.connectivity, repCost: formData.connectivity },
      { label: "Toner Cost", billed: formData.tonerCostMA ? 0 : formData.tonerCost, repCost: formData.tonerCostMA ? 0 : formData.tonerCost, ma: formData.tonerCostMA },
      { label: "IT Professional Services", billed: formData.itProfessionalServices, repCost: formData.itProfessionalServices },
      { label: "Lead Fee or Split", billed: formData.leadFeeOrSplit, repCost: formData.leadFeeOrSplit },
      { label: "Other Sales Fees", billed: formData.otherSalesFees, repCost: formData.otherSalesFees },
    ];

    const totalsBilled = totalBilled + costRows.reduce((s, r) => s + r.billed, 0);
    const totalsRepCost = totalRepCost + costRows.reduce((s, r) => s + r.repCost, 0);

    const leaseEquipRev = formData.approvalAmount || totalBilled;
    const netEquipRev = leaseEquipRev - formData.promoDiscounts;
    const equipmentAGP = netEquipRev - totalsRepCost;
    const totalCommission = equipmentAGP * (formData.commissionPercentage / 100) + formData.connectedCommission;

    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 min-h-[11in] w-[8.5in] text-[10px] leading-tight"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-start gap-3">
            {dealerInfo?.logoUrl && (
              <img src={dealerInfo.logoUrl} alt="Logo" className="h-10 object-contain" crossOrigin="anonymous" />
            )}
            <div className="text-[9px]">
              <p className="font-bold text-[10px]">{dealerInfo?.companyName || ""}</p>
              {dealerInfo?.address && <p>{dealerInfo.address}</p>}
              {dealerInfo?.phone && <p>Phone: {dealerInfo.phone}</p>}
              {dealerInfo?.website && <p>{dealerInfo.website}</p>}
            </div>
          </div>
          <h1 className="text-sm font-bold">Commission Worksheet</h1>
        </div>

        {/* Sale Info */}
        <div className="mb-3">
          <div className="font-bold border-b-2 border-black pb-1 mb-2">SALE INFO</div>
          <div className="grid grid-cols-[140px_1fr] gap-y-0.5 text-[9px]">
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
        {formData.transactionType && (
          <div className="mb-3">
            <div className="font-bold border-b-2 border-black pb-1 mb-2">CUSTOMER/SALE TYPE</div>
            <div className="text-[9px]">
              <span className="font-semibold">Transaction Type: </span>{formData.transactionType}
            </div>
          </div>
        )}

        {/* Items & Lease Info side by side */}
        <div className="mb-3">
          <div className="font-bold border-b-2 border-black pb-1 mb-2">ITEM</div>
          <div className="grid grid-cols-[1fr_200px] gap-4">
            {/* Left: Billed / Rep Cost / Condition table */}
            <div>
              <table className="w-full border-collapse text-[9px]">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-left py-0.5 font-bold">Billed</th>
                    <th className="text-right py-0.5 font-bold w-16">Rep Cost</th>
                    <th className="text-left py-0.5 font-bold w-20 pl-2">Condition</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="py-0.5 font-semibold">Total Billed Revenue</td>
                    <td className="py-0.5 text-right">${fmt(totalRepCost)}</td>
                    <td></td>
                  </tr>
                  {formData.lineItems.map((item, i) => (
                    <tr key={item.id || i} className="border-b border-gray-200">
                      <td className="py-0.5 pl-2">{item.description} <span className="text-gray-500">${fmt(item.billed)}</span></td>
                      <td className="py-0.5 text-right"></td>
                      <td className="py-0.5 pl-2">{item.condition}</td>
                    </tr>
                  ))}
                  {/* Cost breakdown rows */}
                  {costRows.map((row) => (
                    <tr key={row.label} className="border-b border-gray-200">
                      <td className="py-0.5">{row.label}</td>
                      <td className="py-0.5 text-right">
                        {row.ma ? "MA" : `$${fmt(row.repCost)}`}
                      </td>
                      <td></td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-black font-bold">
                    <td className="py-0.5">Totals  ${fmt(totalsBilled)}</td>
                    <td className="py-0.5 text-right">${fmt(totalsRepCost)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Lease Information */}
            <div className="text-[9px]">
              <div className="font-bold border-b border-black pb-0.5 mb-1">Lease Information</div>
              <div className="space-y-0.5">
                <div className="flex justify-between"><span>Lease Company</span><span>{formData.leaseCompany}</span></div>
                <div className="flex justify-between"><span>Term</span><span>{formData.leaseTerm || "-"}</span></div>
                <div className="flex justify-between"><span>Approval Amount</span><span>${fmt(formData.approvalAmount)}</span></div>
                <div className="flex justify-between"><span>Approval Date</span><span>{formData.approvalDate}</span></div>
                <div className="flex justify-between"><span>Rate Used</span><span>{formData.rateUsed || "-"}</span></div>
                <div className="flex justify-between"><span>Lease Payment</span><span>${fmt(formData.leasePayment)}</span></div>
                <div className="border-t border-gray-300 mt-1 pt-1">
                  <div className="font-semibold mb-0.5">Revenue</div>
                  <div className="flex justify-between"><span>Lease/Equip Rev</span><span>${fmt(leaseEquipRev)}</span></div>
                  <div className="flex justify-between"><span>Net Equip Rev</span><span>${fmt(netEquipRev)}</span></div>
                  <div className="flex justify-between font-bold"><span>Equipment AGP</span><span>${fmt(equipmentAGP)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Commission */}
        <div>
          <div className="font-bold border-b-2 border-black pb-1 mb-2">COMMISSION</div>
          <table className="text-[9px]">
            <tbody>
              <tr>
                <td className="pr-8 py-0.5 font-semibold">Commission Percentage</td>
                <td className="pr-8"></td>
                <td className="text-right">{formData.commissionPercentage}%</td>
              </tr>
              <tr>
                <td className="py-0.5 font-semibold">Connected</td>
                <td className="text-right pr-8">${fmt(formData.connectedAmount)}</td>
                <td className="text-right">${fmt(formData.connectedCommission)}</td>
              </tr>
              <tr className="border-t-2 border-black font-bold">
                <td className="py-0.5">Total Commission</td>
                <td></td>
                <td className="text-right">${fmt(totalCommission)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

CommissionPreview.displayName = "CommissionPreview";
