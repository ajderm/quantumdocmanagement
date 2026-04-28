import { forwardRef } from "react";
import { format } from "date-fns";
import { ServiceAgreementFormData } from "./ServiceAgreementForm";

import { buildDocumentFontCss } from "@/lib/documentFontSizes";
interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
  category?: string;
  serial?: string;
  model?: string;
  itemNumber?: string;
  parentLineItemId?: string;
}

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

interface ServiceAgreementPreviewProps {
  formData: ServiceAgreementFormData;
  dealerInfo?: DealerInfo | null;
  lineItems: LineItem[];
  termsAndConditions?: string;
  documentStyles?: { fontFamily?: string; fontColor?: string; tableBorderColor?: string; tableLineColor?: string; fontSizeOffset?: number; fontSizeOffsets?: { title?: number; header?: number; body?: number; table?: number; fine?: number; }; };
  installationConfigs?: Record<string, { installedSerial?: string; idNumber?: string }>;
}

export const ServiceAgreementPreview = forwardRef<HTMLDivElement, ServiceAgreementPreviewProps>(
  ({ formData, dealerInfo, lineItems, termsAndConditions, documentStyles, installationConfigs }, ref) => {
    const hardwareLineItems = (() => {
      const hw = lineItems.filter(
        (item) => item.category?.toLowerCase() === 'hardware'
      );
      let filtered: LineItem[];
      if (hw.length === 0) {
        const nonAccessories = lineItems.filter(
          (item) => item.category?.toLowerCase() !== 'accessory' && !item.parentLineItemId
        );
        filtered = nonAccessories.length > 0 ? nonAccessories : lineItems;
      } else {
        filtered = hw;
      }
      // Enrich with serial numbers from installation configs
      if (installationConfigs) {
        return filtered.map(item => {
          const installData = installationConfigs[item.id];
          if (installData?.installedSerial && !item.serial) {
            return { ...item, serial: installData.installedSerial };
          }
          return item;
        });
      }
      return filtered;
    })();

    const formatCurrency = (value: string | number) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return '-';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(num);
    };

    const _docScopeId = 'doc-serviceagreement';
    const _docFontCss = buildDocumentFontCss(_docScopeId, documentStyles);

    return (
      <>
        {_docFontCss && <style>{_docFontCss}</style>}
        <div
        ref={ref}
        data-doc-scope={_docScopeId}
        className="bg-white p-8 min-h-[11in] w-[8.5in] text-[13px] leading-tight"
        style={{ fontFamily: documentStyles?.fontFamily || 'Arial, sans-serif', color: documentStyles?.fontColor || '#000000' }}
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
              <p className="font-bold text-[12px]">{dealerInfo?.company_name || 'Company Name'}</p>
              <p className="text-[12px]">
                {dealerInfo?.address_line1}
                {dealerInfo?.address_line2 && <>, {dealerInfo.address_line2}</>}
              </p>
              <p className="text-[12px]">
                {[dealerInfo?.city, dealerInfo?.state, dealerInfo?.zip_code].filter(Boolean).join(', ')}
              </p>
              {dealerInfo?.phone && <p className="text-[12px]">Phone: {dealerInfo.phone}</p>}
              {dealerInfo?.website && <p className="text-[12px]">{dealerInfo.website}</p>}
            </div>
          </div>

          {/* Right: Customer Number & Meter Method */}
          <div className="text-right">
            <h1 className="text-base font-bold mb-2">Service Agreement</h1>
            <table className="text-right ml-auto text-[12px]">
              <tbody>
                <tr>
                  <td className="pr-4 font-bold">Customer #:</td>
                  <td>{formData.customerNumberOverride || formData.customerNumber || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-4 font-bold">Meter Method:</td>
                  <td>{formData.meterMethod || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Ship To / Bill To */}
        <div className="flex gap-5 mb-4">
          {/* Ship To */}
          <div className="flex-1">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b-2 border-black">
                  <th colSpan={2} className="text-left py-1 pb-2 font-bold">CUSTOMER SHIP TO</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-1 w-20 font-semibold">Company</td>
                  <td className="py-1">{formData.shipToCompany}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Address</td>
                  <td className="py-1">{formData.shipToAddress}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">City/State/Zip</td>
                  <td className="py-1">{[formData.shipToCity, formData.shipToState, formData.shipToZip].filter(Boolean).join(', ')}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Attn</td>
                  <td className="py-1">{formData.shipToAttn}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Phone</td>
                  <td className="py-1">{formData.shipToPhone}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Email</td>
                  <td className="py-1">{formData.shipToEmail}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bill To */}
          <div className="flex-1">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b-2 border-black">
                  <th colSpan={2} className="text-left py-1 pb-2 font-bold">CUSTOMER BILL TO</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-1 w-20 font-semibold">Company</td>
                  <td className="py-1">{formData.billToCompany}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Address</td>
                  <td className="py-1">{formData.billToAddress}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">City/State/Zip</td>
                  <td className="py-1">{[formData.billToCity, formData.billToState, formData.billToZip].filter(Boolean).join(', ')}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Attn</td>
                  <td className="py-1">{formData.billToAttn}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Phone</td>
                  <td className="py-1">{formData.billToPhone}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 font-semibold">Email</td>
                  <td className="py-1">{formData.billToEmail}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={5} className="text-left py-1 pb-2 font-bold">TERMS</th>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="py-1 text-center font-semibold"><span className="underline">Maintenance Type</span></th>
                <th className="py-1 text-center font-semibold"><span className="underline">Paper & Staples</span></th>
                <th className="py-1 text-center font-semibold"><span className="underline">Drum & Toner</span></th>
                <th className="py-1 text-center font-semibold"><span className="underline">Effective Date</span></th>
                <th className="py-1 text-center font-semibold"><span className="underline">Contract Length</span></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1 text-center">{formData.maintenanceType || '-'}</td>
                <td className="py-1 text-center">{formData.paperStaples || '-'}</td>
                <td className="py-1 text-center">{formData.drumToner || '-'}</td>
                <td className="py-1 text-center">{formData.effectiveDate ? format(formData.effectiveDate, 'MM/dd/yyyy') : '-'}</td>
                <td className="py-1 text-center">{formData.contractLengthMonths ? `${formData.contractLengthMonths} Months` : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Equipment Table */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={4} className="text-left py-1 pb-2 font-bold">EQUIPMENT</th>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="py-1 text-left w-8"><span className="underline">Qty</span></th>
                <th className="py-1 text-left w-28"><span className="underline">Model</span></th>
                <th className="py-1 text-left"><span className="underline">Description</span></th>
                <th className="py-1 text-left w-24"><span className="underline">Serial</span></th>
              </tr>
            </thead>
            <tbody>
              {hardwareLineItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-2 text-center text-gray-400">No equipment items</td>
                </tr>
              ) : (
                hardwareLineItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-300">
                    <td className="py-1">{item.quantity}</td>
                    <td className="py-1">{item.name}</td>
                    <td className="py-1">{item.description || '-'}</td>
                    <td className="py-1">{item.serial || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rates Table (Hardware Only) */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={6} className="text-left py-1 pb-2 font-bold">RATES</th>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="py-1 text-left"><span className="underline">Model</span></th>
                <th className="py-1 text-center"><span className="underline">Base Rate</span></th>
                <th className="py-1 text-center"><span className="underline">Includes (B/W)</span></th>
                <th className="py-1 text-center"><span className="underline">Includes (Color)</span></th>
                <th className="py-1 text-center"><span className="underline">Overages (B/W)</span></th>
                <th className="py-1 text-center"><span className="underline">Overages (Color)</span></th>
              </tr>
            </thead>
            <tbody>
              {hardwareLineItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-2 text-center text-gray-400">No hardware items</td>
                </tr>
              ) : (
                hardwareLineItems.map((item) => {
                  const rates = formData.rates[item.id] || { includesBW: '', includesColor: '', overagesBW: '', overagesColor: '', baseRate: '' };
                  return (
                    <tr key={item.id} className="border-b border-gray-300">
                      <td className="py-1">{item.name}</td>
                      <td className="py-1 text-center">{rates.baseRate ? formatCurrency(rates.baseRate) : '-'}</td>
                      <td className="py-1 text-center">{rates.includesBW || '-'}</td>
                      <td className="py-1 text-center">{rates.includesColor || '-'}</td>
                      <td className="py-1 text-center">{rates.overagesBW ? formatCurrency(rates.overagesBW) : '-'}</td>
                      <td className="py-1 text-center">{rates.overagesColor ? formatCurrency(rates.overagesColor) : '-'}</td>
                    </tr>
                  );
                })
              )}
              {/* Total Base Rate row when multiple units */}
              {hardwareLineItems.length > 1 && (
                <tr className="border-t-2 border-black font-bold">
                  <td className="py-1">Total</td>
                  <td className="py-1 text-center">
                    {(() => {
                      const total = hardwareLineItems.reduce((sum, item) => {
                        const rate = formData.rates[item.id]?.baseRate;
                        return sum + (rate ? parseFloat(String(rate)) || 0 : 0);
                      }, 0);
                      return total > 0 ? formatCurrency(total) : '-';
                    })()}
                  </td>
                  <td className="py-1"></td>
                  <td className="py-1"></td>
                  <td className="py-1"></td>
                  <td className="py-1"></td>
                </tr>
              )}
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

        {/* Signatures - matching Quote/Installation style */}
        <div className="mt-6 pt-2 border-t border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            {/* Left: Dealer */}
            <div>
              <p className="font-bold mb-1 text-[12px]">{dealerInfo?.company_name || 'Dealer'}</p>
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

            {/* Right: Customer */}
            <div>
              <p className="font-bold mb-1 text-[12px]">{formData.billToCompany || 'Customer'}</p>
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

ServiceAgreementPreview.displayName = "ServiceAgreementPreview";
