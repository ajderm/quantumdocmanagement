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
    const formatDate = (date: Date | string | null): string => {
      if (!date) return "";
      const d = typeof date === "string" ? new Date(date) : date;
      if (isNaN(d.getTime())) return "";
      return format(d, "M/d/yy");
    };

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 min-h-[11in] w-[8.5in] text-[11px] leading-tight"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header - Dealer Info Left, Title Right */}
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

          {/* Right: Document Title and Date */}
          <div className="text-right">
            <h1 className="text-base font-bold mb-2">Letter of Intent</h1>
            <p className="text-[9px]">Date: {formatDate(formData.date)}</p>
          </div>
        </div>

        {/* Two Column Layout - Lease Company Info & Customer Info */}
        <div className="flex gap-6 mb-6">
          {/* Left Column - Lease Company Information */}
          <div className="flex-1">
            <table className="w-full border-collapse text-[9px]">
              <thead>
                <tr className="border-b-2 border-black">
                  <th colSpan={2} className="text-left py-1 pb-2 font-bold text-[10px]">
                    LEASE COMPANY INFORMATION
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold w-40">Lease Expiration Date:</td>
                  <td className="py-1">{formatDate(formData.leaseExpirationDate)}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">60 Day Letter Due:</td>
                  <td className="py-1">{formatDate(formData.sixtyDayLetterDue)}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Lease Number:</td>
                  <td className="py-1">{formData.leaseNumber}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Lease Vendor:</td>
                  <td className="py-1">{formData.leaseVendor}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Address:</td>
                  <td className="py-1">{formData.leaseAddress}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">City, State:</td>
                  <td className="py-1">{formData.leaseCityState}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Zip:</td>
                  <td className="py-1">{formData.leaseZip}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right Column - Customer Information */}
          <div className="flex-1">
            <table className="w-full border-collapse text-[9px]">
              <thead>
                <tr className="border-b-2 border-black">
                  <th colSpan={2} className="text-left py-1 pb-2 font-bold text-[10px]">
                    CUSTOMER INFORMATION
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold w-24">Business:</td>
                  <td className="py-1">{formData.businessName}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Address:</td>
                  <td className="py-1">{formData.customerAddress}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">City, State:</td>
                  <td className="py-1">{formData.customerCityState}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Zip:</td>
                  <td className="py-1">{formData.customerZip}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Contact:</td>
                  <td className="py-1">{formData.customerContact}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Email:</td>
                  <td className="py-1">{formData.customerEmail}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Phone:</td>
                  <td className="py-1">{formData.customerPhone}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Asset Model:</td>
                  <td className="py-1">{formData.assetModel}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Asset Serial:</td>
                  <td className="py-1">{formData.assetSerial}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Letter Body */}
        <div className="mb-4">
          <p style={{ fontSize: "11px", marginBottom: "12px" }}>
            To whom it may concern:
          </p>

          <p style={{ fontSize: "11px", marginBottom: "12px" }}>
            Please consider this an official request to terminate contract #{" "}
            <span
              style={{
                borderBottom: "1px solid #000",
                display: "inline-block",
                minWidth: "100px",
                textAlign: "center",
              }}
            >
              {formData.contractNumber || "\u00A0"}
            </span>
            .
          </p>

          <p style={{ fontSize: "11px", marginBottom: "12px" }}>
            All return instructions should be emailed to{" "}
            <span
              style={{
                borderBottom: "1px solid #000",
                display: "inline-block",
                minWidth: "180px",
                textAlign: "center",
              }}
            >
              {formData.returnInstructionsEmail || "\u00A0"}
            </span>
            .
          </p>

          <p style={{ fontSize: "11px", marginBottom: "12px" }}>
            Please confirm receipt of this notice.
          </p>

          <p style={{ fontSize: "11px", marginBottom: "24px" }}>
            Thank you for your prompt attention to this matter.
          </p>

          <p style={{ fontSize: "11px", marginBottom: "48px" }}>
            Sincerely,
          </p>
        </div>

        {/* Signature Block */}
        <div>
          <div
            style={{
              borderBottom: "1px solid #000",
              width: "200px",
              height: "24px",
              marginBottom: "8px",
            }}
          ></div>
          <p style={{ fontSize: "11px", fontStyle: "italic", margin: "4px 0" }}>
            {formData.signerName || "\u00A0"}
          </p>
          <p style={{ fontSize: "11px", fontStyle: "italic", margin: "4px 0" }}>
            {formData.signerTitle || "\u00A0"}
          </p>
        </div>
      </div>
    );
  }
);

LoiPreview.displayName = "LoiPreview";
