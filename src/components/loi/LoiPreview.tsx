import { forwardRef } from "react";
import { format } from "date-fns";
import { LoiFormData } from "./LoiForm";

interface DealerInfo {
  company_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  website?: string;
  logo_url?: string;
}

interface LoiPreviewProps {
  formData: LoiFormData;
  dealerInfo?: DealerInfo;
}

export const LoiPreview = forwardRef<HTMLDivElement, LoiPreviewProps>(
  ({ formData, dealerInfo }, ref) => {
    const formatCurrency = (value: string | number): string => {
      const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.]/g, "")) : value;
      if (isNaN(num)) return "-";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    };

    const formatDate = (date: Date | string | null): string => {
      if (!date) return "-";
      const d = typeof date === "string" ? new Date(date) : date;
      if (isNaN(d.getTime())) return "-";
      return format(d, "MM/dd/yyyy");
    };

    const calculateTotalEquipmentCost = (): number => {
      return formData.equipmentItems.reduce((sum, item) => {
        return sum + (parseFloat(item.totalCost) || 0);
      }, 0);
    };

    const getLesseeFullAddress = (): string => {
      const parts = [
        formData.lesseeAddress,
        formData.lesseeCity,
        formData.lesseeState,
        formData.lesseeZip,
      ].filter(Boolean);
      if (parts.length === 0) return "-";
      return `${formData.lesseeAddress || ""}, ${formData.lesseeCity || ""}, ${formData.lesseeState || ""} ${formData.lesseeZip || ""}`.replace(/^,\s*/, "").replace(/,\s*,/g, ",");
    };

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 min-h-[11in] w-[8.5in] text-[11px] leading-tight"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          {/* Left: Dealer Info */}
          <div className="flex items-start gap-4">
            {dealerInfo?.logo_url && (
              <img
                src={dealerInfo.logo_url}
                alt="Company Logo"
                className="h-12 object-contain"
                crossOrigin="anonymous"
              />
            )}
            <div>
              <p className="font-bold text-[10px]">
                {dealerInfo?.company_name || "Company Name"}
              </p>
              <p className="text-[9px]">
                {dealerInfo?.address_line1}
                {dealerInfo?.address_line2 && <>, {dealerInfo.address_line2}</>}
              </p>
              <p className="text-[9px]">
                {[dealerInfo?.city, dealerInfo?.state, dealerInfo?.zip_code]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {dealerInfo?.phone && (
                <p className="text-[9px]">Phone: {dealerInfo.phone}</p>
              )}
              {dealerInfo?.website && (
                <p className="text-[9px]">{dealerInfo.website}</p>
              )}
            </div>
          </div>

          {/* Right: Document Title */}
          <div className="text-right">
            <h1 className="text-base font-bold mb-1">LETTER OF INTENT</h1>
            {formData.loiNumber && (
              <p className="text-[9px]">LOI #: {formData.loiNumber}</p>
            )}
            <p className="text-[9px]">Date: {formatDate(formData.date)}</p>
            <p className="text-[9px]">Valid Until: {formatDate(formData.expirationDate)}</p>
          </div>
        </div>

        {/* Opening */}
        <div className="mb-4">
          <p className="text-[9px] mb-3">
            Dear {formData.lessorContact || "[Lessor Contact]"},
          </p>
          <p className="text-[9px] leading-relaxed">
            This Letter of Intent sets forth the terms under which{" "}
            <strong>{formData.lesseeName || "[Lessee Name]"}</strong> ("Lessee") 
            intends to enter into an equipment lease agreement with{" "}
            <strong>{formData.lessorName || "[Lessor Name]"}</strong> ("Lessor") 
            for the equipment described below. This is a non-binding letter of intent 
            subject to the execution of definitive lease documentation.
          </p>
        </div>

        {/* Lessee Information Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={2} className="text-left py-1 pb-2 font-bold">
                  LESSEE INFORMATION
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1 w-28 font-semibold">Company Name</td>
                <td className="py-1">{formData.lesseeName || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Address</td>
                <td className="py-1">{getLesseeFullAddress()}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Contact</td>
                <td className="py-1">
                  {formData.lesseeContact || "-"}
                  {formData.lesseePhone && ` | ${formData.lesseePhone}`}
                  {formData.lesseeEmail && ` | ${formData.lesseeEmail}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Equipment Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 pb-2 font-bold">EQUIPMENT DESCRIPTION</th>
                <th className="text-center py-1 pb-2 font-bold w-16">QTY</th>
                <th className="text-right py-1 pb-2 font-bold w-24">UNIT COST</th>
                <th className="text-right py-1 pb-2 font-bold w-24">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {formData.equipmentItems
                .filter((item) => item.description || item.quantity || item.unitCost)
                .map((item, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="py-1">{item.description || "-"}</td>
                    <td className="py-1 text-center">{item.quantity || "-"}</td>
                    <td className="py-1 text-right">{formatCurrency(item.unitCost)}</td>
                    <td className="py-1 text-right">{formatCurrency(item.totalCost)}</td>
                  </tr>
                ))}
              <tr className="border-t-2 border-black">
                <td colSpan={3} className="py-1 text-right font-bold">
                  TOTAL EQUIPMENT COST:
                </td>
                <td className="py-1 text-right font-bold">
                  {formatCurrency(calculateTotalEquipmentCost())}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Proposed Lease Terms Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={2} className="text-left py-1 pb-2 font-bold">
                  PROPOSED LEASE TERMS
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1 w-32 font-semibold">Lease Type</td>
                <td className="py-1">{formData.leaseType || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Term Length</td>
                <td className="py-1">
                  {formData.termMonths ? `${formData.termMonths} Months` : "-"}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Monthly Payment</td>
                <td className="py-1">{formatCurrency(formData.monthlyPayment)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Advance Payments</td>
                <td className="py-1">
                  {formData.advancePayments
                    ? `${formData.advancePayments} month${formData.advancePayments !== "1" ? "s" : ""}`
                    : "-"}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Purchase Option</td>
                <td className="py-1">{formData.purchaseOption || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Conditions */}
        {formData.conditions && (
          <div className="mb-4">
            <p className="font-bold text-[9px] border-b-2 border-black pb-1 mb-2">
              CONDITIONS
            </p>
            <p className="text-[9px] leading-relaxed whitespace-pre-wrap">
              {formData.conditions}
            </p>
          </div>
        )}

        {/* Special Instructions */}
        {formData.specialInstructions && (
          <div className="mb-4">
            <p className="font-bold text-[9px] border-b-2 border-black pb-1 mb-2">
              SPECIAL INSTRUCTIONS
            </p>
            <p className="text-[9px] leading-relaxed whitespace-pre-wrap">
              {formData.specialInstructions}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mb-6 p-2 border border-gray-400 bg-gray-50">
          <p className="text-[8px] leading-relaxed">
            This Letter of Intent is non-binding and subject to the execution of a 
            definitive lease agreement and all required documentation. This offer is 
            contingent upon satisfactory credit approval. This Letter of Intent shall 
            expire on {formatDate(formData.expirationDate)} unless extended in writing.
          </p>
        </div>

        {/* Signatures */}
        <div className="mb-4">
          <p className="font-bold text-[9px] border-b-2 border-black pb-1 mb-4">
            AUTHORIZATION
          </p>
          <div className="grid grid-cols-2 gap-8">
            {/* Lessee Signature */}
            <div>
              <p className="font-semibold text-[9px] mb-4">Lessee:</p>
              <div className="border-b border-black mb-1 h-6"></div>
              <p className="text-[9px]">Signature</p>
              <div className="mt-3">
                <p className="text-[9px]">
                  {formData.lesseeSignerName || "________________________"}
                </p>
                <p className="text-[8px] text-gray-600">Printed Name</p>
              </div>
              <div className="mt-2">
                <p className="text-[9px]">
                  {formData.lesseeSignerTitle || "________________________"}
                </p>
                <p className="text-[8px] text-gray-600">Title</p>
              </div>
              <div className="mt-2">
                <p className="text-[9px]">
                  {formatDate(formData.lesseeSignatureDate) !== "-"
                    ? formatDate(formData.lesseeSignatureDate)
                    : "________________________"}
                </p>
                <p className="text-[8px] text-gray-600">Date</p>
              </div>
            </div>

            {/* Dealer Signature */}
            <div>
              <p className="font-semibold text-[9px] mb-4">Dealer Representative:</p>
              <div className="border-b border-black mb-1 h-6"></div>
              <p className="text-[9px]">Signature</p>
              <div className="mt-3">
                <p className="text-[9px]">
                  {formData.lessorSignerName || "________________________"}
                </p>
                <p className="text-[8px] text-gray-600">Printed Name</p>
              </div>
              <div className="mt-2">
                <p className="text-[9px]">
                  {formData.lessorSignerTitle || "________________________"}
                </p>
                <p className="text-[8px] text-gray-600">Title</p>
              </div>
              <div className="mt-2">
                <p className="text-[9px]">
                  {formatDate(formData.lessorSignatureDate) !== "-"
                    ? formatDate(formData.lessorSignatureDate)
                    : "________________________"}
                </p>
                <p className="text-[8px] text-gray-600">Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

LoiPreview.displayName = "LoiPreview";
