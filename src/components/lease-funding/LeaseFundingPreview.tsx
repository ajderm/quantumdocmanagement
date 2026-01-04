import { forwardRef } from "react";
import { format } from "date-fns";
import { LeaseFundingFormData } from "./LeaseFundingForm";

interface DealerInfo {
  company_name?: string;
  address_line1?: string;
  phone?: string;
  website?: string;
  logo_url?: string;
}

interface LeaseFundingPreviewProps {
  formData: LeaseFundingFormData;
  dealerInfo?: DealerInfo;
}

export const LeaseFundingPreview = forwardRef<HTMLDivElement, LeaseFundingPreviewProps>(
  ({ formData, dealerInfo }, ref) => {
    const formatCurrency = (value: string | number): string => {
      const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.]/g, "")) : value;
      if (isNaN(num)) return "$0.00";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    };

    const formatDate = (date: Date | null): string => {
      if (!date) return "";
      return format(date, "MM/dd/yyyy");
    };

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8"
        style={{
          width: "8.5in",
          minHeight: "11in",
          fontFamily: "Arial, sans-serif",
          fontSize: "11pt",
          lineHeight: "1.4",
        }}
      >
        {/* Header with Dealer Info */}
        <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-300">
          <div className="flex items-start gap-4">
            {dealerInfo?.logo_url && (
              <img
                src={dealerInfo.logo_url}
                alt="Company Logo"
                className="h-16 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {dealerInfo?.company_name || "Company Name"}
              </h1>
              {dealerInfo?.address_line1 && (
                <p className="text-sm text-gray-600">{dealerInfo.address_line1}</p>
              )}
              <div className="flex gap-4 text-sm text-gray-600">
                {dealerInfo?.phone && <span>{dealerInfo.phone}</span>}
                {dealerInfo?.website && <span>{dealerInfo.website}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold uppercase tracking-wide">
            Lease Funding Document
          </h2>
        </div>

        {/* Lease Information Table */}
        <div className="mb-6">
          <div className="bg-gray-100 px-3 py-2 font-bold text-sm uppercase tracking-wide border border-gray-300">
            Lease Information
          </div>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 w-1/3 border-r border-gray-300">
                  Date
                </td>
                <td className="py-2 px-3">{formatDate(formData.date)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 border-r border-gray-300">
                  Customer Name
                </td>
                <td className="py-2 px-3">{formData.customerName}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 border-r border-gray-300">
                  Location / Branch
                </td>
                <td className="py-2 px-3">{formData.locationBranch}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 border-r border-gray-300">
                  Sales Representative
                </td>
                <td className="py-2 px-3">{formData.salesRepresentative}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Equipment Table */}
        <div className="mb-6">
          <div className="bg-gray-100 px-3 py-2 font-bold text-sm uppercase tracking-wide border border-gray-300">
            Equipment
          </div>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 w-1/3 border-r border-gray-300">
                  Make / Model
                </td>
                <td className="py-2 px-3">{formData.equipmentMakeModel}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 border-r border-gray-300">
                  ID Number
                </td>
                <td className="py-2 px-3">{formData.idNumber || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 border-r border-gray-300">
                  Serial Number
                </td>
                <td className="py-2 px-3">{formData.serialNumber || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Lease Terms Table */}
        <div className="mb-6">
          <div className="bg-gray-100 px-3 py-2 font-bold text-sm uppercase tracking-wide border border-gray-300">
            Lease Terms
          </div>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 w-1/3 border-r border-gray-300">
                  Lease Vendor
                </td>
                <td className="py-2 px-3">{formData.leaseVendor || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 border-r border-gray-300">
                  Lease Type
                </td>
                <td className="py-2 px-3">{formData.leaseType}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 border-r border-gray-300">
                  Term Length
                </td>
                <td className="py-2 px-3">
                  {formData.termLength ? `${formData.termLength} Months` : "-"}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 border-r border-gray-300">
                  Monthly Payment
                </td>
                <td className="py-2 px-3">{formatCurrency(formData.monthlyPayment)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 border-r border-gray-300">
                  Rate
                </td>
                <td className="py-2 px-3">{formData.rate || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 font-semibold bg-gray-50 border-r border-gray-300">
                  Invoice / Funding Amount
                </td>
                <td className="py-2 px-3 font-bold text-lg">
                  {formatCurrency(formData.invoiceFundingAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature Section */}
        <div className="mt-12 pt-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-black mb-1 h-8"></div>
              <p className="text-sm text-gray-600">Authorized Signature</p>
            </div>
            <div>
              <div className="border-b border-black mb-1 h-8"></div>
              <p className="text-sm text-gray-600">Date</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

LeaseFundingPreview.displayName = "LeaseFundingPreview";
