import { forwardRef } from 'react';
import type { QuoteFormData } from './QuoteForm';

interface QuotePreviewProps {
  formData: QuoteFormData;
  dealerInfo?: {
    companyName: string;
    address: string;
    phone: string;
    website: string;
    logoUrl?: string;
    termsAndConditions?: string;
  };
}

const RATE_FACTORS: Record<number, number> = {
  12: 0.088,
  24: 0.046,
  36: 0.032,
  48: 0.026,
  60: 0.022,
  72: 0.019,
};

export const QuotePreview = forwardRef<HTMLDivElement, QuotePreviewProps>(
  ({ formData, dealerInfo }, ref) => {
    const calculateLeasePayment = (term: number): number => {
      const rateFactor = RATE_FACTORS[term] || 0.025;
      return Math.round(formData.retailPrice * rateFactor);
    };

    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatCurrency = (value: number) => {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const hasServiceAgreement = formData.serviceBaseRate > 0 || formData.includedBWCopies > 0 || formData.includedColorCopies > 0;

    return (
      <div 
        ref={ref}
        className="bg-white text-black p-8 min-h-[11in] w-[8.5in] text-[11px] leading-tight"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            {dealerInfo && (
              <>
                {dealerInfo.logoUrl && (
                  <img 
                    src={dealerInfo.logoUrl} 
                    alt={dealerInfo.companyName} 
                    className="h-12 mb-2 object-contain"
                    crossOrigin="anonymous"
                  />
                )}
                <p className="font-bold text-sm">{dealerInfo.companyName}</p>
                <p className="text-sm">{dealerInfo.address}</p>
                <p className="text-sm">{dealerInfo.phone}</p>
                <p className="text-sm">{dealerInfo.website}</p>
              </>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold mb-2">Quote</h1>
            <table className="text-right ml-auto">
              <tbody>
                <tr>
                  <td className="pr-4">Quote Number:</td>
                  <td className="font-semibold">{formData.quoteNumber}</td>
                </tr>
                <tr>
                  <td className="pr-4">Quote Date:</td>
                  <td>{formatDate(formData.quoteDate)}</td>
                </tr>
                <tr>
                  <td className="pr-4">Prepared By:</td>
                  <td>{formData.preparedBy}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Prepared For */}
        <div className="mb-6">
          <p className="font-bold mb-1">Prepared For:</p>
          <p className="font-semibold">{formData.companyName}</p>
          <p>{formData.address}</p>
          {formData.address2 && <p>{formData.address2}</p>}
          <p>{formData.city}, {formData.state} {formData.zip}</p>
          {formData.phone && <p>{formData.phone}</p>}
        </div>

        {/* Equipment Table */}
        <div className="mb-6">
          <p className="font-bold mb-2">EQUIPMENT</p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 w-12">Qty.</th>
                <th className="text-left py-1 w-32">Model</th>
                <th className="text-left py-1">Description</th>
              </tr>
            </thead>
            <tbody>
              {formData.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-300">
                  <td className="py-1">{item.quantity}</td>
                  <td className="py-1">{item.model}</td>
                  <td className="py-1">{item.description}</td>
                </tr>
              ))}
              {formData.lineItems.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-2 text-gray-400 text-center">No equipment items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Combined Pricing Table - Purchase | Lease | Service Agreement */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={2} className="text-left py-1 font-bold">PURCHASE</th>
                <th className="py-1 font-bold" style={{ width: '24px' }}></th>
                <th colSpan={2} className="text-left py-1 font-bold">LEASE</th>
                {hasServiceAgreement && (
                  <th colSpan={2} className="text-left py-1 font-bold">SERVICE AGREEMENT</th>
                )}
              </tr>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1 font-semibold text-[9px]">RETAIL</th>
                <th className="text-left py-1 font-semibold text-[9px]">CASH DISCOUNT</th>
                <th className="text-center py-1 font-semibold text-[9px]"></th>
                <th className="text-left py-1 font-semibold text-[9px]">TERM</th>
                <th className="text-right py-1 font-semibold text-[9px]">PAYMENT</th>
                {hasServiceAgreement && (
                  <>
                    <th className="text-left py-1 font-semibold text-[9px]">BASE RATE</th>
                    <th className="text-right py-1 font-semibold text-[9px]">PER MONTH</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* First row - main values */}
              <tr className="border-b border-gray-300">
                <td className="py-1 align-top" rowSpan={Math.max(formData.selectedTerms.length, 1)}>
                  <span className="font-bold">${formatCurrency(formData.retailPrice)}</span>
                </td>
                <td className="py-1 align-top" rowSpan={Math.max(formData.selectedTerms.length, 1)}>
                  <span className="font-bold">${formatCurrency(formData.cashDiscount)}</span>
                </td>
                <td className="text-center py-1 align-middle font-bold text-gray-500" rowSpan={Math.max(formData.selectedTerms.length, 1)}>
                  OR
                </td>
                <td className="py-1">{formData.selectedTerms[0]} months</td>
                <td className="py-1 text-right font-semibold">
                  ${calculateLeasePayment(formData.selectedTerms[0]).toLocaleString()}/mo
                </td>
                {hasServiceAgreement && (
                  <>
                    <td className="py-1 align-top" rowSpan={Math.max(formData.selectedTerms.length, 1)}>
                      <span className="font-bold">${formatCurrency(formData.serviceBaseRate)}</span>
                    </td>
                    <td className="py-1 align-top text-[9px]" rowSpan={Math.max(formData.selectedTerms.length, 1)}>
                      <div className="leading-tight">
                        <p className="font-semibold">INCLUDES:</p>
                        {formData.includedBWCopies > 0 && (
                          <p>B/W: {formData.includedBWCopies.toLocaleString()}</p>
                        )}
                        {formData.includedColorCopies > 0 && (
                          <p>Color: {formData.includedColorCopies.toLocaleString()}</p>
                        )}
                        {(formData.overageBWRate > 0 || formData.overageColorRate > 0) && (
                          <>
                            <p className="font-semibold mt-1">OVERAGES:</p>
                            {formData.overageBWRate > 0 && (
                              <p>B/W @ ${formData.overageBWRate.toFixed(4)}</p>
                            )}
                            {formData.overageColorRate > 0 && (
                              <p>Color @ ${formData.overageColorRate.toFixed(4)}</p>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
              {/* Additional lease term rows */}
              {formData.selectedTerms.slice(1).map((term, idx) => (
                <tr key={term} className={idx === formData.selectedTerms.length - 2 ? '' : 'border-b border-gray-300'}>
                  <td className="py-1">{term} months</td>
                  <td className="py-1 text-right font-semibold">
                    ${calculateLeasePayment(term).toLocaleString()}/mo
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Terms & Conditions */}
        {dealerInfo?.termsAndConditions && (
          <div className="mb-6 text-[10px]">
            <p className="font-bold mb-1">Terms & Conditions:</p>
            <p className="whitespace-pre-wrap">{dealerInfo.termsAndConditions}</p>
          </div>
        )}

        {/* Signature */}
        <div className="mb-6">
          <p className="mb-1">Sincerely,</p>
          <p className="font-semibold">{formData.preparedBy}</p>
          {formData.preparedByPhone && <p>{formData.preparedByPhone}</p>}
          {formData.preparedByEmail && <p>{formData.preparedByEmail}</p>}
        </div>

        {/* Acceptance Section */}
        <div className="mt-4 pt-2 border-t border-gray-300">
          <p className="font-bold mb-2">Accepted By:</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div>
              <div className="border-b border-black h-5"></div>
              <p className="text-[9px]">Signature</p>
            </div>
            <div>
              <div className="border-b border-black h-5"></div>
              <p className="text-[9px]">Title</p>
            </div>
            <div>
              <div className="border-b border-black h-5"></div>
              <p className="text-[9px]">Printed Name</p>
            </div>
            <div>
              <div className="border-b border-black h-5"></div>
              <p className="text-[9px]">Date</p>
            </div>
          </div>
        </div>

        {/* Confidentiality Notice */}
        <div className="mt-6 text-[9px] text-gray-500 italic">
          <p>
            Information in this proposal is confidential and intended solely for use in the procurement process 
            and may not be disclosed except to persons who are involved in the evaluation of the proposal and 
            award of the contract.
          </p>
        </div>
      </div>
    );
  }
);

QuotePreview.displayName = 'QuotePreview';
