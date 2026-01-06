import React, { forwardRef } from 'react';
import { RelocationFormData } from './RelocationForm';
import { format } from 'date-fns';

interface DealerInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  logoUrl?: string;
}

interface RelocationPreviewProps {
  formData: RelocationFormData;
  dealerInfo?: DealerInfo;
}

const RelocationPreview = forwardRef<HTMLDivElement, RelocationPreviewProps>(({ formData, dealerInfo }, ref) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'MM/dd/yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      ref={ref}
      className="bg-white text-black p-6 text-[10px] leading-tight"
      style={{ width: '8.5in', minHeight: '11in', fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-4">
          {dealerInfo?.logoUrl && (
            <img
              src={dealerInfo.logoUrl}
              alt="Dealer Logo"
              className="h-12 object-contain"
            />
          )}
          <div className="text-[9px]">
            <div className="font-bold">{dealerInfo?.name || 'Dealer Name'}</div>
            <div>{dealerInfo?.address || ''}</div>
            <div>
              {[dealerInfo?.city, dealerInfo?.state, dealerInfo?.zip].filter(Boolean).join(', ')}
            </div>
            <div>{dealerInfo?.phone || ''}</div>
            <div>{dealerInfo?.website || ''}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">RELOCATION REQUEST</div>
        </div>
      </div>

      {/* Customer Information Section */}
      <table className="w-full border-collapse text-[9px] mb-4">
        <thead>
          <tr className="border-b-2 border-black">
            <th colSpan={4} className="text-left py-1 pb-2 font-bold text-[10px]">CUSTOMER INFORMATION</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1 font-semibold w-[15%]">Date:</td>
            <td className="py-1 w-[35%]">{formatDate(formData.date)}</td>
            <td className="py-1 font-semibold w-[15%]">Bill to:</td>
            <td className="py-1 w-[35%]"></td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Company:</td>
            <td className="py-1">{formData.companyName}</td>
            <td className="py-1 font-semibold">Address:</td>
            <td className="py-1">{formData.billToAddress}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Submitted by:</td>
            <td className="py-1">{formData.submittedBy}</td>
            <td className="py-1 font-semibold">City, ST. Zip:</td>
            <td className="py-1">{formData.billToCityStZip}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Title:</td>
            <td className="py-1">{formData.submittedByTitle}</td>
            <td className="py-1 font-semibold">Phone:</td>
            <td className="py-1">{formData.billToPhone}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Requested Date:</td>
            <td className="py-1">{formatDate(formData.requestedDate)}</td>
            <td className="py-1 font-semibold">Email:</td>
            <td className="py-1">{formData.billToEmail}</td>
          </tr>
        </tbody>
      </table>

      {/* Current Location Section */}
      <table className="w-full border-collapse text-[9px] mb-4">
        <thead>
          <tr className="border-b-2 border-black">
            <th colSpan={4} className="text-left py-1 pb-2 font-bold text-[10px]">CURRENT LOCATION</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1 font-semibold w-[15%]">Company Name:</td>
            <td className="py-1 w-[35%]">{formData.currentCompanyName}</td>
            <td className="py-1 font-semibold w-[15%]">Contact:</td>
            <td className="py-1 w-[35%]">{formData.currentContact}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Address:</td>
            <td className="py-1">{formData.currentAddress}</td>
            <td className="py-1 font-semibold">Department:</td>
            <td className="py-1">{formData.currentDepartment}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">City:</td>
            <td className="py-1">{formData.currentCity}</td>
            <td className="py-1 font-semibold">Suite:</td>
            <td className="py-1">{formData.currentSuite}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">State:</td>
            <td className="py-1">{formData.currentState}</td>
            <td className="py-1 font-semibold">Phone #:</td>
            <td className="py-1">{formData.currentPhone}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Zip:</td>
            <td className="py-1">{formData.currentZip}</td>
            <td className="py-1 font-semibold">Email:</td>
            <td className="py-1">{formData.currentEmail}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold align-top">Access:</td>
            <td className="py-1">
              {[
                formData.currentStairs && 'Stairs',
                formData.currentElevator && 'Elevator',
                formData.currentLoadingDock && 'Loading Dock',
              ].filter(Boolean).join(', ') || 'None specified'}
            </td>
            <td className="py-1"></td>
            <td className="py-1"></td>
          </tr>
          <tr>
            <td className="py-1 font-semibold align-top">Special Instructions:</td>
            <td colSpan={3} className="py-1">{formData.currentSpecialInstructions}</td>
          </tr>
        </tbody>
      </table>

      {/* Destination Section */}
      <table className="w-full border-collapse text-[9px] mb-4">
        <thead>
          <tr className="border-b-2 border-black">
            <th colSpan={4} className="text-left py-1 pb-2 font-bold text-[10px]">DESTINATION</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1 font-semibold w-[15%]">Company Name:</td>
            <td className="py-1 w-[35%]">{formData.destCompanyName}</td>
            <td className="py-1 font-semibold w-[15%]">Contact:</td>
            <td className="py-1 w-[35%]">{formData.destContact}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Address:</td>
            <td className="py-1">{formData.destAddress}</td>
            <td className="py-1 font-semibold">Department:</td>
            <td className="py-1">{formData.destDepartment}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">City:</td>
            <td className="py-1">{formData.destCity}</td>
            <td className="py-1 font-semibold">Suite:</td>
            <td className="py-1">{formData.destSuite}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">State:</td>
            <td className="py-1">{formData.destState}</td>
            <td className="py-1 font-semibold">Phone #:</td>
            <td className="py-1">{formData.destPhone}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Zip:</td>
            <td className="py-1">{formData.destZip}</td>
            <td className="py-1 font-semibold">Email:</td>
            <td className="py-1">{formData.destEmail}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold align-top">Access:</td>
            <td className="py-1">
              {[
                formData.destStairs && 'Stairs',
                formData.destElevator && 'Elevator',
                formData.destLoadingDock && 'Loading Dock',
              ].filter(Boolean).join(', ') || 'None specified'}
            </td>
            <td className="py-1"></td>
            <td className="py-1"></td>
          </tr>
          <tr>
            <td className="py-1 font-semibold align-top">Special Instructions:</td>
            <td colSpan={3} className="py-1">{formData.destSpecialInstructions}</td>
          </tr>
        </tbody>
      </table>

      {/* Equipment Section */}
      <table className="w-full border-collapse text-[9px] mb-4">
        <thead>
          <tr className="border-b-2 border-black">
            <th colSpan={6} className="text-left py-1 pb-2 font-bold text-[10px]">EQUIPMENT</th>
          </tr>
          <tr className="border-b border-gray-400">
            <th className="py-1 text-left font-semibold">Make/Model #</th>
            <th className="py-1 text-left font-semibold">Serial #</th>
            <th className="py-1 text-left font-semibold">ID #</th>
            <th className="py-1 text-center font-semibold">Network Print?</th>
            <th className="py-1 text-center font-semibold">Scan?</th>
            <th className="py-1 text-left font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody>
          {formData.equipmentItems.length > 0 ? (
            formData.equipmentItems.map((item, index) => (
              <tr key={item.id || index} className="border-b border-gray-200">
                <td className="py-1">{item.makeModel}</td>
                <td className="py-1">{item.serialNumber}</td>
                <td className="py-1">{item.equipmentId}</td>
                <td className="py-1 text-center">{item.networkPrint ? 'Yes' : 'No'}</td>
                <td className="py-1 text-center">{item.scan ? 'Yes' : 'No'}</td>
                <td className="py-1">{item.notes}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="py-2 text-center text-gray-500 italic">No equipment added</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer Note */}
      <div className="mt-6 text-[8px] text-gray-600 border-t pt-3">
        <p className="italic">
          Note: Relocation requests require a minimum of 48 hours advance notice. 
          Equipment relocations are subject to scheduling availability and may incur additional charges.
          Please contact your account representative for pricing and scheduling confirmation.
        </p>
      </div>
    </div>
  );
});

RelocationPreview.displayName = 'RelocationPreview';

export default RelocationPreview;
