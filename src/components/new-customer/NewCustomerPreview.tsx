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
}

export const NewCustomerPreview = forwardRef<HTMLDivElement, NewCustomerPreviewProps>(
  ({ formData, dealerInfo }, ref) => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8"
        style={{
          width: '8.5in',
          minHeight: '11in',
          fontFamily: 'Arial, sans-serif',
          fontSize: '10pt',
          lineHeight: '1.4',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b-2 border-black">
          <div>
            {dealerInfo?.logoUrl && (
              <img src={dealerInfo.logoUrl} alt="Logo" className="h-12 mb-2" />
            )}
            <div className="font-bold text-lg">{dealerInfo?.companyName || 'Company Name'}</div>
            <div className="text-xs">{dealerInfo?.address}</div>
            <div className="text-xs">{dealerInfo?.phone}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-xl">NEW CUSTOMER APPLICATION</div>
            <div className="text-xs mt-1">{today}</div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-4">
          <div className="font-bold bg-gray-200 px-2 py-1 mb-2">CUSTOMER INFORMATION</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs px-2">
            <div><span className="font-semibold">Company Legal Name:</span> {formData.companyName}</div>
            <div><span className="font-semibold">Trade Name (DBA):</span> {formData.tradeName}</div>
            <div className="col-span-2"><span className="font-semibold">Description of Business:</span> {formData.businessDescription}</div>
            <div><span className="font-semibold">Tax ID #:</span> {formData.taxId} ({formData.taxIdState})</div>
            <div><span className="font-semibold">Business Type:</span> {formData.businessType?.replace('_', ' ')}</div>
            <div><span className="font-semibold">Year Established:</span> {formData.yearEstablished}</div>
            <div><span className="font-semibold">Years Owned:</span> {formData.yearsOwned}</div>
            <div className="col-span-2"><span className="font-semibold">Credit Requested:</span> {formData.creditRequested}</div>
          </div>
        </div>

        {/* Addresses */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <div className="font-bold bg-gray-200 px-2 py-1 mb-2 text-xs">HEADQUARTERS</div>
            <div className="text-xs px-2 space-y-0.5">
              <div>{formData.hqAddress}</div>
              {formData.hqAddress2 && <div>{formData.hqAddress2}</div>}
              <div>{formData.hqCity}, {formData.hqState} {formData.hqZip}</div>
              <div>Phone: {formData.hqPhone}</div>
              {formData.hqFax && <div>Fax: {formData.hqFax}</div>}
              <div>Email: {formData.hqEmail}</div>
            </div>
          </div>
          <div>
            <div className="font-bold bg-gray-200 px-2 py-1 mb-2 text-xs">BRANCH OFFICE</div>
            <div className="text-xs px-2 space-y-0.5">
              {formData.branchSameAsHq ? (
                <div className="italic">Same as Headquarters</div>
              ) : (
                <>
                  <div>{formData.branchAddress}</div>
                  {formData.branchAddress2 && <div>{formData.branchAddress2}</div>}
                  <div>{formData.branchCity}, {formData.branchState} {formData.branchZip}</div>
                  <div>Phone: {formData.branchPhone}</div>
                  {formData.branchFax && <div>Fax: {formData.branchFax}</div>}
                  <div>Email: {formData.branchEmail}</div>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="font-bold bg-gray-200 px-2 py-1 mb-2 text-xs">BILLING OFFICE</div>
            <div className="text-xs px-2 space-y-0.5">
              {formData.billingSameAsHq ? (
                <div className="italic">Same as Headquarters</div>
              ) : formData.billingSameAsBranch ? (
                <div className="italic">Same as Branch</div>
              ) : (
                <>
                  <div>{formData.billingAddress}</div>
                  {formData.billingAddress2 && <div>{formData.billingAddress2}</div>}
                  <div>{formData.billingCity}, {formData.billingState} {formData.billingZip}</div>
                  <div>Phone: {formData.billingPhone}</div>
                  {formData.billingFax && <div>Fax: {formData.billingFax}</div>}
                  <div>Email: {formData.billingEmail}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div className="mb-4">
          <div className="font-bold bg-gray-200 px-2 py-1 mb-2">CONTACTS</div>
          <div className="grid grid-cols-3 gap-3 text-xs px-2">
            <div>
              <div className="font-semibold mb-1">Principal / Owner</div>
              <div>{formData.principalName}</div>
              <div>{formData.principalTitle}</div>
              <div>{formData.principalPhone}</div>
              <div>{formData.principalEmail}</div>
            </div>
            <div>
              <div className="font-semibold mb-1">Equipment / Meter Contact</div>
              <div>{formData.equipmentContactName}</div>
              <div>{formData.equipmentContactTitle}</div>
              <div>{formData.equipmentContactPhone}</div>
              <div>{formData.equipmentContactEmail}</div>
            </div>
            <div>
              <div className="font-semibold mb-1">Accounts Payable</div>
              <div>{formData.apContactName}</div>
              <div>{formData.apContactTitle}</div>
              <div>{formData.apContactPhone}</div>
              <div>{formData.apContactEmail}</div>
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="mb-4">
          <div className="font-bold bg-gray-200 px-2 py-1 mb-2">INTERESTS</div>
          <div className="text-xs px-2 flex gap-4">
            {formData.interestOfficeMachines && <span>☑ Office Machines</span>}
            {formData.interestFurniture && <span>☑ Furniture</span>}
            {formData.interestSupplies && <span>☑ Supplies</span>}
            {formData.interestOther && <span>☑ Other: {formData.interestOther}</span>}
          </div>
        </div>

        {/* References */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <div className="font-bold bg-gray-200 px-2 py-1 mb-2 text-xs">BANK REFERENCES</div>
            {formData.bankReferences.map((ref, i) => (
              <div key={ref.id} className="text-xs px-2 mb-2">
                <div className="font-semibold">{i + 1}. {ref.bankName || '________________________'}</div>
                <div>Address: {ref.address || '________________________'}</div>
                <div>{ref.cityStZip || '________________________'}</div>
                <div>Contact: {ref.contact || '________'} | Phone: {ref.phone || '________'}</div>
                <div>Account #: {ref.accountNumber || '________________________'}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="font-bold bg-gray-200 px-2 py-1 mb-2 text-xs">BUSINESS REFERENCES</div>
            {formData.businessReferences.map((ref, i) => (
              <div key={ref.id} className="text-xs px-2 mb-2">
                <div className="font-semibold">{i + 1}. {ref.company || '________________________'}</div>
                <div>Contact: {ref.contact || '________'} | Title: {ref.title || '________'}</div>
                <div>Phone: {ref.phone || '________'}</div>
                <div>Email: {ref.email || '________________________'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoicing & Payment */}
        <div className="mb-4">
          <div className="font-bold bg-gray-200 px-2 py-1 mb-2">INVOICING & PAYMENT</div>
          <div className="text-xs px-2 grid grid-cols-2 gap-4">
            <div>
              <div><span className="font-semibold">Invoice Delivery:</span> {formData.invoiceDelivery}</div>
              <div><span className="font-semibold">Invoice Email:</span> {formData.invoiceEmail}</div>
              {formData.invoiceSecondaryEmail && <div><span className="font-semibold">Secondary Email:</span> {formData.invoiceSecondaryEmail}</div>}
            </div>
            <div>
              <div className="font-semibold">Preferred Payment Method:</div>
              <div className="flex gap-4 mt-1">
                <span>{formData.paymentMethod === 'check' ? '☑' : '☐'} Check</span>
                <span>{formData.paymentMethod === 'credit_card' ? '☑' : '☐'} Credit Card</span>
                <span>{formData.paymentMethod === 'eft_ach' ? '☑' : '☐'} EFT/ACH</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Signature */}
        <div className="mt-6 pt-4 border-t border-gray-400">
          <div className="text-xs mb-4">
            I certify that all information provided in this application is true and complete. I authorize 
            {dealerInfo?.companyName ? ` ${dealerInfo.companyName}` : ' the company'} to verify the information 
            provided and to obtain credit reports as necessary. I understand that this application does not 
            guarantee the extension of credit.
          </div>
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div>
              <div className="border-b border-black mb-1 h-8"></div>
              <div className="text-xs">Authorized Signature</div>
            </div>
            <div>
              <div className="border-b border-black mb-1 h-8"></div>
              <div className="text-xs">Date</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 mt-4">
            <div>
              <div className="border-b border-black mb-1 h-8"></div>
              <div className="text-xs">Print Name</div>
            </div>
            <div>
              <div className="border-b border-black mb-1 h-8"></div>
              <div className="text-xs">Title</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

NewCustomerPreview.displayName = 'NewCustomerPreview';
