import { forwardRef } from 'react';
import type { InstallationFormData } from './InstallationForm';

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
}

export const InstallationPreview = forwardRef<HTMLDivElement, InstallationPreviewProps>(
  ({ formData, dealerInfo, removalReceiptTerms, deliveryAcceptanceTerms }, ref) => {
    const getEffectiveCustomerNumber = () => {
      return formData.customerNumberOverride || formData.customerNumber || '';
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

          {/* Right - Installation Report */}
          <div className="border border-black p-2 w-48">
            <p className="font-bold text-center mb-1 border-b border-black pb-1">INSTALLATION REPORT</p>
            <table className="w-full text-[8px]">
              <tbody>
                <tr>
                  <td className="font-bold pr-1">METER COUNTS</td>
                  <td></td>
                </tr>
                <tr>
                  <td className="pl-2">Black:</td>
                  <td>{formData.meterBlack || '_____'}</td>
                </tr>
                <tr>
                  <td className="pl-2">Color:</td>
                  <td>{formData.meterColor || '_____'}</td>
                </tr>
                <tr>
                  <td className="pl-2">Total:</td>
                  <td>{formData.meterTotal || '_____'}</td>
                </tr>
                <tr><td colSpan={2} className="h-1"></td></tr>
                <tr>
                  <td className="font-bold">ID NUMBER</td>
                  <td>{formData.idNumber || '_____'}</td>
                </tr>
                <tr>
                  <td className="font-bold">CUSTOMER #</td>
                  <td>{getEffectiveCustomerNumber() || '_____'}</td>
                </tr>
                <tr>
                  <td className="font-bold">SALES REP</td>
                  <td>{formData.salesRep || '_____'}</td>
                </tr>
                <tr>
                  <td className="font-bold">METER METHOD</td>
                  <td>{formData.meterMethod || '_____'}</td>
                </tr>
                <tr>
                  <td className="font-bold">CCA</td>
                  <td>{formData.cca || '_____'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Ship To / Bill To */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-black p-2">
            <p className="font-bold text-[9px] mb-1 border-b border-black pb-1">CUSTOMER SHIP TO</p>
            <table className="w-full text-[8px]">
              <tbody>
                <tr><td className="font-bold w-16">Company:</td><td>{formData.shipToCompany}</td></tr>
                <tr><td className="font-bold">Dept:</td><td>{formData.shipToDept}</td></tr>
                <tr><td className="font-bold">Address:</td><td>{formData.shipToAddress}</td></tr>
                <tr><td className="font-bold">City/St/Zip:</td><td>{formData.shipToCity}, {formData.shipToState} {formData.shipToZip}</td></tr>
                <tr><td className="font-bold">ATTN:</td><td>{formData.shipToAttn}</td></tr>
                <tr><td className="font-bold">Phone:</td><td>{formData.shipToPhone}</td></tr>
                <tr><td className="font-bold">Email:</td><td>{formData.shipToEmail}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="border border-black p-2">
            <p className="font-bold text-[9px] mb-1 border-b border-black pb-1">CUSTOMER BILL TO</p>
            <table className="w-full text-[8px]">
              <tbody>
                <tr><td className="font-bold w-16">Company:</td><td>{formData.billToCompany}</td></tr>
                <tr><td className="font-bold">Dept:</td><td>{formData.billToDept}</td></tr>
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
          <p className="font-bold text-[9px] mb-1">EQUIPMENT (INSTALLED)</p>
          <table className="w-full border-collapse text-[8px]">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-1 w-10">Qty</th>
                <th className="text-left py-1 w-24">Model</th>
                <th className="text-left py-1">Description</th>
                <th className="text-left py-1 w-24">Serial #</th>
                <th className="text-left py-1 w-24">MAC Address</th>
                <th className="text-left py-1 w-20">IP Address</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1">{formData.installedQty}</td>
                <td className="py-1">{formData.installedModel}</td>
                <td className="py-1">{formData.installedDescription}</td>
                <td className="py-1">{formData.installedSerial}</td>
                <td className="py-1">{formData.installedMacAddress}</td>
                <td className="py-1">{formData.installedIpAddress}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Networking & Additional Contacts - Side by Side */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-black p-2">
            <p className="font-bold text-[9px] mb-1 border-b border-black pb-1">NETWORKING</p>
            <table className="w-full text-[8px]">
              <tbody>
                <tr><td className="font-bold w-28">Dealer Setup Print:</td><td>{formData.dealerSetupPrint || '____'}</td></tr>
                <tr><td className="font-bold">Dealer Setup Scan:</td><td>{formData.dealerSetupScan || '____'}</td></tr>
                <tr><td className="font-bold">Windows Computers:</td><td>{formData.windowsComputers || '____'}</td></tr>
                <tr><td className="font-bold">Mac Computers:</td><td>{formData.macComputers || '____'}</td></tr>
                <tr><td className="font-bold">USB Print:</td><td>{formData.usbPrint || '____'}</td></tr>
                <tr><td className="font-bold">Mobile Print:</td><td>{formData.mobilePrint || '____'}</td></tr>
                <tr><td className="font-bold">Email Assigned:</td><td>{formData.emailAssigned || '____'}</td></tr>
                <tr><td className="font-bold">Password:</td><td>{formData.emailPassword || '____'}</td></tr>
                <tr><td className="font-bold">Network Time IN:</td><td>{formData.networkTimeIn || '____'}</td></tr>
                <tr><td className="font-bold">Network Time OUT:</td><td>{formData.networkTimeOut || '____'}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="border border-black p-2">
            <p className="font-bold text-[9px] mb-1 border-b border-black pb-1">ADDITIONAL CONTACTS</p>
            <table className="w-full text-[8px]">
              <tbody>
                <tr><td colSpan={2} className="font-bold pt-1">IT Contact:</td></tr>
                <tr><td className="pl-2 w-16">Name:</td><td>{formData.itContactName}</td></tr>
                <tr><td className="pl-2">Phone:</td><td>{formData.itContactPhone}</td></tr>
                <tr><td className="pl-2">Email:</td><td>{formData.itContactEmail}</td></tr>
                <tr><td colSpan={2} className="font-bold pt-2">Meter Contact:</td></tr>
                <tr><td className="pl-2">Name:</td><td>{formData.meterContactName}</td></tr>
                <tr><td className="pl-2">Phone:</td><td>{formData.meterContactPhone}</td></tr>
                <tr><td className="pl-2">Email:</td><td>{formData.meterContactEmail}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Equipment Removed */}
        {formData.removedEquipment.length > 0 && (
          <div className="mb-4">
            <p className="font-bold text-[9px] mb-1">EQUIPMENT (REMOVED)</p>
            <table className="w-full border-collapse text-[8px]">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left py-1 w-8">Qty</th>
                  <th className="text-left py-1 w-16">Item #</th>
                  <th className="text-left py-1">Make/Model/Description</th>
                  <th className="text-left py-1 w-20">Serial</th>
                  <th className="text-left py-1 w-16">Meter(BW)</th>
                  <th className="text-left py-1 w-16">Meter(COL)</th>
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
            <p className="font-bold text-[9px] mb-1">REMOVAL INSTRUCTIONS</p>
            <p className="text-[8px] whitespace-pre-wrap border border-black p-2">{formData.removalInstructions}</p>
          </div>
        )}

        {/* Removal Receipt T&C */}
        {removalReceiptTerms && (
          <div className="mb-4">
            <p className="font-bold text-[9px] mb-1">REMOVAL RECEIPT</p>
            <p className="text-[7px] whitespace-pre-wrap mb-2">{removalReceiptTerms}</p>
            <div className="flex gap-8">
              <div className="flex-1">
                <div className="border-b border-black h-4 mb-1"></div>
                <p className="text-[7px]">Customer Initial</p>
              </div>
              <div className="flex-1">
                <div className="border-b border-black h-4 mb-1"></div>
                <p className="text-[7px]">Date</p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery and Acceptance T&C */}
        {deliveryAcceptanceTerms && (
          <div className="mb-4">
            <p className="font-bold text-[9px] mb-1">DELIVERY AND ACCEPTANCE</p>
            <p className="text-[7px] whitespace-pre-wrap mb-2">{deliveryAcceptanceTerms}</p>
            <div className="flex gap-8">
              <div className="flex-1">
                <div className="border-b border-black h-4 mb-1"></div>
                <p className="text-[7px]">Customer Initial</p>
              </div>
              <div className="flex-1">
                <div className="border-b border-black h-4 mb-1"></div>
                <p className="text-[7px]">Date</p>
              </div>
            </div>
          </div>
        )}

        {/* Signature Section */}
        <div className="mt-6 pt-4 border-t border-black">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-black h-6 mb-1"></div>
              <p className="text-[8px]">Customer Signature</p>
            </div>
            <div>
              <div className="border-b border-black h-6 mb-1"></div>
              <p className="text-[8px]">Date</p>
            </div>
            <div>
              <div className="border-b border-black h-6 mb-1"></div>
              <p className="text-[8px]">Printed Name</p>
            </div>
            <div>
              <div className="border-b border-black h-6 mb-1"></div>
              <p className="text-[8px]">Title</p>
            </div>
          </div>
        </div>

        {/* Technician Section */}
        <div className="mt-4 pt-4 border-t border-black">
          <p className="font-bold text-[9px] mb-2">TECHNICIAN</p>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-black h-6 mb-1"></div>
              <p className="text-[8px]">Technician Signature</p>
            </div>
            <div>
              <div className="border-b border-black h-6 mb-1"></div>
              <p className="text-[8px]">Date</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InstallationPreview.displayName = 'InstallationPreview';
