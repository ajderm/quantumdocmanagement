import { forwardRef } from 'react';
import { format } from 'date-fns';
import type { CustomDocument, DocumentSection } from '@/components/admin/types';
import { evaluateFormula, formatFieldNumber } from './DynamicFieldRenderer';
import { buildDocumentFontCss } from "@/lib/documentFontSizes";
interface DealerInfo {
  companyName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
}

interface CustomDocumentPreviewProps {
  document: CustomDocument;
  formData: Record<string, any>;
  dealerInfo?: DealerInfo;
  documentStyles?: { fontFamily?: string; fontColor?: string; tableBorderColor?: string; tableLineColor?: string; fontSizeOffset?: number; fontSizeOffsets?: { title?: number; header?: number; body?: number; table?: number; fine?: number; }; };
}

export const CustomDocumentPreview = forwardRef<HTMLDivElement, CustomDocumentPreviewProps>(
  ({ document, formData, dealerInfo, documentStyles }, ref) => {
    const sections = document.schema?.sections || [];

    const formatDate = (date?: string | Date) => {
      if (!date) return format(new Date(), 'MM/dd/yyyy');
      try {
        return format(new Date(date), 'MM/dd/yyyy');
      } catch {
        return date.toString();
      }
    };

    const getWidthClass = (width: string) => {
      switch (width) {
        case 'full': return 'col-span-3';
        case 'half': return 'col-span-3 md:col-span-2';
        case 'third': return 'col-span-1';
        default: return 'col-span-3';
      }
    };

    const renderHeader = (section: DocumentSection) => (
      <div className="flex justify-between items-start mb-6" key={section.id}>
        <div className="flex items-start gap-4">
          {section.showDealerLogo && dealerInfo?.logoUrl && (
            <img 
              src={dealerInfo.logoUrl} 
              alt="Company Logo" 
              className="h-16 w-auto object-contain"
            />
          )}
          {section.showDealerAddress && dealerInfo && (
            <div className="text-[12px] leading-tight">
              <div className="font-bold text-[12px]">{dealerInfo.companyName}</div>
              <div>{dealerInfo.address}</div>
              <div>
                {dealerInfo.city}{dealerInfo.city && dealerInfo.state && ', '}
                {dealerInfo.state} {dealerInfo.zip}
              </div>
              <div>{dealerInfo.phone}</div>
              {dealerInfo.website && <div>{dealerInfo.website}</div>}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[16px] font-bold">{document.name}</div>
          <div className="text-[12px] mt-1">Date: {formatDate(new Date())}</div>
        </div>
      </div>
    );

    const renderFields = (section: DocumentSection) => (
      <div className="mb-4" key={section.id}>
        <div className="font-bold text-[13px] border-b-2 border-black pb-1 mb-2 uppercase">
          {section.title}
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[12px]">
          {(section.fields || []).map((field) => {
            const value = formData[field.id];
            if (field.type === 'checkbox' && !value) return null;
            
            let displayValue: string;
            if (field.type === 'checkbox') {
              displayValue = value ? 'Yes' : 'No';
            } else if (field.type === 'date' && value) {
              displayValue = formatDate(value);
            } else if (field.type === 'formula' && field.formula) {
              const result = evaluateFormula(field.formula, formData);
              displayValue = formatFieldNumber(result, field.decimals, field.prefix, field.suffix);
            } else if (field.type === 'currency') {
              const num = parseFloat(String(value));
              displayValue = isNaN(num) ? (value || '-') : `${field.prefix || '$'}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else if (field.type === 'percentage') {
              const num = parseFloat(String(value));
              displayValue = isNaN(num) ? (value || '-') : `${num}%`;
            } else if (field.type === 'number') {
              const num = parseFloat(String(value));
              displayValue = isNaN(num) ? (value || '-') : `${field.prefix || ''}${num.toLocaleString('en-US')}${field.suffix || ''}`;
            } else {
              displayValue = value || '-';
            }
            
            return (
              <div key={field.id} className={getWidthClass(field.width)}>
                <span className="font-semibold">{field.label}:</span>
                <span className="ml-1">{displayValue}</span>
              </div>
            );
          })}
        </div>
      </div>
    );

    const renderTextBlock = (section: DocumentSection) => {
      let content = formData[`textblock_${section.id}`] || section.content || '';
      // Replace merge fields with values from formData/deal/company context
      content = content.replace(/\{\{([^}]+)\}\}/g, (_: string, key: string) => {
        const parts = key.trim().split('.');
        if (parts.length === 2) {
          const [obj, prop] = parts;
          // Try to resolve from formData first, then leave the placeholder
          return formData[`${obj}_${prop}`] || `{{${key}}}`;
        }
        return formData[key] || `{{${key}}}`;
      });

      if (!content) return null;

      return (
        <div className="mb-4" key={section.id}>
          {section.title && (
            <div className="font-bold text-[13px] border-b-2 border-black pb-1 mb-2 uppercase">
              {section.title}
            </div>
          )}
          <div className="text-[12px] whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        </div>
      );
    };

    const renderCalculatedSummary = (section: DocumentSection) => {
      if (!section.summaryRows || section.summaryRows.length === 0) return null;

      return (
        <div className="mb-4" key={section.id}>
          <div className="font-bold text-[13px] border-b-2 border-black pb-1 mb-2 uppercase">
            {section.title}
          </div>
          <table className="w-full text-[12px]">
            <tbody>
              {section.summaryRows.map((row) => {
                const result = evaluateFormula(row.formula, formData);
                return (
                  <tr key={row.id} className={row.bold ? 'border-t border-black font-bold' : 'border-b border-gray-200'}>
                    <td className="py-1">{row.label}</td>
                    <td className="py-1 text-right">
                      {formatFieldNumber(result, 2, row.prefix, row.suffix)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    };

    const renderTable = (section: DocumentSection) => {
      const rows = formData[`table_${section.id}`] || [];
      const columns = section.columns || [];
      
      if (rows.length === 0) return null;

      return (
        <div className="mb-4" key={section.id}>
          <div className="font-bold text-[13px] border-b-2 border-black pb-1 mb-2 uppercase">
            {section.title}
          </div>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-black">
                {columns.map((col) => (
                  <th key={col.id} className="text-left py-1 px-1 font-bold">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.id} className="border-b border-gray-300">
                  {columns.map((col) => (
                    <td key={col.id} className="py-1 px-1">
                      {row[col.id] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    const renderSignature = (section: DocumentSection) => (
      <div className="mb-4" key={section.id}>
        <div className="font-bold text-[13px] border-b-2 border-black pb-1 mb-3 uppercase">
          {section.title}
        </div>
        <div className="flex gap-8 mt-6">
          <div className="flex-1">
            <div className="border-b border-black pb-1 mb-1 min-h-[24px] font-script italic text-[12px]">
              {formData[`sig_${section.id}_name`] || ''}
            </div>
            <div className="text-[12px]">{section.signerLabel || 'Authorized Signature'}</div>
          </div>
          {section.includeDateLine && (
            <div className="w-32">
              <div className="border-b border-black pb-1 mb-1 min-h-[24px] text-[12px]">
                {formData[`sig_${section.id}_date`] || formatDate(new Date())}
              </div>
              <div className="text-[12px]">Date</div>
            </div>
          )}
        </div>
      </div>
    );

    const renderTerms = (section: DocumentSection) => {
      if (!section.showTerms || !document.terms_and_conditions) return null;

      return (
        <div className="mb-4" key={section.id}>
          <div className="font-bold text-[13px] border-b-2 border-black pb-1 mb-2 uppercase">
            Terms & Conditions
          </div>
          <div className="text-[8px] leading-tight whitespace-pre-wrap">
            {document.terms_and_conditions}
          </div>
        </div>
      );
    };

    const renderSection = (section: DocumentSection) => {
      switch (section.type) {
        case 'header':
          return renderHeader(section);
        case 'fields':
          return renderFields(section);
        case 'table':
          return renderTable(section);
        case 'text_block':
          return renderTextBlock(section);
        case 'calculated_summary':
          return renderCalculatedSummary(section);
        case 'signature':
          return renderSignature(section);
        case 'terms':
          return renderTerms(section);
        default:
          return null;
      }
    };

    const _docScopeId = 'doc-customdocument';
    const _docFontCss = buildDocumentFontCss(_docScopeId, documentStyles);

    return (
        <div
          ref={ref}
          data-doc-scope={_docScopeId}
          className="bg-white p-8"
          style={{
            width: '8.5in',
            minHeight: '11in',
            fontFamily: documentStyles?.fontFamily || 'Arial, sans-serif',
            color: documentStyles?.fontColor || '#000000',
          }}
        >
          {_docFontCss && <style>{_docFontCss}</style>}
          {sections.map(renderSection)}
        </div>
    );
  }
);

CustomDocumentPreview.displayName = 'CustomDocumentPreview';
