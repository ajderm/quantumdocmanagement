import { forwardRef } from "react";
import { format } from "date-fns";
import { LeaseFundingFormData } from "./LeaseFundingForm";

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

interface LeaseFundingPreviewProps {
  formData: LeaseFundingFormData;
  dealerInfo?: DealerInfo;
  documentStyles?: { fontFamily?: string; fontColor?: string; tableBorderColor?: string; tableLineColor?: string; fontSizeOffset?: number; fontSizeOffsets?: { title?: number; header?: number; body?: number; table?: number; fine?: number; }; };
}

export const LeaseFundingPreview = forwardRef<HTMLDivElement, LeaseFundingPreviewProps>(
  ({ formData, dealerInfo, documentStyles }, ref) => {
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

    const formatDate = (date: Date | null): string => {
      if (!date) return "-";
      return format(date, "MM/dd/yyyy");
    };

    const _docFontOffset = documentStyles?.fontSizeOffset ?? 0;
    const _docScopeId = 'doc-leasefunding';
    const _docFontCss = _docFontOffset
      ? [6,7,8,9,10,11,12,14,15,16,18,20,24]
          .map(n => `[data-doc-scope="${_docScopeId}"] .text-\\[${n}px\\]{font-size:${Math.max(4,n+_docFontOffset)}px !important;}`)
          .join('')
      : '';

    return (
      <>
        {_docFontCss && <style>{_docFontCss}</style>}
        <div
        ref={ref}
        data-doc-scope={_docScopeId}
        className="bg-white p-8 min-h-[11in] w-[8.5in] text-[15px] leading-tight"
        style={{ fontFamily: documentStyles?.fontFamily || "Arial, sans-serif", color: documentStyles?.fontColor || "#000000" }}
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
              <p className="font-bold text-[14px]">
                {dealerInfo?.company_name || "Company Name"}
              </p>
              <p className="text-[10px]">
                {dealerInfo?.address_line1}
                {dealerInfo?.address_line2 && <>, {dealerInfo.address_line2}</>}
              </p>
              <p className="text-[10px]">
                {[dealerInfo?.city, dealerInfo?.state, dealerInfo?.zip_code]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {dealerInfo?.phone && (
                <p className="text-[10px]">Phone: {dealerInfo.phone}</p>
              )}
              {dealerInfo?.website && (
                <p className="text-[10px]">{dealerInfo.website}</p>
              )}
            </div>
          </div>

          {/* Right: Document Title */}
          <div className="text-right">
            <h1 className="text-base font-bold mb-2">Lease Funding Document</h1>
          </div>
        </div>

        {/* Lease Information Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={2} className="text-left py-1 pb-2 font-bold">
                  LEASE INFORMATION
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1 w-32 font-semibold">Date</td>
                <td className="py-1">{formatDate(formData.date)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Customer Name</td>
                <td className="py-1">{formData.customerName || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Location / Branch</td>
                <td className="py-1">{formData.locationBranch || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Sales Representative</td>
                <td className="py-1">{formData.salesRepresentative || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Equipment Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={2} className="text-left py-1 pb-2 font-bold">
                  EQUIPMENT
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1 w-32 font-semibold">Make / Model</td>
                <td className="py-1">{formData.equipmentMakeModel || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">ID Number</td>
                <td className="py-1">{formData.idNumber || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Serial Number</td>
                <td className="py-1">{formData.serialNumber || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Lease Terms Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={2} className="text-left py-1 pb-2 font-bold">
                  LEASE TERMS
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1 w-32 font-semibold">Lease Vendor</td>
                <td className="py-1">{formData.leaseVendor || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Lease Type</td>
                <td className="py-1">{formData.leaseType || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Term Length</td>
                <td className="py-1">
                  {formData.termLength ? `${formData.termLength} Months` : "-"}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Monthly Payment</td>
                <td className="py-1">{formatCurrency(formData.monthlyPayment)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Rate</td>
                <td className="py-1">{formData.rate || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Invoice / Funding Amount</td>
                <td className="py-1 font-bold">
                  {formatCurrency(formData.invoiceFundingAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
        </>
    );
  }
);

LeaseFundingPreview.displayName = "LeaseFundingPreview";
