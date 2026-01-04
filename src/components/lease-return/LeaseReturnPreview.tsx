import { forwardRef } from "react";
import { format } from "date-fns";
import { LeaseReturnFormData } from "./LeaseReturnForm";

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

interface LeaseReturnPreviewProps {
  formData: LeaseReturnFormData;
  dealerInfo?: DealerInfo;
}

export const LeaseReturnPreview = forwardRef<HTMLDivElement, LeaseReturnPreviewProps>(
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

    // Filter equipment to only show rows with content
    const filledEquipment = formData.equipment.filter(
      (item) => item.make || item.model || item.serial
    );

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
            <h1 className="text-base font-bold mb-2">Lease Return Letter</h1>
          </div>
        </div>

        {/* Letter Body */}
        <div className="mb-6 space-y-4 text-[10px] leading-relaxed">
          <p>
            Dealer will provide Customer with a check in the amount of{" "}
            <span className="font-bold">{formatCurrency(formData.amount)}</span>{" "}
            as part of our agreement.
          </p>

          <p>
            However, it is agreed and understood that any and all financial
            obligations or money owed on the equipment listed below will remain
            the obligation of{" "}
            <span className="font-bold">{formData.customerName || "[Customer Name]"}</span>.
          </p>

          <p>
            As an accommodation to our customer, Dealer will return the listed
            equipment to the leasing company. In order to do so, you must
            provide us with the "return authorization" (R/A) from your current
            leasing company. It is the customer's responsibility to request an
            R/A from the leasing company on a timely basis per the terms and
            conditions of the lease. Upon Dealer's receipt of the return
            authorization, we will ship the equipment, at our expense, to the
            location specified.
          </p>

          <p>
            By signing this document, the customer acknowledges that Dealer
            assumes no financial or legal liability for the equipment listed
            below.
          </p>
        </div>

        {/* Lease Information Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={2} className="text-left py-1 pb-2 font-bold">
                  LEASE INFORMATION
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1 w-32 font-semibold">Lease Number</td>
                <td className="py-1">{formData.leaseNumber || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Lease End Date</td>
                <td className="py-1">{formatDate(formData.leaseEndDate) || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1 font-semibold">Lease Company</td>
                <td className="py-1">{formData.leaseCompany || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Equipment Table */}
        <div className="mb-6">
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 pb-2 font-bold w-1/4">Make</th>
                <th className="text-left py-1 pb-2 font-bold w-2/5">Model</th>
                <th className="text-left py-1 pb-2 font-bold">Serial #</th>
              </tr>
            </thead>
            <tbody>
              {filledEquipment.length > 0 ? (
                filledEquipment.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-gray-300">
                    <td className="py-1">{item.make || "-"}</td>
                    <td className="py-1">{item.model || "-"}</td>
                    <td className="py-1">{item.serial || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-300">
                  <td colSpan={3} className="py-2 text-center text-gray-400 italic">
                    No equipment listed
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures Section */}
        <div className="mt-8">
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={2} className="text-left py-1 pb-2 font-bold">
                  SIGNATURES
                </th>
              </tr>
            </thead>
          </table>

          {/* Two-column signature layout */}
          <div className="mt-6 grid grid-cols-[1fr_150px] gap-4">
            {/* Left column */}
            <div className="space-y-6">
              {/* Customer Signature */}
              <div>
                <div className="border-b border-black h-6 mb-1"></div>
                <p className="text-[9px]">Authorized Signature (Customer)</p>
              </div>

              {/* Printed Name & Title */}
              <div>
                <div className="border-b border-black h-6 mb-1"></div>
                <p className="text-[9px]">Printed Name & Title</p>
              </div>

              {/* Dealer Representative */}
              <div>
                <div className="border-b border-black h-6 mb-1"></div>
                <p className="text-[9px]">Dealer (Representative)</p>
              </div>
            </div>

            {/* Right column - Date fields */}
            <div className="space-y-6">
              {/* Date for Customer Signature */}
              <div>
                <div className="border-b border-black h-6 mb-1"></div>
                <p className="text-[9px]">Date</p>
              </div>

              {/* Empty space aligned with Printed Name & Title */}
              <div className="h-6 mb-1"></div>

              {/* Date for Dealer */}
              <div>
                <div className="border-b border-black h-6 mb-1"></div>
                <p className="text-[9px]">Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

LeaseReturnPreview.displayName = "LeaseReturnPreview";
