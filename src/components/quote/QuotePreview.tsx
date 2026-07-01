import { forwardRef } from "react";
import type { QuoteFormData } from "./QuoteForm";
import type { DocumentStyles } from "@/lib/documentFontSizes";
import { getLabel, isSectionVisible, type FormCustomizationConfig } from "@/lib/formCustomization";
import { DocPage, DocLetterhead, DocSection, DocSignature } from "@/components/doc/DocPrimitives";
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
  documentTerms?: Record<string, string>;
}

export const QuotePreview = forwardRef<HTMLDivElement, QuotePreviewProps>(
  ({ formData, dealerInfo, documentStyles, formCustomization, documentTerms }, ref) => {
    // Use pre-calculated payments from formData, respecting overrides
    const getLeasePayment = (term: number): number => {
      const override = formData.paymentOverrides?.[term];
      if (override !== null && override !== undefined && override > 0) {
        return override;
      }
      return formData.calculatedPayments?.[term] || 0;
    };

    const formatDate = (dateString: string) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    };

    const formatCurrency = (value: number) => {
      return (value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Unicode strikethrough: inserts combining long stroke overlay (U+0336) after each character
    // This renders as actual text glyphs — guaranteed to work in html2canvas/PDF
    const strikethrough = (text: string): string => {
      return text
        .split("")
        .map((char) => char + "\u0336")
        .join("");
    };

    const hasServiceAgreement =
      formData.serviceBaseRate > 0 || formData.includedBWCopies > 0 || formData.includedColorCopies > 0;

    // Calculate total MSRP for strikethrough display
    const totalMSRP = formData.lineItems.reduce((sum, item) => sum + (item.msrp || 0) * item.quantity, 0);
    const showMSRPStrikethrough = totalMSRP > 0 && Math.abs(totalMSRP - formData.retailPrice) > 0.01;

    // Configuration-based visibility
    const isRental = formData.leaseProgram === "rental";
    const showPurchase = !isRental && (formData.priceDisplay === "both" || formData.priceDisplay === "purchase_only");
    const showLease = formData.priceDisplay === "both" || formData.priceDisplay === "lease_only" || isRental;

    // Calculate total buyout if applicable
    const totalBuyout =
      formData.paymentAmount * formData.paymentsRemaining + formData.earlyTerminationFee + formData.returnShipping;
    const showBuyout = formData.leasingPriceType === "with_buyout" && totalBuyout > 0;

    // Get lease program display name
    const leaseTypeName = isRental
      ? "Monthly Rental"
      : formData.leaseProgram === "fmv"
        ? "FMV Lease"
        : "$1 Buyout Lease";

    // Pricing-table column widths. Weighted and normalized so the active columns
    // always fill 100% of the width. This prevents the dead space that otherwise
    // pushes the lease columns to the right and condenses them when purchase,
    // lease, and service agreement are all shown at once.
    const _pricingWeights = {
      purchase: showPurchase ? 2.2 : 0,
      or: showPurchase && showLease ? 0.5 : 0,
      term: showLease ? 1.4 : 0,
      payment: showLease ? 1.6 : 0,
      service: hasServiceAgreement ? 3.6 : 0,
    };
    const _pricingTotal = Object.values(_pricingWeights).reduce((a, b) => a + b, 0) || 1;
    const pw = (w: number) => `${((w / _pricingTotal) * 100).toFixed(2)}%`;

    return (
      <DocPage ref={ref} scopeId="doc-quote" documentStyles={documentStyles}>
        {/* Header */}
        <DocLetterhead
          dealerInfo={dealerInfo}
          title="Quote"
          metaRows={[
            {
              label: getLabel(formCustomization, "quoteNumber", "Quote Number"),
              value: <span data-quote-number>{formData.quoteNumber}</span>,
              emphasize: true,
            },
            {
              label: getLabel(formCustomization, "quoteDate", "Quote Date"),
              value: formatDate(formData.quoteDate),
            },
            {
              label: getLabel(formCustomization, "preparedBy", "Prepared By"),
              value: formData.preparedBy,
            },
          ]}
        />

        {/* Prepared For */}
        {isSectionVisible(formCustomization, "customerInfo") && (
          <DocSection title="Prepared For" documentStyles={documentStyles}>
            <p className="font-semibold">{formData.companyName}</p>
            <p>{formData.address}</p>
            {formData.address2 && <p>{formData.address2}</p>}
            <p>
              {formData.city}, {formData.state} {formData.zip}
            </p>
            {formData.phone && <p>{formData.phone}</p>}
          </DocSection>
        )}

        {/* Equipment Table */}
        {isSectionVisible(formCustomization, "equipment") && (
          <DocSection
            title="EQUIPMENT"
            documentStyles={documentStyles}
            action={
              <div className="flex gap-4">
                {formData.rfpNumber && (
                  <p className="text-[13px]">
                    <span className="font-semibold">RFP #:</span> {formData.rfpNumber}
                  </p>
                )}
                {formData.contractNumber && (
                  <p className="text-[13px]">
                    <span className="font-semibold">Contract #:</span> {formData.contractNumber}
                  </p>
                )}
              </div>
            }
          >
            <table className="w-full border-collapse table-fixed text-[12px]">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-1 pb-2" style={{ width: "8%" }}>
                    Qty.
                  </th>
                  <th className="text-left py-1 pb-2" style={{ width: "22%" }}>
                    Model
                  </th>
                  <th className="text-left py-1 pb-2" style={{ width: isRental ? "70%" : "38%" }}>
                    Description
                  </th>
                  {!isRental && (
                    <th className="text-right py-1 pb-2" style={{ width: "16%" }}>
                      Retail
                    </th>
                  )}
                  {!isRental && (
                    <th className="text-right py-1 pb-2" style={{ width: "16%" }}>
                      Your Price
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {formData.equipmentDisplay !== "total_only" &&
                  formData.lineItems.map((item) => {
                    const itemMsrp = (item.msrp || 0) * item.quantity;
                    const itemPrice = (item.price || 0) * item.quantity;
                    const msrpDiffers = itemMsrp > 0 && Math.abs(itemMsrp - itemPrice) > 0.01;
                    return (
                      <tr key={item.id} className="border-b border-gray-300">
                        <td className="py-1">{item.quantity}</td>
                        <td className="py-1" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                          {item.parentLineItemId ? "" : item.model}
                        </td>
                        <td className="py-1" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                          {item.description || item.model}
                        </td>
                        {!isRental && (
                          <td className="py-1 text-right">
                            {msrpDiffers ? (
                              <span className="text-gray-400">{strikethrough("$" + formatCurrency(itemMsrp))}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        )}
                        {!isRental && <td className="py-1 text-right font-semibold">${formatCurrency(itemPrice)}</td>}
                      </tr>
                    );
                  })}
                {formData.equipmentDisplay === "total_only" && (
                  <>
                    {formData.lineItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-300">
                        <td className="py-1">{item.quantity}</td>
                        <td className="py-1" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                          {item.parentLineItemId ? "" : item.model}
                        </td>
                        <td className="py-1" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                          {item.description || item.model}
                        </td>
                        {!isRental && <td className="py-1 text-right"></td>}
                        {!isRental && <td className="py-1 text-right"></td>}
                      </tr>
                    ))}
                    {!isRental && (
                      <tr className="border-t-2 border-black">
                        <td className="py-1 font-bold" colSpan={3}>
                          Equipment Package Total
                        </td>
                        <td className="py-1 text-right">
                          {showMSRPStrikethrough && (
                            <span className="text-gray-400">{strikethrough("$" + formatCurrency(totalMSRP))}</span>
                          )}
                        </td>
                        <td className="py-1 text-right font-bold">${formatCurrency(formData.retailPrice)}</td>
                      </tr>
                    )}
                  </>
                )}
                {formData.lineItems.length === 0 && (
                  <tr>
                    <td colSpan={isRental ? 3 : 5} className="py-2 text-gray-400 text-center">
                      No equipment items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </DocSection>
        )}

        {/* Combined Pricing Table - Purchase | Lease | Service Agreement */}
        <div className="mb-4">
          <table className="w-full table-fixed border-collapse text-[13px]">
            <colgroup>
              {showPurchase && <col style={{ width: pw(_pricingWeights.purchase) }} />}
              {showPurchase && showLease && <col style={{ width: pw(_pricingWeights.or) }} />}
              {showLease && (
                <>
                  <col style={{ width: pw(_pricingWeights.term) }} />
                  <col style={{ width: pw(_pricingWeights.payment) }} />
                </>
              )}
              {hasServiceAgreement && <col style={{ width: pw(_pricingWeights.service) }} />}
            </colgroup>
            <thead>
              <tr className="border-b-2 border-black">
                {showPurchase && <th className="text-left py-1 pb-2 font-bold">YOUR TOTAL</th>}
                {showPurchase && showLease && <th className="py-1 pb-2 font-bold"></th>}
                {showLease && (
                  <th colSpan={2} className="text-left py-1 pb-2 font-bold">
                    {leaseTypeName.toUpperCase()}
                  </th>
                )}
                {hasServiceAgreement && (
                  <th className="text-left py-1 pb-2 font-bold pl-4 border-l-2 border-black">SERVICE AGREEMENT</th>
                )}
              </tr>
              <tr className="border-b border-gray-300">
                {showPurchase && <th className="text-left py-1 font-semibold text-[12px]"></th>}
                {showPurchase && showLease && <th className="text-center py-1 font-semibold text-[12px]"></th>}
                {showLease && (
                  <>
                    <th className="text-left py-1 font-semibold text-[12px]">{isRental ? "" : "TERM"}</th>
                    <th className="text-right py-1 font-semibold text-[12px] pr-3">PAYMENT</th>
                  </>
                )}
                {hasServiceAgreement && <th className="py-1 pl-4 border-l-2 border-black"></th>}
              </tr>
            </thead>
            <tbody>
              {/* First row - main values */}
              <tr className="border-b border-gray-300">
                {showPurchase && (
                  <td className="py-1 align-top" rowSpan={Math.max(formData.selectedTerms.length, 1)}>
                    <div>
                      <span className="font-bold">${formatCurrency(formData.retailPrice)}</span>
                    </div>
                    {showMSRPStrikethrough && (
                      <div>
                        <span className="text-gray-400 text-[12px]">
                          {strikethrough("Retail: $" + formatCurrency(totalMSRP))}
                        </span>
                      </div>
                    )}
                  </td>
                )}
                {showPurchase && showLease && (
                  <td
                    className="text-center py-1 align-middle font-bold text-gray-500"
                    rowSpan={Math.max(formData.selectedTerms.length, 1)}
                  >
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
                  <td
                    className="py-1 pl-4 align-top border-l-2 border-black"
                    rowSpan={Math.max(formData.selectedTerms.length, 1)}
                  >
                    {/* Service Agreement mini-table matching blue reference layout */}
                    <table className="w-full text-[12px]">
                      <tbody>
                        <tr>
                          <td className="font-bold pr-2 py-[1px]">BASE RATE</td>
                          <td className="py-[1px]">${formatCurrency(formData.serviceBaseRate)}</td>
                          <td className="text-right py-[1px]">
                            {formData.serviceBillingPeriod === "quarterly"
                              ? "PER QUARTER"
                              : formData.serviceBillingPeriod === "annual"
                                ? "PER YEAR"
                                : "PER MONTH"}
                          </td>
                        </tr>
                        {formData.serviceBillingPeriod !== "annual" && (
                          <tr>
                            <td className="font-bold pr-2 py-[1px]">ANNUAL TOTAL</td>
                            <td className="py-[1px]">
                              $
                              {formatCurrency(
                                formData.serviceBaseRate * (formData.serviceBillingPeriod === "quarterly" ? 4 : 12),
                              )}
                            </td>
                            <td className="text-right py-[1px]">PER YEAR</td>
                          </tr>
                        )}
                        {(formData.includedBWCopies > 0 || formData.includedColorCopies > 0) && (
                          <>
                            <tr>
                              <td className="font-bold pr-2 py-[1px] pt-1" rowSpan={2}>
                                INCLUDES
                              </td>
                              <td className="py-[1px] pt-1">B/W COPIES</td>
                              <td className="text-right py-[1px] pt-1">
                                {(formData.includedBWCopies ?? 0).toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-[1px]">COLOR COPIES</td>
                              <td className="text-right py-[1px]">
                                {(formData.includedColorCopies ?? 0).toLocaleString()}
                              </td>
                            </tr>
                          </>
                        )}
                        {(formData.overageBWRate > 0 || formData.overageColorRate > 0) && (
                          <>
                            <tr>
                              <td className="font-bold pr-2 py-[1px] pt-1" rowSpan={2}>
                                OVERAGES
                              </td>
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
              {showLease &&
                formData.selectedTerms.slice(1).map((term, idx) => (
                  <tr
                    key={term}
                    className={idx === formData.selectedTerms.length - 2 ? "" : "border-b border-gray-300"}
                  >
                    <td className="py-1">{term} months</td>
                    <td className="py-1 text-right font-semibold pr-3">
                      ${(getLeasePayment(term) ?? 0).toLocaleString()}/mo
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Leasing Company Info */}
        {showLease && formData.leasingCompanyId && formData.showFinancingProvider !== false && (
          <div className="mb-4 text-[12px] text-gray-600">
            <p>Financing provided by: {formData.leasingCompanyId}</p>
          </div>
        )}

        {/* Terms & Conditions */}
        {isSectionVisible(formCustomization, "termsAndConditions") &&
          (() => {
            // Pick T&C based on lease program: quote_fmv, quote_dollar_buyout, quote_rental, or default quote
            const leaseProgramKey =
              formData.leaseProgram === "fmv"
                ? "quote_fmv"
                : formData.leaseProgram === "dollar_buyout"
                  ? "quote_dollar_buyout"
                  : formData.leaseProgram === "rental"
                    ? "quote_rental"
                    : null;
            const tcText =
              (leaseProgramKey && documentTerms?.[leaseProgramKey]) || dealerInfo?.termsAndConditions || "";
            return tcText ? (
              <DocSection title="Terms & Conditions" documentStyles={documentStyles} className="text-[13px]">
                <p className="whitespace-pre-wrap">{tcText}</p>
              </DocSection>
            ) : null;
          })()}

        {/* Signature */}
        <DocSignature>
          <p className="mb-1">Sincerely,</p>
          <p className="font-semibold">{formData.preparedBy}</p>
          {formData.preparedByPhone && <p>{formData.preparedByPhone}</p>}
          {formData.preparedByEmail && <p>{formData.preparedByEmail}</p>}
        </DocSignature>

        {/* Acceptance Section */}
        {isSectionVisible(formCustomization, "acceptance") && (
          <div className="mt-4 pt-2 border-t border-gray-300" data-pdf-keep-together>
            <p className="font-bold mb-2">Accepted By:</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <div className="border-b border-black h-5"></div>
                <p className="text-[12px]">Signature</p>
              </div>
              <div>
                <div className="border-b border-black h-5"></div>
                <p className="text-[12px]">Title</p>
              </div>
              <div>
                <div className="border-b border-black h-5"></div>
                <p className="text-[12px]">Printed Name</p>
              </div>
              <div>
                <div className="border-b border-black h-5"></div>
                <p className="text-[12px]">Date</p>
              </div>
            </div>
          </div>
        )}

        {/* Confidentiality Notice */}
        <div className="mt-6 text-[12px] text-gray-500 italic">
          <p>
            Information in this proposal is confidential and intended solely for use in the procurement process and may
            not be disclosed except to persons who are involved in the evaluation of the proposal and award of the
            contract.
          </p>
        </div>
      </DocPage>
    );
  },
);

QuotePreview.displayName = "QuotePreview";
