import { forwardRef } from "react";
import { format } from "date-fns";
import { ServiceAgreementFormData } from "./ServiceAgreementForm";

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
  category?: string;
  serial?: string;
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
}

export const ServiceAgreementPreview = forwardRef<HTMLDivElement, ServiceAgreementPreviewProps>(
  ({ formData, dealerInfo, lineItems, termsAndConditions }, ref) => {
    const hardwareLineItems = lineItems.filter(
      (item) => item.category?.toLowerCase() === 'hardware'
    );

    const formatCurrency = (value: string | number) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return '-';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(num);
    };

    return (
      <div
        ref={ref}
        style={{
          width: '8.5in',
          minHeight: '11in',
          padding: '0.5in',
          backgroundColor: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '10pt',
          color: '#000',
          lineHeight: '1.3',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          {/* Left: Dealer Info */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
            {dealerInfo?.logo_url && (
              <img
                src={dealerInfo.logo_url}
                alt="Company Logo"
                style={{ height: '60px', objectFit: 'contain' }}
              />
            )}
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14pt' }}>
                {dealerInfo?.company_name || 'Company Name'}
              </div>
              <div style={{ fontSize: '9pt', color: '#333' }}>
                {dealerInfo?.address_line1}
                {dealerInfo?.address_line2 && <>, {dealerInfo.address_line2}</>}
              </div>
              <div style={{ fontSize: '9pt', color: '#333' }}>
                {[dealerInfo?.city, dealerInfo?.state, dealerInfo?.zip_code].filter(Boolean).join(', ')}
              </div>
              {dealerInfo?.phone && (
                <div style={{ fontSize: '9pt', color: '#333' }}>Phone: {dealerInfo.phone}</div>
              )}
              {dealerInfo?.website && (
                <div style={{ fontSize: '9pt', color: '#333' }}>{dealerInfo.website}</div>
              )}
            </div>
          </div>

          {/* Right: Customer Number & Meter Method */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16pt', marginBottom: '10px' }}>
              SERVICE AGREEMENT
            </div>
            <table style={{ marginLeft: 'auto', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '2px 10px', textAlign: 'right', fontWeight: 'bold' }}>Customer #:</td>
                  <td style={{ padding: '2px 10px', textAlign: 'left' }}>
                    {formData.customerNumberOverride || formData.customerNumber || '-'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '2px 10px', textAlign: 'right', fontWeight: 'bold' }}>Meter Method:</td>
                  <td style={{ padding: '2px 10px', textAlign: 'left' }}>
                    {formData.meterMethod || '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Ship To / Bill To */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          {/* Ship To */}
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <thead>
                <tr>
                  <th
                    colSpan={2}
                    style={{
                      backgroundColor: '#1a365d',
                      color: 'white',
                      padding: '6px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    CUSTOMER SHIP TO
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', width: '80px', fontWeight: 'bold' }}>Company</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{formData.shipToCompany}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>Address</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{formData.shipToAddress}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>City/State/Zip</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                    {[formData.shipToCity, formData.shipToState, formData.shipToZip].filter(Boolean).join(', ')}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>Attn</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{formData.shipToAttn}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>Phone</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{formData.shipToPhone}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>Email</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{formData.shipToEmail}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bill To */}
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <thead>
                <tr>
                  <th
                    colSpan={2}
                    style={{
                      backgroundColor: '#1a365d',
                      color: 'white',
                      padding: '6px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    CUSTOMER BILL TO
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', width: '80px', fontWeight: 'bold' }}>Company</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{formData.billToCompany}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>Address</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{formData.billToAddress}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>City/State/Zip</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                    {[formData.billToCity, formData.billToState, formData.billToZip].filter(Boolean).join(', ')}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>Attn</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{formData.billToAttn}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>Phone</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{formData.billToPhone}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>Email</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{formData.billToEmail}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms Table */}
        <div style={{ marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
            <thead>
              <tr>
                <th
                  colSpan={5}
                  style={{
                    backgroundColor: '#1a365d',
                    color: 'white',
                    padding: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  TERMS
                </th>
              </tr>
              <tr style={{ backgroundColor: '#e2e8f0' }}>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  Maintenance Type
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  Paper & Staples
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  Drum & Toner
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  Effective Date
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  Contract Length
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>
                  {formData.maintenanceType || '-'}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>
                  {formData.paperStaples || '-'}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>
                  {formData.drumToner || '-'}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>
                  {formData.effectiveDate ? format(formData.effectiveDate, 'MM/dd/yyyy') : '-'}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>
                  {formData.contractLengthMonths ? `${formData.contractLengthMonths} Months` : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Equipment Table */}
        <div style={{ marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
            <thead>
              <tr>
                <th
                  colSpan={4}
                  style={{
                    backgroundColor: '#1a365d',
                    color: 'white',
                    padding: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  EQUIPMENT
                </th>
              </tr>
              <tr style={{ backgroundColor: '#e2e8f0' }}>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>
                  Qty
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', fontWeight: 'bold' }}>
                  Model
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', fontWeight: 'bold' }}>
                  Description
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', fontWeight: 'bold', width: '120px' }}>
                  Serial
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center', color: '#666' }}>
                    No equipment items
                  </td>
                </tr>
              ) : (
                lineItems.map((item, index) => (
                  <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f7fafc' }}>
                    <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ border: '1px solid #ccc', padding: '6px' }}>{item.name}</td>
                    <td style={{ border: '1px solid #ccc', padding: '6px' }}>{item.description || '-'}</td>
                    <td style={{ border: '1px solid #ccc', padding: '6px' }}>{item.serial || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rates Table (Hardware Only) */}
        <div style={{ marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
            <thead>
              <tr>
                <th
                  colSpan={6}
                  style={{
                    backgroundColor: '#1a365d',
                    color: 'white',
                    padding: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  RATES
                </th>
              </tr>
              <tr style={{ backgroundColor: '#e2e8f0' }}>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', fontWeight: 'bold' }}>
                  Model
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  Includes (B/W)
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  Includes (Color)
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  Overages (B/W)
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  Overages (Color)
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  Base Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {hardwareLineItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center', color: '#666' }}>
                    No hardware items
                  </td>
                </tr>
              ) : (
                hardwareLineItems.map((item, index) => {
                  const rates = formData.rates[item.id] || { includesBW: '', includesColor: '', overagesBW: '', overagesColor: '', baseRate: '' };
                  return (
                    <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f7fafc' }}>
                      <td style={{ border: '1px solid #ccc', padding: '6px' }}>{item.name}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>
                        {rates.includesBW || '-'}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>
                        {rates.includesColor || '-'}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>
                        {rates.overagesBW ? formatCurrency(rates.overagesBW) : '-'}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>
                        {rates.overagesColor ? formatCurrency(rates.overagesColor) : '-'}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>
                        {rates.baseRate ? formatCurrency(rates.baseRate) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Terms and Conditions */}
        {termsAndConditions && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                backgroundColor: '#1a365d',
                color: 'white',
                padding: '6px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '9pt',
              }}
            >
              TERMS AND CONDITIONS
            </div>
            <div
              style={{
                border: '1px solid #ccc',
                padding: '10px',
                fontSize: '8pt',
                whiteSpace: 'pre-wrap',
                maxHeight: '200px',
                overflow: 'hidden',
              }}
            >
              {termsAndConditions}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ marginTop: '30px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
            <thead>
              <tr>
                <th
                  colSpan={2}
                  style={{
                    backgroundColor: '#1a365d',
                    color: 'white',
                    padding: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  SIGNATURES
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ width: '50%', padding: '15px', verticalAlign: 'top' }}>
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>DEALER</div>
                    <div style={{ borderBottom: '1px solid #000', height: '30px', marginBottom: '5px' }}></div>
                    <div style={{ fontSize: '8pt', color: '#666' }}>Authorized Signature</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1px solid #000', height: '20px', marginBottom: '5px' }}></div>
                    <div style={{ fontSize: '8pt', color: '#666' }}>Date</div>
                  </div>
                </td>
                <td style={{ width: '50%', padding: '15px', verticalAlign: 'top', borderLeft: '1px solid #ccc' }}>
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>CUSTOMER</div>
                    <div style={{ borderBottom: '1px solid #000', height: '30px', marginBottom: '5px' }}></div>
                    <div style={{ fontSize: '8pt', color: '#666' }}>Authorized Signature</div>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ borderBottom: '1px solid #000', height: '20px', marginBottom: '5px' }}></div>
                    <div style={{ fontSize: '8pt', color: '#666' }}>Print Name & Title</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1px solid #000', height: '20px', marginBottom: '5px' }}></div>
                    <div style={{ fontSize: '8pt', color: '#666' }}>Date</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

ServiceAgreementPreview.displayName = "ServiceAgreementPreview";
