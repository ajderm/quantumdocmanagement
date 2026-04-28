import { forwardRef } from 'react';
import { NewCustomerFormData } from './NewCustomerForm';

interface NewCustomerPreviewProps {
  formData: NewCustomerFormData;
  dealerInfo?: {
    companyName: string;
    address: string;
    phone: string;
    logoUrl?: string;
  };
  termsAndConditions?: string;
  documentStyles?: { fontFamily?: string; fontColor?: string; tableBorderColor?: string; tableLineColor?: string; };
}

const DEFAULT_TERMS = `TERMS OF SALE: Net 30 Days. A service charge of 1.5% per month (18% per annum) will be applied to all past due balances. In the event collection efforts are required, buyer agrees to pay all costs of collection including reasonable attorney fees.

CREDIT AUTHORIZATION: The undersigned authorizes the company to make whatever credit inquiries it deems necessary in connection with this credit application or any update, renewal, or extension of credit. The undersigned certifies that the information provided is true and complete and is given to induce credit to be extended.`;

export const NewCustomerPreview = forwardRef<HTMLDivElement, NewCustomerPreviewProps>(
  ({ formData, dealerInfo, termsAndConditions, documentStyles }, ref) => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const termsText = termsAndConditions || DEFAULT_TERMS;

    const businessTypeLabel = formData.businessType ? formData.businessType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';

    return (
      <div
        ref={ref}
        className="bg-white p-8 text-[14px] leading-tight"
        style={{
          width: '8.5in',
          minHeight: '11in',
          fontFamily: documentStyles?.fontFamily || 'Arial, sans-serif',
          color: documentStyles?.fontColor || '#000000',
        }}
      >
        {/* Header */}
        <table className="w-full border-collapse mb-4">
          <tbody>
            <tr>
              <td className="align-top w-1/2">
                {dealerInfo?.logoUrl && (
                  <img src={dealerInfo.logoUrl} alt="Logo" className="h-10 mb-1" />
                )}
                <div className="font-bold text-[12px]">{dealerInfo?.companyName || 'Company Name'}</div>
                <div className="text-[10px]">{dealerInfo?.address}</div>
                <div className="text-[10px]">{dealerInfo?.phone}</div>
              </td>
              <td className="align-top text-right">
                <div className="font-bold text-[14px]">NEW CUSTOMER APPLICATION</div>
                <div className="text-[10px] mt-1">{today}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Customer Information */}
        <table className="w-full border-collapse text-[10px] mb-3">
          <thead>
            <tr className="border-b-2 border-black">
              <th colSpan={4} className="text-left py-1 pb-2 font-bold text-[14px]">CUSTOMER INFORMATION</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1 pr-2 font-semibold w-[15%]">Company Legal Name:</td>
              <td className="py-1 pr-4 w-[35%]">{formData.companyName}</td>
              <td className="py-1 pr-2 font-semibold w-[15%]">Trade Name (DBA):</td>
              <td className="py-1 w-[35%]">{formData.tradeName}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">Description of Business:</td>
              <td colSpan={3} className="py-1">{formData.businessDescription}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">Tax ID #:</td>
              <td className="py-1 pr-4">{formData.taxId} {formData.taxIdState ? `(${formData.taxIdState})` : ''}</td>
              <td className="py-1 pr-2 font-semibold">Business Type:</td>
              <td className="py-1">{businessTypeLabel}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">Year Established:</td>
              <td className="py-1 pr-4">{formData.yearEstablished}</td>
              <td className="py-1 pr-2 font-semibold">Years Owned:</td>
              <td className="py-1">{formData.yearsOwned}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">Credit Requested:</td>
              <td colSpan={3} className="py-1">{formData.creditRequested}</td>
            </tr>
          </tbody>
        </table>

        {/* Addresses - Three Column Layout */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {/* Headquarters */}
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 pb-2 font-bold text-[14px]">HEADQUARTERS</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="py-0.5">{formData.hqAddress}</td></tr>
              {formData.hqAddress2 && <tr><td className="py-0.5">{formData.hqAddress2}</td></tr>}
              <tr><td className="py-0.5">{formData.hqCity}, {formData.hqState} {formData.hqZip}</td></tr>
              <tr><td className="py-0.5">Phone: {formData.hqPhone}</td></tr>
              {formData.hqFax && <tr><td className="py-0.5">Fax: {formData.hqFax}</td></tr>}
              <tr><td className="py-0.5">Email: {formData.hqEmail}</td></tr>
            </tbody>
          </table>

          {/* Branch */}
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 pb-2 font-bold text-[14px]">BRANCH OFFICE</th>
              </tr>
            </thead>
            <tbody>
              {formData.branchSameAsHq ? (
                <tr><td className="py-0.5 italic">Same as Headquarters</td></tr>
              ) : (
                <>
                  <tr><td className="py-0.5">{formData.branchAddress}</td></tr>
                  {formData.branchAddress2 && <tr><td className="py-0.5">{formData.branchAddress2}</td></tr>}
                  <tr><td className="py-0.5">{formData.branchCity}, {formData.branchState} {formData.branchZip}</td></tr>
                  <tr><td className="py-0.5">Phone: {formData.branchPhone}</td></tr>
                  {formData.branchFax && <tr><td className="py-0.5">Fax: {formData.branchFax}</td></tr>}
                  <tr><td className="py-0.5">Email: {formData.branchEmail}</td></tr>
                </>
              )}
            </tbody>
          </table>

          {/* Billing */}
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 pb-2 font-bold text-[14px]">BILLING OFFICE</th>
              </tr>
            </thead>
            <tbody>
              {formData.billingSameAsHq ? (
                <tr><td className="py-0.5 italic">Same as Headquarters</td></tr>
              ) : formData.billingSameAsBranch ? (
                <tr><td className="py-0.5 italic">Same as Branch</td></tr>
              ) : (
                <>
                  <tr><td className="py-0.5">{formData.billingAddress}</td></tr>
                  {formData.billingAddress2 && <tr><td className="py-0.5">{formData.billingAddress2}</td></tr>}
                  <tr><td className="py-0.5">{formData.billingCity}, {formData.billingState} {formData.billingZip}</td></tr>
                  <tr><td className="py-0.5">Phone: {formData.billingPhone}</td></tr>
                  {formData.billingFax && <tr><td className="py-0.5">Fax: {formData.billingFax}</td></tr>}
                  <tr><td className="py-0.5">Email: {formData.billingEmail}</td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Contacts */}
        <table className="w-full border-collapse text-[10px] mb-3">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1 pb-2 font-bold text-[14px] w-1/3">PRINCIPAL / OWNER</th>
              <th className="text-left py-1 pb-2 font-bold text-[14px] w-1/3">EQUIPMENT / METER CONTACT</th>
              <th className="text-left py-1 pb-2 font-bold text-[14px] w-1/3">ACCOUNTS PAYABLE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-0.5 align-top">
                <div>{formData.principalName}</div>
                <div>{formData.principalTitle}</div>
                <div>{formData.principalPhone}</div>
                <div>{formData.principalEmail}</div>
              </td>
              <td className="py-0.5 align-top">
                <div>{formData.equipmentContactName}</div>
                <div>{formData.equipmentContactTitle}</div>
                <div>{formData.equipmentContactPhone}</div>
                <div>{formData.equipmentContactEmail}</div>
              </td>
              <td className="py-0.5 align-top">
                <div>{formData.apContactName}</div>
                <div>{formData.apContactTitle}</div>
                <div>{formData.apContactPhone}</div>
                <div>{formData.apContactEmail}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Interests */}
        <table className="w-full border-collapse text-[10px] mb-3">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1 pb-2 font-bold text-[14px]">INTERESTS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1">
                <span className="mr-4">{formData.interestOfficeMachines ? '☑' : '☐'} Office Machines</span>
                <span className="mr-4">{formData.interestFurniture ? '☑' : '☐'} Furniture</span>
                <span className="mr-4">{formData.interestSupplies ? '☑' : '☐'} Supplies</span>
                {formData.interestOther && <span>☑ Other: {formData.interestOther}</span>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* References - Two Column Layout */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          {/* Bank References */}
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 pb-2 font-bold text-[14px]">BANK REFERENCES</th>
              </tr>
            </thead>
            <tbody>
              {formData.bankReferences.map((ref, i) => (
                <tr key={ref.id}>
                  <td className="py-1">
                    <div className="font-semibold">{i + 1}. {ref.bankName || '________________________'}</div>
                    <div>Address: {ref.address || '________________________'}</div>
                    <div>{ref.cityStZip || '________________________'}</div>
                    <div>Contact: {ref.contact || '________'} | Phone: {ref.phone || '________'}</div>
                    <div>Account #: {ref.accountNumber || '________________________'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Business References */}
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 pb-2 font-bold text-[14px]">BUSINESS REFERENCES</th>
              </tr>
            </thead>
            <tbody>
              {formData.businessReferences.map((ref, i) => (
                <tr key={ref.id}>
                  <td className="py-1">
                    <div className="font-semibold">{i + 1}. {ref.company || '________________________'}</div>
                    <div>Contact: {ref.contact || '________'} | Title: {ref.title || '________'}</div>
                    <div>Phone: {ref.phone || '________'}</div>
                    <div>Email: {ref.email || '________________________'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoicing & Payment */}
        <table className="w-full border-collapse text-[10px] mb-3">
          <thead>
            <tr className="border-b-2 border-black">
              <th colSpan={2} className="text-left py-1 pb-2 font-bold text-[14px]">INVOICING & PAYMENT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1 w-1/2 align-top">
                <div><span className="font-semibold">Invoice Delivery:</span> {formData.invoiceDelivery}</div>
                <div><span className="font-semibold">Invoice Email:</span> {formData.invoiceEmail}</div>
                {formData.invoiceSecondaryEmail && <div><span className="font-semibold">Secondary Email:</span> {formData.invoiceSecondaryEmail}</div>}
              </td>
              <td className="py-1 w-1/2 align-top">
                <div className="font-semibold mb-1">Preferred Payment Method:</div>
                <div>
                  <span className="mr-4">{formData.paymentMethod === 'check' ? '☑' : '☐'} Check</span>
                  <span className="mr-4">{formData.paymentMethod === 'credit_card' ? '☑' : '☐'} Credit Card</span>
                  <span>{formData.paymentMethod === 'eft_ach' ? '☑' : '☐'} EFT/ACH</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Terms & Conditions */}
        <table className="w-full border-collapse text-[10px] mb-3">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1 pb-2 font-bold text-[14px]">TERMS & CONDITIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 whitespace-pre-wrap">{termsText}</td>
            </tr>
          </tbody>
        </table>

        {/* Acknowledgement & Authorization */}
        <table className="w-full border-collapse text-[10px] mb-4">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1 pb-2 font-bold text-[14px]">ACKNOWLEDGEMENT & AUTHORIZATION</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2">
                I certify that all information provided in this application is true and complete to the best of my knowledge. 
                I authorize {dealerInfo?.companyName ? dealerInfo.companyName : 'the company'} and its agents to verify the 
                information provided herein and to obtain credit reports and make any credit inquiries deemed necessary in 
                connection with this credit application or any update, renewal, or extension of credit. I understand that 
                this application does not guarantee the extension of credit and that credit terms are subject to approval.
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signature Block */}
        <table className="w-full border-collapse text-[10px] border-t-2 border-black pt-4">
          <tbody>
            <tr>
              <td className="pt-6 pr-4 w-1/2">
                <div className="border-b border-black h-6"></div>
                <div className="pt-1">Authorized Signature</div>
              </td>
              <td className="pt-6 w-1/2">
                <div className="border-b border-black h-6"></div>
                <div className="pt-1">Date</div>
              </td>
            </tr>
            <tr>
              <td className="pt-4 pr-4">
                <div className="border-b border-black h-6"></div>
                <div className="pt-1">Print Name</div>
              </td>
              <td className="pt-4">
                <div className="border-b border-black h-6"></div>
                <div className="pt-1">Title</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
);

NewCustomerPreview.displayName = 'NewCustomerPreview';
