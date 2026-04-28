import { forwardRef } from "react";
import { format } from "date-fns";
import { FMVLeaseFormData } from "./FMVLeaseForm";

import { buildDocumentFontCss } from "@/lib/documentFontSizes";
interface DealerInfo {
  company_name?: string;
  logo_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface FMVLeasePreviewProps {
  formData: FMVLeaseFormData;
  dealerInfo?: DealerInfo | null;
  termsAndConditions?: string;
  documentStyles?: { fontFamily?: string; fontColor?: string; tableBorderColor?: string; tableLineColor?: string; fontSizeOffset?: number; fontSizeOffsets?: { title?: number; header?: number; body?: number; table?: number; fine?: number; }; };
}

const PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annually: "Semi-Annually",
  annually: "Annually",
};

export const FMVLeasePreview = forwardRef<HTMLDivElement, FMVLeasePreviewProps>(
  ({ formData, dealerInfo, termsAndConditions, documentStyles }, ref) => {
    const formatCurrency = (value: string | number) => {
      const num = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(num)) return "-";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(num);
    };

    const _docScopeId = 'doc-fmvlease';
    const _docFontCss = buildDocumentFontCss(_docScopeId, documentStyles);

    return (
      <>
        {_docFontCss && <style>{_docFontCss}</style>}
        <div
        ref={ref}
        data-doc-scope={_docScopeId}
        className="bg-white p-8 min-h-[11in] w-[8.5in] text-[13px] leading-tight"
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
              <p className="font-bold text-[12px]">
                {dealerInfo?.company_name || "Company Name"}
              </p>
              <p className="text-[12px]">
                {dealerInfo?.address_line1}
                {dealerInfo?.address_line2 && <>, {dealerInfo.address_line2}</>}
              </p>
              <p className="text-[12px]">
                {[dealerInfo?.city, dealerInfo?.state, dealerInfo?.zip_code]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {dealerInfo?.phone && (
                <p className="text-[12px]">Phone: {dealerInfo.phone}</p>
              )}
              {dealerInfo?.website && (
                <p className="text-[12px]">{dealerInfo.website}</p>
              )}
            </div>
          </div>

          {/* Right: Document Title */}
          <div className="text-right">
            <h1 className="text-base font-bold mb-2">FMV Lease Agreement</h1>
          </div>
        </div>

        {/* Customer Information Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={4} className="text-left py-1 pb-2 font-bold">
                  CUSTOMER INFORMATION
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1 w-24 font-semibold">Company</td>
                <td className="py-1">{formData.companyLegalName || "-"}</td>
                <td className="py-1 w-20 font-semibold">Phone</td>
                <td className="py-1">{formData.phone || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Billing Address</td>
                <td className="py-1">
                  {formData.billingAddress || "-"}
                  {(formData.billingCity || formData.billingState || formData.billingZip) && (
                    <span>
                      , {[formData.billingCity, formData.billingState, formData.billingZip]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                </td>
                <td className="py-1 font-semibold">Equipment Address</td>
                <td className="py-1">
                  {formData.equipmentAddress || "-"}
                  {(formData.equipmentCity || formData.equipmentState || formData.equipmentZip) && (
                    <span>
                      , {[formData.equipmentCity, formData.equipmentState, formData.equipmentZip]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Equipment Information Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={4} className="text-left py-1 pb-2 font-bold">
                  EQUIPMENT INFORMATION
                </th>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="py-1 text-left w-12">
                  <span className="underline">Qty</span>
                </th>
                <th className="py-1 text-left">
                  <span className="underline">Make/Model/Description</span>
                </th>
                <th className="py-1 text-left w-28">
                  <span className="underline">Serial Number</span>
                </th>
                <th className="py-1 text-left w-24">
                  <span className="underline">ID Number</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {formData.equipmentItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-2 text-center text-gray-400">
                    No equipment items
                  </td>
                </tr>
              ) : (
                formData.equipmentItems.map((item) => (
                  <tr key={item.lineItemId} className="border-b border-gray-300">
                    <td className="py-1">{item.quantity}</td>
                    <td className="py-1">{item.makeModelDescription || "-"}</td>
                    <td className="py-1">{item.serialNumber || "-"}</td>
                    <td className="py-1">{item.idNumber || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Schedule Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={4} className="text-left py-1 pb-2 font-bold">
                  PAYMENT SCHEDULE
                </th>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="py-1 text-center font-semibold">
                  <span className="underline">Term in Months</span>
                </th>
                <th className="py-1 text-center font-semibold">
                  <span className="underline">Payment Frequency</span>
                </th>
                <th className="py-1 text-center font-semibold">
                  <span className="underline">First Payment Date</span>
                </th>
                <th className="py-1 text-center font-semibold">
                  <span className="underline">Payment Amount</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1 text-center">
                  {formData.termInMonths ? `${formData.termInMonths} Months` : "-"}
                </td>
                <td className="py-1 text-center">
                  {PAYMENT_FREQUENCY_LABELS[formData.paymentFrequency] || "-"}
                </td>
                <td className="py-1 text-center">
                  {formData.firstPaymentDate
                    ? format(formData.firstPaymentDate, "MM/dd/yyyy")
                    : "-"}
                </td>
                <td className="py-1 text-center">
                  {formData.paymentAmount ? formatCurrency(formData.paymentAmount) : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terms and Conditions */}
        {termsAndConditions && (
          <div className="mb-4">
            <p className="font-bold mb-1 text-[12px]">Terms & Conditions:</p>
            <p className="text-[8px] whitespace-pre-wrap">{termsAndConditions}</p>
          </div>
        )}

        {/* Signatures - matching other document styles */}
        <div className="mt-6 pt-2 border-t border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            {/* Left: Lessor (Dealer) */}
            <div>
              <p className="font-bold mb-1 text-[12px]">
                LESSOR: {dealerInfo?.company_name || "Dealer"}
              </p>
              <div className="space-y-1">
                <div>
                  <div className="border-b border-black h-4"></div>
                  <p className="text-[8px]">Signature</p>
                </div>
                <div>
                  <div className="border-b border-black h-4"></div>
                  <p className="text-[8px]">Printed Name</p>
                </div>
                <div>
                  <div className="border-b border-black h-4"></div>
                  <p className="text-[8px]">Title</p>
                </div>
                <div>
                  <div className="border-b border-black h-4"></div>
                  <p className="text-[8px]">Date</p>
                </div>
              </div>
            </div>

            {/* Right: Lessee (Customer) */}
            <div>
              <p className="font-bold mb-1 text-[12px]">
                LESSEE: {formData.companyLegalName || "Customer"}
              </p>
              <div className="space-y-1">
                <div>
                  <div className="border-b border-black h-4"></div>
                  <p className="text-[8px]">Signature</p>
                </div>
                <div>
                  <div className="border-b border-black h-4"></div>
                  <p className="text-[8px]">Printed Name</p>
                </div>
                <div>
                  <div className="border-b border-black h-4"></div>
                  <p className="text-[8px]">Title</p>
                </div>
                <div>
                  <div className="border-b border-black h-4"></div>
                  <p className="text-[8px]">Date</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
    );
  }
);

FMVLeasePreview.displayName = "FMVLeasePreview";
