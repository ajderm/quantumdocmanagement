import { forwardRef } from 'react';
import type { InstallationFormData, LinkedAccessoryItem } from './InstallationForm';
import type { DocumentStyles } from '@/components/commission/CommissionPreview';

import { buildDocumentFontCss } from "@/lib/documentFontSizes";
interface InstallationPreviewProps {
  formData: InstallationFormData;
  dealerInfo?: {
    companyName: string;
    address: string;
    phone: string;
    website: string;
    logoUrl?: string;
  };
  removalReceiptTerms?: string;
  deliveryAcceptanceTerms?: string;
  documentStyles?: DocumentStyles;
}

export const InstallationPreview = forwardRef<HTMLDivElement, InstallationPreviewProps>(
  ({ formData, dealerInfo, removalReceiptTerms, deliveryAcceptanceTerms, documentStyles }, ref) => {
    const getEffectiveCustomerNumber = () => {
      return formData.customerNumberOverride || formData.customerNumber || '';
    };

    const _docScopeId = 'doc-installation';
    const _docFontCss = buildDocumentFontCss(_docScopeId, documentStyles);

    return (
      <>
        {_docFontCss && <style>{_docFontCss}</style>}
        <div
        ref={ref}
        data-doc-scope={_docScopeId}
        className="bg-white p-6 min-h-[11in] w-[8.5in] text-[12px] leading-tight"
        style={{ fontFamily: documentStyles?.fontFamily || 'Arial, sans-serif', color: documentStyles?.fontColor || '#000000' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          {/* Left - Company Info */}
          <div>
            {dealerInfo && (
              <>
                {dealerInfo.logoUrl && (
                  <img
                    src={dealerInfo.logoUrl}
                    alt={dealerInfo.companyName}
                    className="h-10 mb-1 object-contain"
                    crossOrigin="anonymous"
                  />
                )}
                <p className="font-bold text-[12px]">{dealerInfo.companyName}</p>
                <p className="text-[8px]">{dealerInfo.address}</p>
                <p className="text-[8px]">{dealerInfo.phone}</p>
                <p className="text-[8px]">{dealerInfo.website}</p>
              </>
            )}
          </div>

          {/* Right - Installation Report */}
          <div className="border border-black p-2 w-56">
            <p className="font-bold text-center mb-1 border-b border-black pb-2">INSTALLATION REPORT</p>
            <div className="grid grid-cols-2 gap-2 text-[8px]">
              {/* Left Column - Meter Counts */}
              <div>
                <p className="font-bold mb-0.5">METER COUNTS</p>
                <table className="w-full">
                  <tbody>
                    <tr><td className="pl-1">Black:</td><td>{formData.meterBlack || '_____'}</td></tr>
                    <tr><td className="pl-1">Color:</td><td>{formData.meterColor || '_____'}</td></tr>
                    <tr><td className="pl-1">Total:</td><td>{formData.meterTotal || '_____'}</td></tr>
                  </tbody>
                </table>
              </div>
              {/* Right Column - IDs and Info */}
              <div>
                <table className="w-full">
                  <tbody>
                    <tr><td className="font-bold">ID #:</td><td>{formData.idNumber || '_____'}</td></tr>
                    <tr><td className="font-bold">Cust #:</td><td>{getEffectiveCustomerNumber() || '_____'}</td></tr>
                    <tr><td className="font-bold">Rep:</td><td>{formData.salesRep || '_____'}</td></tr>
                    <tr><td className="font-bold">Method:</td><td>{formData.meterMethod || '_____'}</td></tr>
                    <tr><td className="font-bold">CCA:</td><td>{formData.cca || '_____'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Ship To / Bill To */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-black p-2">
            <p className="font-bold text-[12px] mb-1 border-b border-black pb-2 text-center">CUSTOMER SHIP TO</p>
            <table className="w-full text-[8px]">
              <tbody>
                <tr><td className="font-bold w-16">Company:</td><td>{formData.shipToCompany}</td></tr>
                <tr><td className="font-bold">Address:</td><td>{formData.shipToAddress}</td></tr>
                <tr><td className="font-bold">City/St/Zip:</td><td>{formData.shipToCity}, {formData.shipToState} {formData.shipToZip}</td></tr>
                <tr><td className="font-bold">ATTN:</td><td>{formData.shipToAttn}</td></tr>
                <tr><td className="font-bold">Phone:</td><td>{formData.shipToPhone}</td></tr>
                <tr><td className="font-bold">Email:</td><td>{formData.shipToEmail}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="border border-black p-2">
            <p className="font-bold text-[12px] mb-1 border-b border-black pb-2 text-center">CUSTOMER BILL TO</p>
            <table className="w-full text-[8px]">
              <tbody>
                <tr><td className="font-bold w-16">Company:</td><td>{formData.billToCompany}</td></tr>
                <tr><td className="font-bold">Address:</td><td>{formData.billToAddress}</td></tr>
                <tr><td className="font-bold">City/St/Zip:</td><td>{formData.billToCity}, {formData.billToState} {formData.billToZip}</td></tr>
                <tr><td className="font-bold">ATTN:</td><td>{formData.billToAttn}</td></tr>
                <tr><td className="font-bold">Phone:</td><td>{formData.billToPhone}</td></tr>
                <tr><td className="font-bold">Email:</td><td>{formData.billToEmail}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Equipment Installed */}
        <div className="mb-4">
          <p className="font-bold text-[12px] mb-1">EQUIPMENT (INSTALLED)</p>
          <table className="w-full border-collapse text-[8px]">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-1 pb-2 w-8">Qty</th>
                <th className="text-left py-1 pb-2 w-40">Item Number</th>
                <th className="text-left py-1 pb-2 pl-2">Model / Description</th>
                <th className="text-left py-1 pb-2 w-20">Serial #</th>
                <th className="text-left py-1 pb-2 w-20">MAC Address</th>
                <th className="text-left py-1 pb-2 w-16">IP Address</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1">{formData.installedQty}</td>
                <td className="py-1">{formData.installedItemNumber}</td>
                <td className="py-1 pl-2">{formData.installedModel}{formData.installedDescription && formData.installedDescription !== formData.installedModel ? ` - ${formData.installedDescription}` : ''}</td>
                <td className="py-1">{formData.installedSerial}</td>
                <td className="py-1">{formData.installedMacAddress}</td>
                <td className="py-1">{formData.installedIpAddress}</td>
              </tr>
              {formData.linkedAccessories?.map((acc) => (
                <tr key={acc.id} className="border-b border-gray-200 bg-gray-50">
                  <td className="py-1">{acc.quantity}</td>
                  <td className="py-1">{acc.itemNumber}</td>
                  <td className="py-1 pl-2">{acc.model}{acc.description && acc.description !== acc.model ? ` - ${acc.description}` : ''} <span className="text-[7px] text-gray-500">({acc.productType})</span></td>
                  <td className="py-1"></td>
                  <td className="py-1"></td>
                  <td className="py-1"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Networking & Additional Contacts - Side by Side */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-black p-2">
            <p className="font-bold text-[12px] mb-1 border-b border-black pb-2 text-center">NETWORKING</p>
            {/* Print and Scan side by side */}
            <div className="grid grid-cols-2 gap-2">
              {/* PRINT Column */}
              <div>
                <p className="font-bold text-[8px] mb-1 text-center border-b border-gray-300 pb-0.5">PRINT</p>
                <table className="w-full text-[7px]">
                  <tbody>
                    <tr><td>Setup:</td><td className="text-right">{formData.dealerSetupPrint || '____'}</td></tr>
                    <tr><td>Windows:</td><td className="text-right">{formData.printWindowsComputers || '____'}</td></tr>
                    <tr><td>Mac:</td><td className="text-right">{formData.printMacComputers || '____'}</td></tr>
                    <tr><td>USB:</td><td className="text-right">{formData.allowPrintFromUSB || '____'}</td></tr>
                    <tr><td>Mobile:</td><td className="text-right">{formData.allowMobilePrint || '____'}</td></tr>
                  </tbody>
                </table>
              </div>
              {/* SCAN Column */}
              <div>
                <p className="font-bold text-[8px] mb-1 text-center border-b border-gray-300 pb-0.5">SCAN</p>
                <table className="w-full text-[7px]">
                  <tbody>
                    <tr><td>Setup:</td><td className="text-right">{formData.dealerSetupScan || '____'}</td></tr>
                    <tr><td>Windows:</td><td className="text-right">{formData.scanWindowsComputers || '____'}</td></tr>
                    <tr><td>Mac:</td><td className="text-right">{formData.scanMacComputers || '____'}</td></tr>
                    <tr><td>Email:</td><td className="text-right text-[6px] break-all">{formData.emailAssigned || '____'}</td></tr>
                    <tr><td>Password:</td><td className="text-right">{formData.emailPassword || '____'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="border border-black p-2">
            <p className="font-bold text-[12px] mb-1 border-b border-black pb-2 text-center">ADDITIONAL CONTACTS</p>
            <div className="grid grid-cols-2 gap-2">
              {/* IT Contact Column */}
              <div>
                <p className="font-bold text-[8px] mb-1 text-center border-b border-gray-300 pb-0.5">IT CONTACT</p>
                <table className="w-full text-[7px]">
                  <tbody>
                    <tr><td>Name:</td><td className="text-right">{formData.itContactName || '____'}</td></tr>
                    <tr><td>Phone:</td><td className="text-right">{formData.itContactPhone || '____'}</td></tr>
                    <tr><td>Email:</td><td className="text-right text-[6px] break-all">{formData.itContactEmail || '____'}</td></tr>
                  </tbody>
                </table>
              </div>
              {/* Meter Contact Column */}
              <div>
                <p className="font-bold text-[8px] mb-1 text-center border-b border-gray-300 pb-0.5">METER CONTACT</p>
                <table className="w-full text-[7px]">
                  <tbody>
                    <tr><td>Name:</td><td className="text-right">{formData.meterContactName || '____'}</td></tr>
                    <tr><td>Phone:</td><td className="text-right">{formData.meterContactPhone || '____'}</td></tr>
                    <tr><td>Email:</td><td className="text-right text-[6px] break-all">{formData.meterContactEmail || '____'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Removed */}
        {formData.removedEquipment.length > 0 && (
          <div className="mb-4">
            <p className="font-bold text-[12px] mb-1">EQUIPMENT (REMOVED)</p>
            <table className="w-full border-collapse text-[8px]">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left py-1 pb-2 w-8">Qty</th>
                  <th className="text-left py-1 pb-2 w-16">Item #</th>
                  <th className="text-left py-1 pb-2">Make/Model/Description</th>
                  <th className="text-left py-1 pb-2 w-20">Serial</th>
                  <th className="text-left py-1 pb-2 w-16">Meter(BW)</th>
                  <th className="text-left py-1 pb-2 w-16">Meter(COL)</th>
                </tr>
              </thead>
              <tbody>
                {formData.removedEquipment.map((item) => (
                  <tr key={item.id} className="border-b border-gray-300">
                    <td className="py-1">{item.qty}</td>
                    <td className="py-1">{item.itemNumber}</td>
                    <td className="py-1">{item.makeModelDescription}</td>
                    <td className="py-1">{item.serial}</td>
                    <td className="py-1">{item.meterBW}</td>
                    <td className="py-1">{item.meterColor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Removal Instructions */}
        {formData.removalInstructions && (
          <div className="mb-4">
            <p className="font-bold text-[12px] mb-1">REMOVAL INSTRUCTIONS</p>
            <p className="text-[8px] whitespace-pre-wrap border border-black p-2">{formData.removalInstructions}</p>
          </div>
        )}

        {/* Removal Receipt T&C */}
        {removalReceiptTerms && (
          <div className="mb-3">
            <p className="font-bold text-[12px] mb-1">REMOVAL RECEIPT</p>
            <p className="text-[7px] whitespace-pre-wrap mb-1">{removalReceiptTerms}</p>
            <div className="w-32">
              <div className="border-b border-black h-4 mb-0.5"></div>
              <p className="text-[7px]">Customer Initials</p>
            </div>
          </div>
        )}

        {/* Delivery and Acceptance T&C */}
        {deliveryAcceptanceTerms && (
          <div className="mb-3">
            <p className="font-bold text-[12px] mb-1">DELIVERY AND ACCEPTANCE</p>
            <p className="text-[7px] whitespace-pre-wrap mb-1">{deliveryAcceptanceTerms}</p>
            <div className="w-32">
              <div className="border-b border-black h-4 mb-0.5"></div>
              <p className="text-[7px]">Customer Initials</p>
            </div>
          </div>
        )}

        {/* Combined Signature Section */}
        <div className="mt-4 pt-3 border-t border-black">
          <p className="font-bold text-[12px] mb-2">SIGNATURES</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Technician Side */}
            <div className="border-r border-gray-300 pr-4">
              <p className="font-bold text-[8px] mb-2">{dealerInfo?.companyName || 'TECHNICIAN'}</p>
              <div className="space-y-2">
                <div>
                  <div className="border-b border-black h-5 mb-0.5"></div>
                  <p className="text-[7px]">Installed By (sign)</p>
                </div>
                <div>
                  <div className="border-b border-black h-5 mb-0.5"></div>
                  <p className="text-[7px]">Printed Name</p>
                </div>
              </div>
            </div>
            {/* Customer Side */}
            <div>
              <p className="font-bold text-[8px] mb-2">{formData.shipToCompany || 'CUSTOMER'}</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="border-b border-black h-5 mb-0.5"></div>
                  <p className="text-[7px]">Signature</p>
                </div>
                <div>
                  <div className="border-b border-black h-5 mb-0.5"></div>
                  <p className="text-[7px]">Printed Name</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="border-b border-black h-5 mb-0.5"></div>
                  <p className="text-[7px]">Date</p>
                </div>
                <div>
                  <div className="border-b border-black h-5 mb-0.5"></div>
                  <p className="text-[7px]">Title</p>
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

InstallationPreview.displayName = 'InstallationPreview';
