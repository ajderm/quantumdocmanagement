import { forwardRef } from 'react';
import type { InterterritorialFormData } from './InterterritorialForm';
import { format } from 'date-fns';

interface InterterritorialPreviewProps {
  formData: InterterritorialFormData;
  dealerInfo?: {
    companyName: string;
    address: string;
    phone: string;
    website: string;
    logoUrl?: string;
  };
  termsAndConditions?: string;
}

export const InterterritorialPreview = forwardRef<HTMLDivElement, InterterritorialPreviewProps>(
  ({ formData, dealerInfo, termsAndConditions }, ref) => {
    const calculateTotalFee = () => {
      return formData.equipmentItems.reduce((sum, item) => sum + (item.fee || 0), 0);
    };

    const formatCurrency = (value: number) => {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 min-h-[11in] w-[8.5in] text-[10px] leading-tight"
        style={{ fontFamily: 'Arial, sans-serif' }}
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
                <p className="font-bold text-[9px]">{dealerInfo.companyName}</p>
                <p className="text-[8px]">{dealerInfo.address}</p>
                <p className="text-[8px]">{dealerInfo.phone}</p>
                <p className="text-[8px]">{dealerInfo.website}</p>
              </>
            )}
          </div>

          {/* Right - Title and Date */}
          <div className="text-right">
            <p className="font-bold text-[12px] mb-1">INTERTERRITORIAL EQUIPMENT</p>
            <p className="font-bold text-[12px] mb-2">PLACEMENT REQUEST</p>
            <p className="text-[9px]">
              <span className="font-bold">Requested Install Date: </span>
              {formData.requestedInstallDate 
                ? format(formData.requestedInstallDate, 'MM/dd/yyyy')
                : '_____________'}
            </p>
          </div>
        </div>

        {/* Coordinator Info Header */}
        <div className="mb-2">
          <p className="font-bold text-[9px] border-b-2 border-black pb-1">INTERTERRITORIAL COORDINATOR INFORMATION</p>
        </div>

        {/* Three-Column Dealer Section */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          {/* Originating Dealer */}
          <div>
            <p className="font-bold text-[9px] border-b-2 border-black pb-1 mb-1">ORIGINATING DEALER</p>
            <table className="w-full text-[8px]">
              <tbody>
                <tr><td className="font-bold w-12">Name:</td><td>{formData.originatingName}</td></tr>
                <tr><td className="font-bold">Bill To:</td><td className="break-words">{formData.originatingBillTo}</td></tr>
                <tr><td className="font-bold">Phone:</td><td>{formData.originatingPhone}</td></tr>
                <tr><td className="font-bold">ATTN:</td><td>{formData.originatingAttn}</td></tr>
                <tr><td className="font-bold">Email:</td><td className="break-all text-[7px]">{formData.originatingEmail}</td></tr>
                <tr><td className="font-bold">CCA:</td><td>{formData.originatingCca}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Installing Dealer */}
          <div>
            <p className="font-bold text-[9px] border-b-2 border-black pb-1 mb-1">INSTALLING DEALER</p>
            <table className="w-full text-[8px]">
              <tbody>
                <tr><td className="font-bold w-12">Name:</td><td>{formData.installingName || '_____'}</td></tr>
                <tr><td className="font-bold">Address:</td><td className="break-words">{formData.installingAddress || '_____'}</td></tr>
                <tr><td className="font-bold">Phone:</td><td>{formData.installingPhone || '_____'}</td></tr>
                <tr><td className="font-bold">ATTN:</td><td>{formData.installingAttn || '_____'}</td></tr>
                <tr><td className="font-bold">Email:</td><td className="break-all text-[7px]">{formData.installingEmail || '_____'}</td></tr>
                <tr><td className="font-bold">CCA:</td><td>{formData.installingCca || '_____'}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Customer Installed To */}
          <div>
            <p className="font-bold text-[9px] border-b-2 border-black pb-1 mb-1">CUSTOMER INSTALLED TO</p>
            <table className="w-full text-[8px]">
              <tbody>
                <tr><td className="font-bold w-12">Name:</td><td>{formData.customerName}</td></tr>
                <tr><td className="font-bold">Address:</td><td className="break-words">{formData.customerAddress}</td></tr>
                <tr><td className="font-bold">Phone:</td><td>{formData.customerPhone}</td></tr>
                <tr><td className="font-bold">ATTN:</td><td>{formData.customerAttn || '_____'}</td></tr>
                <tr><td className="font-bold">Email:</td><td className="break-all text-[7px]">{formData.customerEmail || '_____'}</td></tr>
                <tr><td className="font-bold">Fax:</td><td>{formData.customerFax || '_____'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Equipment To Be Installed */}
        <div className="mb-3">
          <p className="font-bold text-[9px] border-b-2 border-black pb-1 mb-1">EQUIPMENT TO BE INSTALLED</p>
          <table className="w-full text-[8px]">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-1 w-8">Qty.</th>
                <th className="text-left py-1 w-28">Vendor Product Code</th>
                <th className="text-left py-1">Description</th>
                <th className="text-right py-1 w-16">Price</th>
                <th className="text-right py-1 w-16">Cost</th>
                <th className="text-right py-1 w-16">Fee</th>
              </tr>
            </thead>
            <tbody>
              {formData.equipmentItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-300">
                  <td className="py-1">{item.qty}</td>
                  <td className="py-1">{item.vendorProductCode}</td>
                  <td className="py-1">{item.description}</td>
                  <td className="py-1 text-right">${formatCurrency(item.price)}</td>
                  <td className="py-1 text-right">${formatCurrency(item.cost)}</td>
                  <td className="py-1 text-right">${formatCurrency(item.fee)}</td>
                </tr>
              ))}
              {formData.equipmentItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-2 text-center text-gray-500">No equipment items</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="pt-1 text-right font-bold text-[9px] border-t border-black mt-1">
            TOTAL AMOUNT BILLED TO {formData.installingName || '[Installing Dealer]'}: ${formatCurrency(calculateTotalFee())}
          </div>
        </div>

        {/* Service Agreement & Removal Equipment Side by Side */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          {/* Service Agreement */}
          <div>
            <p className="font-bold text-[9px] border-b-2 border-black pb-1 mb-1">SERVICE AGREEMENT</p>
            <table className="w-full text-[8px]">
              <tbody>
                <tr><td className="font-bold">Base Charge:</td><td>${formData.serviceBaseCharge || '0.00'}</td></tr>
                <tr><td className="font-bold">Includes:</td><td>{formData.serviceIncludes || '_____'}</td></tr>
                <tr><td className="font-bold">CPC/Ovg (Black):</td><td>${formData.serviceOverageBW || '0.0000'}</td></tr>
                <tr><td className="font-bold">CPC/Ovg (Color):</td><td>${formData.serviceOverageColor || '0.0000'}</td></tr>
                <tr><td className="font-bold">Frequency:</td><td>{formData.serviceFrequency || 'Monthly'}</td></tr>
                <tr><td className="font-bold">Bill To:</td><td>{formData.serviceBillTo || 'Originating Dealer'}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Removal Equipment */}
          <div>
            <p className="font-bold text-[9px] border-b-2 border-black pb-1 mb-1">REMOVAL EQUIPMENT</p>
            {formData.removalEquipment.length === 0 ? (
              <p className="text-[8px] text-gray-500 text-center py-2">No removal equipment</p>
            ) : (
              <div className="space-y-1">
                <table className="w-full text-[7px]">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-0.5 w-6">Qty</th>
                      <th className="text-left py-0.5">Description</th>
                      <th className="text-left py-0.5 w-14">Serial</th>
                      <th className="text-left py-0.5 w-12">Meters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.removalEquipment.map((item) => (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="py-0.5">{item.qty}</td>
                        <td className="py-0.5">{item.description}</td>
                        <td className="py-0.5">{item.serial}</td>
                        <td className="py-0.5">{item.meters}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {formData.removalEquipment.some(item => item.instructions) && (
                  <div className="mt-1 pt-1 border-t border-gray-300">
                    <p className="font-bold text-[7px]">Instructions:</p>
                    {formData.removalEquipment.filter(item => item.instructions).map((item) => (
                      <p key={item.id} className="text-[7px]">• {item.instructions}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Terms and Conditions */}
        {termsAndConditions && (
          <div className="mb-3">
            <p className="font-bold text-[9px] border-b-2 border-black pb-1 mb-1">ACCEPTANCE OF TERMS</p>
            <p className="text-[7px] whitespace-pre-wrap">{termsAndConditions}</p>
          </div>
        )}

        {/* Signature Section */}
        <div className="mt-4">
          <p className="font-bold text-[9px] border-b-2 border-black pb-1 mb-3">INSTALLING DEALER SIGNATURE</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[8px] font-bold">Installing Dealer:</span>
                  <div className="flex-1 border-b border-black h-5"></div>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[8px] font-bold">Printed Name:</span>
                  <div className="flex-1 border-b border-black h-5"></div>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[8px] font-bold">Signature:</span>
                  <span className="text-[8px]">X</span>
                  <div className="flex-1 border-b border-black h-5"></div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[8px] font-bold">Dealer Number:</span>
                  <div className="flex-1 border-b border-black h-5">
                    <span className="text-[8px]">{formData.installingDealerNumber || ''}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[8px] font-bold">Title:</span>
                  <div className="flex-1 border-b border-black h-5"></div>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[8px] font-bold">Date:</span>
                  <div className="flex-1 border-b border-black h-5"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InterterritorialPreview.displayName = 'InterterritorialPreview';