import { forwardRef } from 'react';
import type { QuoteFormData } from './QuoteForm';
import type { DocumentStyles } from '@/components/commission/CommissionPreview';
import { getLabel, isSectionVisible, type FormCustomizationConfig } from '@/lib/formCustomization';

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
  documentStyles?: DocumentStyles;
  formCustomization?: FormCustomizationConfig;
}

export const QuotePreview = forwardRef<HTMLDivElement, QuotePreviewProps>(
  ({ formData, dealerInfo, documentStyles, formCustomization }, ref) => {
    // Use pre-calculated payments from formData, respecting overrides
    const getLeasePayment = (term: number): number => {
      const override = formData.paymentOverrides?.[term];
      if (override !== null && override !== undefined && override > 0) {
        return override;
      }
      return formData.calculatedPayments?.[term] || 0;
    };

    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatCurrency = (value: number) => {
      return (value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const hasServiceAgreement = formData.serviceBaseRate > 0 || formData.includedBWCopies > 0 || formData.includedColorCopies > 0;
    
    // Calculate total MSRP for strikethrough display
    const totalMSRP = formData.lineItems.reduce((sum, item) => sum + ((item.msrp || 0) * item.quantity), 0);
    const showMSRPStrikethrough = totalMSRP > 0 && Math.abs(totalMSRP - formData.retailPrice) > 0.01;
    
    // Configuration-based visibility
    const showPurchase = formData.priceDisplay === 'both' || formData.priceDisplay === 'purchase_only';
    const showLease = formData.priceDisplay === 'both' || formData.priceDisplay === 'lease_only';
    
    // Calculate total buyout if applicable
    const totalBuyout = (formData.paymentAmount * formData.paymentsRemaining) + formData.earlyTerminationFee + formData.returnShipping;
    const showBuyout = formData.leasingPriceType === 'with_buyout' && totalBuyout > 0;

    // Get lease program display name
    const leaseTypeName = formData.leaseProgram === 'fmv' ? 'FMV Lease' : '$1 Buyout Lease';

    return (
      <div 
        ref={ref}
        className="bg-white p-8 min-h-[11in] w-[8.5in] text-[11px] leading-tight"
        style={{ fontFamily: documentStyles?.fontFamily || 'Arial, sans-serif', color: documentStyles?.fontColor || '#000000' }}
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
                <p className="font-bold text-[10px]">{dealerInfo.companyName}</p>
                <p className="text-[9px]">{dealerInfo.address}</p>
                <p className="text-[9px]">{dealerInfo.phone}</p>
                <p className="text-[9px]">{dealerInfo.website}</p>
              </>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold mb-2">Quote</h1>
            <table className="text-right ml-auto">
              <tbody>
                <tr>
                  <td className="pr-4">{getLabel(formCustomization, 'quoteNumber', 'Quote Number')}:</td>
                  <td className="font-semibold">{formData.quoteNumber}</td>
                </tr>
                <tr>
                  <td className="pr-4">{getLabel(formCustomization, 'quoteDate', 'Quote Date')}:</td>
                  <td>{formatDate(formData.quoteDate)}</td>
                </tr>
                <tr>
                  <td className="pr-4">{getLabel(formCustomization, 'preparedBy', 'Prepared By')}:</td>
                  <td>{formData.preparedBy}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Prepared For */}
        {isSectionVisible(formCustomization, 'customerInfo') && (
        <div className="mb-6">
          <p className="font-bold mb-1">Prepared For:</p>
          <p className="font-semibold">{formData.companyName}</p>
          <p>{formData.address}</p>
          {formData.address2 && <p>{formData.address2}</p>}
          <p>{formData.city}, {formData.state} {formData.zip}</p>
          {formData.phone && <p>{formData.phone}</p>}
        </div>
        )}

        {/* Equipment Table */}
        {isSectionVisible(formCustomization, 'equipment') && (
        <div className="mb-6">
          <p className="font-bold mb-2">EQUIPMENT</p>
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 pb-2 w-12">Qty.</th>
                <th className="text-left py-1 pb-2 w-36">Model</th>
                <th className="text-left py-1 pb-2">Description</th>
                <th className="text-right py-1 pb-2 w-24">Retail</th>
                <th className="text-right py-1 pb-2 w-24">Your Price</th>
              </tr>
            </thead>
            <tbody>
              {formData.lineItems.map((item) => {
                const itemMsrp = item.msrp || 0;
                const itemPrice = item.price || 0;
                const msrpDiffers = itemMsrp > 0 && Math.abs(itemMsrp - itemPrice) > 0.01;
                return (
                  <tr key={item.id} className="border-b border-gray-300">
                    <td className="py-1">{item.quantity}</td>
                    <td className="py-1">{item.model}</td>
                    <td className="py-1">{item.description}</td>
                    <td className="py-1 text-right">
                      {msrpDiffers ? (
                        <span className="text-gray-500 line-through">${formatCurrency(itemMsrp)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-1 text-right font-semibold">${formatCurrency(itemPrice)}</td>
                  </tr>
                );
              })}
              {formData.lineItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2 text-gray-400 text-center">No equipment items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Combined Pricing Table - Purchase | Lease | Service Agreement */}
        <div className="mb-4">
          <table className="w-full border-collapse text-[10px]">
            <colgroup>
              {showPurchase && <col style={{ width: '18%' }} />}
              {showPurchase && showLease && <col style={{ width: '16px' }} />}
              {showLease && (
                <>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                </>
              )}
              {hasServiceAgreement && <col style={{ width: '28%' }} />}
            </colgroup>
            <thead>
              <tr className="border-b-2 border-black">
                {showPurchase && <th className="text-left py-1 pb-2 font-bold">YOUR PRICE</th>}
                {showPurchase && showLease && <th className="py-1 pb-2 font-bold"></th>}
                {showLease && <th colSpan={2} className="text-left py-1 pb-2 font-bold">{leaseTypeName.toUpperCase()}</th>}
                {hasServiceAgreement && (
                  <th className="text-left py-1 pb-2 font-bold pl-4 border-l-2 border-black">SERVICE AGREEMENT</th>
                )}
              </tr>
              <tr className="border-b border-gray-300">
                {showPurchase && <th className="text-left py-1 font-semibold text-[9px]"></th>}
                {showPurchase && showLease && <th className="text-center py-1 font-semibold text-[9px]"></th>}
                {showLease && (
                  <>
                    <th className="text-left py-1 font-semibold text-[9px]">TERM</th>
                    <th className="text-right py-1 font-semibold text-[9px] pr-3">PAYMENT</th>
                  </>
                )}
                {hasServiceAgreement && (
                  <th className="py-1 pl-4 border-l-2 border-black"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {/* First row - main values */}
              <tr className="border-b border-gray-300">
                {showPurchase && (
                  <td className="py-1 align-top" rowSpan={Math.max(formData.selectedTerms.length, 1)}>
                    {showMSRPStrikethrough && (
                      <span className="text-gray-500 line-through text-[9px] mr-2">${formatCurrency(totalMSRP)}</span>
                    )}
                    <span className="font-bold">${formatCurrency(formData.retailPrice)}</span>
                  </td>
                )}
                {showPurchase && showLease && (
                  <td className="text-center py-1 align-middle font-bold text-gray-500" rowSpan={Math.max(formData.selectedTerms.length, 1)}>
                    OR
                  </td>
                )}
                {showLease && formData.selectedTerms.length > 0 && (
                  <>
                    <td className="py-1">{formData.selectedTerms[0]} months</td>
                    <td className="py-1 text-right font-semibold pr-3">
                      ${(getLeasePayment(formData.selectedTerms[0]) ?? 0).toLocaleString()}/mo
                    </td>
                  </>
                )}
                {hasServiceAgreement && (
                  <td className="py-1 pl-4 align-top border-l-2 border-black" rowSpan={Math.max(formData.selectedTerms.length, 1)}>
                    {/* Service Agreement mini-table matching blue reference layout */}
                    <table className="w-full text-[9px]">
                      <tbody>
                        <tr>
                          <td className="font-bold pr-2 py-[1px]">BASE RATE</td>
                          <td className="py-[1px]">${formatCurrency(formData.serviceBaseRate)}</td>
                          <td className="text-right py-[1px]">PER MONTH</td>
                        </tr>
                        {(formData.includedBWCopies > 0 || formData.includedColorCopies > 0) && (
                          <>
                            <tr>
                              <td className="font-bold pr-2 py-[1px] pt-1" rowSpan={2}>INCLUDES</td>
                              <td className="py-[1px] pt-1">B/W COPIES</td>
                              <td className="text-right py-[1px] pt-1">{(formData.includedBWCopies ?? 0).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="py-[1px]">COLOR COPIES</td>
                              <td className="text-right py-[1px]">{(formData.includedColorCopies ?? 0).toLocaleString()}</td>
                            </tr>
                          </>
                        )}
                        {(formData.overageBWRate > 0 || formData.overageColorRate > 0) && (
                          <>
                            <tr>
                              <td className="font-bold pr-2 py-[1px] pt-1" rowSpan={2}>OVERAGES</td>
                              <td className="py-[1px] pt-1">B/W @</td>
                              <td className="text-right py-[1px] pt-1">${formData.overageBWRate.toFixed(4)}</td>
                            </tr>
                            <tr>
                              <td className="py-[1px]">COLOR @</td>
                              <td className="text-right py-[1px]">${formData.overageColorRate.toFixed(4)}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </td>
                )}
              </tr>
              {/* Additional lease term rows */}
              {showLease && formData.selectedTerms.slice(1).map((term, idx) => (
                <tr key={term} className={idx === formData.selectedTerms.length - 2 ? '' : 'border-b border-gray-300'}>
                  <td className="py-1">{term} months</td>
                  <td className="py-1 text-right font-semibold pr-3">
                    ${getLeasePayment(term).toLocaleString()}/mo
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leasing Company Info */}
        {showLease && formData.leasingCompanyId && (
          <div className="mb-4 text-[9px] text-gray-600">
            <p>Financing provided by: {formData.leasingCompanyId}</p>
          </div>
        )}

        {/* Terms & Conditions */}
        {isSectionVisible(formCustomization, 'termsAndConditions') && dealerInfo?.termsAndConditions && (
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
        {isSectionVisible(formCustomization, 'acceptance') && (
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
        )}

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
