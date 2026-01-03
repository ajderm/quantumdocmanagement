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

    return (
      <div 
        ref={ref}
        className="bg-white text-black p-8 min-h-[11in] w-[8.5in] text-[11px] leading-tight"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
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
                <p className="font-bold text-base">{dealerInfo.companyName}</p>
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

        <div className="mb-6">
          <p className="font-bold mb-1">Prepared For:</p>
          <p className="font-semibold">{formData.companyName}</p>
          <p>{formData.address}</p>
          {formData.address2 && <p>{formData.address2}</p>}
          <p>{formData.city}, {formData.state} {formData.zip}</p>
          {formData.phone && <p>{formData.phone}</p>}
        </div>

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

        <div className="flex gap-8 mb-6">
          <div className="flex-1">
            <p className="font-bold mb-2">Purchase</p>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-1">Retail</td>
                  <td className="text-right font-semibold">${formData.retailPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td className="py-1">Cash Discount</td>
                  <td className="text-right font-semibold">${formData.cashDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex-1">
            <p className="font-bold mb-2">FMV Lease</p>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1">Term</th>
                  <th className="text-right py-1">Payment</th>
                </tr>
              </thead>
              <tbody>
                {formData.selectedTerms.map((term) => (
                  <tr key={term}>
                    <td className="py-1">{term} months</td>
                    <td className="text-right font-semibold">${calculateLeasePayment(term).toLocaleString()}/mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {(formData.serviceBaseRate > 0 || formData.includedBWCopies || formData.includedColorCopies) && (
          <div className="mb-6">
            <p className="font-bold mb-2">SERVICE AGREEMENT</p>
            <table className="w-full max-w-md">
              <tbody>
                {formData.serviceBaseRate > 0 && (
                  <tr>
                    <td className="py-1">Base Rate</td>
                    <td className="text-right">${formData.serviceBaseRate.toFixed(2)} Per Month</td>
                  </tr>
                )}
                {(formData.includedBWCopies || formData.includedColorCopies) && (
                  <tr>
                    <td className="py-1">Includes</td>
                    <td className="text-right">
                      {formData.includedBWCopies && `B/W: ${formData.includedBWCopies}`}
                      {formData.includedBWCopies && formData.includedColorCopies && ', '}
                      {formData.includedColorCopies && `Color: ${formData.includedColorCopies}`}
                    </td>
                  </tr>
                )}
                {(formData.overageBWRate || formData.overageColorRate) && (
                  <tr>
                    <td className="py-1">Overages</td>
                    <td className="text-right">
                      {formData.overageBWRate && `B/W @ ${formData.overageBWRate}`}
                      {formData.overageBWRate && formData.overageColorRate && ', '}
                      {formData.overageColorRate && `Color @ ${formData.overageColorRate}`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mb-6 text-[10px] text-gray-600">
          <p>
            Pricing includes your new equipment delivery, installation, training and one (1) hour of network connectivity 
            (setting up print/scan) support assisting your network administrator. If applicable, additional time will be 
            billed at $140.00 per hour. Quotation does not include tax. Service/Maintenance agreement includes all toner 
            parts, & labor. Excludes paper, staples, and networking.
          </p>
        </div>

        <div className="mb-6">
          <p className="mb-4">
            Thank you for this opportunity! If you have any questions, please feel free to contact me. 
            To order your new equipment please email signed quote back to me indicating either "Cash Price" or desired lease payment option.
          </p>
          <p className="mb-1">Sincerely,</p>
          <p className="font-semibold">{formData.preparedBy}</p>
          {formData.preparedByPhone && <p>{formData.preparedByPhone}</p>}
          {formData.preparedByEmail && <p>{formData.preparedByEmail}</p>}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-300">
          <p className="font-bold mb-4">Accepted By:</p>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-black h-8 mb-1"></div>
              <p className="text-[10px]">Signature</p>
            </div>
            <div>
              <div className="border-b border-black h-8 mb-1"></div>
              <p className="text-[10px]">Title</p>
            </div>
            <div>
              <div className="border-b border-black h-8 mb-1"></div>
              <p className="text-[10px]">Printed Name</p>
            </div>
            <div>
              <div className="border-b border-black h-8 mb-1"></div>
              <p className="text-[10px]">Date</p>
            </div>
          </div>
        </div>

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