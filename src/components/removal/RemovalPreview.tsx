import { forwardRef } from "react";
import { RemovalFormData } from "./RemovalForm";

import { buildDocumentFontCss } from "@/lib/documentFontSizes";
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

interface RemovalPreviewProps {
  formData: RemovalFormData;
  dealerInfo?: DealerInfo;
  documentStyles?: { fontFamily?: string; fontColor?: string; tableBorderColor?: string; tableLineColor?: string; fontSizeOffset?: number; fontSizeOffsets?: { title?: number; header?: number; body?: number; table?: number; fine?: number; }; };
}

export const RemovalPreview = forwardRef<HTMLDivElement, RemovalPreviewProps>(
  ({ formData, dealerInfo, documentStyles }, ref) => {
    // Filter equipment to only show rows with content
    const filledEquipment = formData.equipmentItems.filter(
      (item) => item.qty || item.itemNumber || item.makeModelDescription || item.serialNumber
    );

    // Get bill to values (either from Ship To if same, or actual Bill To values)
    const billTo = formData.billToSameAsShipTo
      ? {
          customer: formData.shipToCustomer,
          address: formData.shipToAddress,
          cityZip: formData.shipToCityZip,
          phone: formData.shipToPhone,
          contact: formData.shipToContact,
          email: formData.shipToEmail,
        }
      : {
          customer: formData.billToCustomer,
          address: formData.billToAddress,
          cityZip: formData.billToCityZip,
          phone: formData.billToPhone,
          contact: formData.billToContact,
          email: formData.billToEmail,
        };

    const _docScopeId = 'doc-removal';
    const _docFontCss = buildDocumentFontCss(_docScopeId, documentStyles);

    return (
      <>
        {_docFontCss && <style>{_docFontCss}</style>}
        <div
        ref={ref}
        data-doc-scope={_docScopeId}
        className="bg-white p-6 min-h-[11in] w-[8.5in] text-[12px] leading-tight"
        style={{ fontFamily: documentStyles?.fontFamily || "Arial, sans-serif", color: documentStyles?.fontColor || "#000000" }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          {/* Left: Dealer Info */}
          <div className="flex items-start gap-3">
            {dealerInfo?.logo_url && (
              <img
                src={dealerInfo.logo_url}
                alt="Company Logo"
                className="h-10 object-contain"
                crossOrigin="anonymous"
              />
            )}
            <div className="text-[12px]">
              <p className="font-bold text-[12px]">
                {dealerInfo?.company_name || "Company Name"}
              </p>
              <p>
                {dealerInfo?.address_line1}
                {dealerInfo?.address_line2 && <>, {dealerInfo.address_line2}</>}
              </p>
              <p>
                {[dealerInfo?.city, dealerInfo?.state, dealerInfo?.zip_code]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {dealerInfo?.phone && <p>Phone: {dealerInfo.phone}</p>}
              {dealerInfo?.website && <p>{dealerInfo.website}</p>}
            </div>
          </div>

          {/* Right: Document Title & ID */}
          <div className="text-right">
            <h1 className="text-sm font-bold mb-1">EQUIPMENT REMOVAL</h1>
            {formData.idNumber && (
              <p className="text-[12px]">ID#: {formData.idNumber}</p>
            )}
            <div className="text-[12px] mt-1">
              {formData.meterBlack && <p>Meter Black: {formData.meterBlack}</p>}
              {formData.meterColor && <p>Meter Color: {formData.meterColor}</p>}
              {formData.meterTotal && <p>Meter Total: {formData.meterTotal}</p>}
            </div>
          </div>
        </div>

        {/* Ship To / Bill To */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Ship To */}
          <div>
            <div className="font-bold border-b-2 border-black pb-1 mb-2">SHIP TO</div>
            <div className="text-[12px] space-y-0.5">
              <p><span className="font-semibold">Customer:</span> {formData.shipToCustomer || "-"}</p>
              <p><span className="font-semibold">Address:</span> {formData.shipToAddress || "-"}</p>
              <p><span className="font-semibold">City, St Zip:</span> {formData.shipToCityZip || "-"}</p>
              <p><span className="font-semibold">Phone:</span> {formData.shipToPhone || "-"}</p>
              <p><span className="font-semibold">Contact:</span> {formData.shipToContact || "-"}</p>
              <p><span className="font-semibold">Email:</span> {formData.shipToEmail || "-"}</p>
            </div>
          </div>

          {/* Bill To */}
          <div>
            <div className="font-bold border-b-2 border-black pb-1 mb-2">
              BILL TO {formData.billToSameAsShipTo && <span className="font-normal text-[8px]">(SAME AS SHIP TO)</span>}
            </div>
            <div className="text-[12px] space-y-0.5">
              <p><span className="font-semibold">Customer:</span> {billTo.customer || "-"}</p>
              <p><span className="font-semibold">Address:</span> {billTo.address || "-"}</p>
              <p><span className="font-semibold">City, St Zip:</span> {billTo.cityZip || "-"}</p>
              <p><span className="font-semibold">Phone:</span> {billTo.phone || "-"}</p>
              <p><span className="font-semibold">Contact:</span> {billTo.contact || "-"}</p>
              <p><span className="font-semibold">Email:</span> {billTo.email || "-"}</p>
            </div>
          </div>
        </div>

        {/* Equipment Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 pb-2 font-bold w-12">Qty</th>
                <th className="text-left py-1 pb-2 font-bold w-20">Item #</th>
                <th className="text-left py-1 pb-2 font-bold">Make * Model * Description</th>
                <th className="text-left py-1 pb-2 font-bold w-28">Serial #</th>
              </tr>
            </thead>
            <tbody>
              {filledEquipment.length > 0 ? (
                filledEquipment.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-gray-300">
                    <td className="py-1">{item.qty || "-"}</td>
                    <td className="py-1">{item.itemNumber || "-"}</td>
                    <td className="py-1">{item.makeModelDescription || "-"}</td>
                    <td className="py-1">{item.serialNumber || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-300">
                  <td colSpan={4} className="py-2 text-center text-gray-400 italic">
                    No equipment listed
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Additional Comments */}
        {formData.additionalComments && (
          <div className="mb-4">
            <div className="font-bold border-b-2 border-black pb-1 mb-2">ADDITIONAL COMMENTS</div>
            <p className="text-[12px] whitespace-pre-wrap">{formData.additionalComments}</p>
          </div>
        )}

        {/* Removal Receipt / Signature Section */}
        <div className="mt-6">
          <div className="font-bold border-b-2 border-black pb-1 mb-3">REMOVAL RECEIPT</div>
          
          <p className="text-[12px] mb-4">
            The undersigned Customer acknowledges surrender of all equipment described herein to the 
            dealer/representative identified above. Customer confirms that all equipment has been removed 
            from the premises and releases all claims related to said equipment.
          </p>

          {/* Two-column signature layout */}
          <div className="grid grid-cols-[1fr_150px] gap-4 text-[12px]">
            {/* Left column */}
            <div className="space-y-3">
              {/* Customer Signature */}
              <div>
                <div className="border-b border-black h-5 mb-1"></div>
                <p>Customer Signature</p>
              </div>

              {/* Printed Name & Title */}
              <div>
                <div className="border-b border-black h-5 mb-1"></div>
                <p>Printed Name & Title</p>
              </div>

              {/* Sales Representative */}
              <div>
                <div className="border-b border-black h-5 mb-1 flex items-end pb-0.5">
                  {formData.salesRepresentative}
                </div>
                <p>Sales Representative</p>
              </div>

              {/* Removed by */}
              <div>
                <div className="border-b border-black h-5 mb-1"></div>
                <p>Removed by (signature)</p>
              </div>

              {/* Printed Name */}
              <div>
                <div className="border-b border-black h-5 mb-1"></div>
                <p>Printed Name</p>
              </div>
            </div>

            {/* Right column - Date fields */}
            <div className="space-y-3">
              {/* Date for Customer Signature */}
              <div>
                <div className="border-b border-black h-5 mb-1"></div>
                <p>Date</p>
              </div>

              {/* Empty space aligned with Printed Name & Title */}
              <div>
                <div className="h-5 mb-1"></div>
                <p className="invisible">Placeholder</p>
              </div>

              {/* Empty space aligned with Sales Representative */}
              <div>
                <div className="h-5 mb-1"></div>
                <p className="invisible">Placeholder</p>
              </div>

              {/* Date for Removed by */}
              <div>
                <div className="border-b border-black h-5 mb-1"></div>
                <p>Date</p>
              </div>

              {/* Empty space for printed name */}
              <div>
                <div className="h-5 mb-1"></div>
                <p className="invisible">Placeholder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
    );
  }
);

RemovalPreview.displayName = "RemovalPreview";

export default RemovalPreview;
