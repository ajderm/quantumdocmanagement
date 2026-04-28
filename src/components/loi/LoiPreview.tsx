import { forwardRef } from "react";
import { format } from "date-fns";
import { LoiFormData } from "./LoiForm";

import { buildDocumentFontCss } from "@/lib/documentFontSizes";
interface LoiPreviewProps {
  formData: LoiFormData;
  documentStyles?: { fontFamily?: string; fontColor?: string; tableBorderColor?: string; tableLineColor?: string; fontSizeOffset?: number; fontSizeOffsets?: { title?: number; header?: number; body?: number; table?: number; fine?: number; }; };
}

export const LoiPreview = forwardRef<HTMLDivElement, LoiPreviewProps>(
  ({ formData, documentStyles }, ref) => {
    const formatDate = (date: Date | string | null): string => {
      if (!date) return "";
      const d = typeof date === "string" ? new Date(date) : date;
      if (isNaN(d.getTime())) return "";
      return format(d, "M/d/yy");
    };

    // Build customer header address string
    const buildCustomerHeaderAddress = () => {
      const parts: string[] = [];
      if (formData.customerHeaderAddress) parts.push(formData.customerHeaderAddress);
      if (formData.customerHeaderAddress2) parts.push(formData.customerHeaderAddress2);
      return parts.join(", ");
    };

    const buildCustomerHeaderCityStateZip = () => {
      const cityState = [formData.customerHeaderCity, formData.customerHeaderState]
        .filter(Boolean)
        .join(", ");
      if (cityState && formData.customerHeaderZip) {
        return `${cityState} ${formData.customerHeaderZip}`;
      }
      return cityState || formData.customerHeaderZip || "";
    };

    // Filter to only filled equipment rows
    const filledEquipment = (formData.equipment || []).filter(
      (item) => item.model || item.serial
    );

    // Determine if we should show addendum reference
    const showAddendumReference = formData.hasAdditionalEquipment || filledEquipment.length > 2;
    const equipmentToDisplay = showAddendumReference 
      ? filledEquipment.slice(0, 2) 
      : filledEquipment;

    const _docScopeId = 'doc-loi';
    const _docFontCss = buildDocumentFontCss(_docScopeId, documentStyles);

    return (
      <>
        {_docFontCss && <style>{_docFontCss}</style>}
        <div
        ref={ref}
        data-doc-scope={_docScopeId}
        className="bg-white p-8 min-h-[11in] w-[8.5in] text-[11px] leading-tight"
        style={{ fontFamily: documentStyles?.fontFamily || "Arial, sans-serif", color: documentStyles?.fontColor || "#000000" }}
      >
        {/* Header - Customer Company Info Left, Title Right */}
        <div className="flex justify-between items-start mb-6">
          {/* Left: Customer Company Info */}
          <div className="flex items-start gap-4">
            {formData.customerLogoUrl && (
              <img
                src={formData.customerLogoUrl}
                alt="Company Logo"
                className="h-12 object-contain"
              />
            )}
            <div>
              <p className="font-bold text-[10px]">
                {formData.customerCompanyName || "Company Name"}
              </p>
              {buildCustomerHeaderAddress() && (
                <p className="text-[10px]">{buildCustomerHeaderAddress()}</p>
              )}
              {buildCustomerHeaderCityStateZip() && (
                <p className="text-[10px]">{buildCustomerHeaderCityStateZip()}</p>
              )}
              {formData.customerHeaderPhone && (
                <p className="text-[10px]">Phone: {formData.customerHeaderPhone}</p>
              )}
              {formData.customerHeaderWebsite && (
                <p className="text-[10px]">{formData.customerHeaderWebsite}</p>
              )}
            </div>
          </div>

          {/* Right: Document Title and Date */}
          <div className="text-right">
            <h1 className="text-base font-bold mb-2">Letter of Intent</h1>
            <p className="text-[10px]">Date: {formatDate(formData.date)}</p>
          </div>
        </div>

        {/* Two Column Layout - Lease Company Info & Customer Info */}
        <div className="flex gap-6 mb-6">
          {/* Left Column - Lease Company Information */}
          <div className="flex-1">
            <table className="w-full border-collapse text-[10px]">
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
            <table className="w-full border-collapse text-[10px]">
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
              </tbody>
            </table>
          </div>
        </div>

        {/* Equipment Being Returned */}
        {filledEquipment.length > 0 && (
          <div className="mb-6">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b-2 border-black">
                  <th colSpan={2} className="text-left py-1 pb-2 font-bold text-[10px]">
                    EQUIPMENT BEING RETURNED
                  </th>
                </tr>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1 font-semibold w-1/2">Model</th>
                  <th className="text-left py-1 font-semibold w-1/2">Serial Number</th>
                </tr>
              </thead>
              <tbody>
                {equipmentToDisplay.map((item, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="py-1">{item.model}</td>
                    <td className="py-1">{item.serial}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {showAddendumReference && (
              <p className="text-[10px] italic mt-2">
                * For additional equipment being returned, please reference the attached documentation/addendum.
              </p>
            )}
          </div>
        )}

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
        </>
    );
  }
);

LoiPreview.displayName = "LoiPreview";
