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

    // Build dealer full address for the letter body
    const getDealerAddress = (): string[] => {
      const lines: string[] = [];
      if (dealerInfo?.company_name) lines.push(dealerInfo.company_name);
      if (dealerInfo?.address_line1) lines.push(dealerInfo.address_line1);
      if (dealerInfo?.address_line2) lines.push(dealerInfo.address_line2);
      const cityStateZip = [
        dealerInfo?.city,
        dealerInfo?.state,
        dealerInfo?.zip_code,
      ].filter(Boolean);
      if (cityStateZip.length > 0) {
        lines.push(`${dealerInfo?.city || ""}, ${dealerInfo?.state || ""} ${dealerInfo?.zip_code || ""}`.trim());
      }
      return lines;
    };

    const dealerAddressLines = getDealerAddress();

    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 min-h-[11in] w-[8.5in]"
        style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}
      >
        {/* Red Header Banner */}
        <div
          className="text-center py-3 mb-4"
          style={{ backgroundColor: "#DC2626" }}
        >
          <h1
            className="text-white font-bold"
            style={{ fontSize: "24px", margin: 0 }}
          >
            Letter of Intent
          </h1>
        </div>

        {/* Date Row - Right Aligned */}
        <div className="flex justify-end mb-4">
          <table style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td className="font-bold pr-2" style={{ fontSize: "11px" }}>
                  Date
                </td>
                <td
                  style={{
                    fontSize: "11px",
                    backgroundColor: "#FFFF00",
                    padding: "2px 8px",
                    minWidth: "80px",
                  }}
                >
                  {formatDate(formData.date)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Two Column Layout - Lease Company Info & Customer Info */}
        <div className="flex gap-4 mb-6">
          {/* Left Column - Lease Company Information */}
          <div className="flex-1">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    colSpan={2}
                    style={{
                      backgroundColor: "#000000",
                      color: "#FFFFFF",
                      padding: "4px 8px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    Lease Company Information
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px", width: "55%" }}>
                    Lease Expiration Date:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formatDate(formData.leaseExpirationDate)}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    60 Day Letter Due:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formatDate(formData.sixtyDayLetterDue)}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Lease Number:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.leaseNumber}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Lease Vendor:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.leaseVendor}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Lease Address:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.leaseAddress}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Lease City, State:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.leaseCityState}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Lease Zip:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.leaseZip}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right Column - Customer Information */}
          <div className="flex-1">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    colSpan={2}
                    style={{
                      backgroundColor: "#000000",
                      color: "#FFFFFF",
                      padding: "4px 8px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    Customer Information
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px", width: "35%" }}>
                    Business:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.businessName}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Address:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.customerAddress}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    City, State:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.customerCityState}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Zip:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.customerZip}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Contact:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.customerContact}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Email:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.customerEmail}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Phone:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.customerPhone}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Asset Model:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.assetModel}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px 8px", fontSize: "11px" }}>
                    Asset Serial:
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#FFFF00",
                    }}
                  >
                    {formData.assetSerial}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Dealer Address Block - Highlighted */}
        <div className="mb-6">
          {dealerAddressLines.map((line, index) => (
            <p
              key={index}
              style={{
                fontSize: "11px",
                margin: 0,
                padding: "1px 0",
                backgroundColor: index === dealerAddressLines.length - 1 ? "#FFFF00" : "transparent",
                display: "inline-block",
                width: "100%",
              }}
            >
              {line}
            </p>
          ))}
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
