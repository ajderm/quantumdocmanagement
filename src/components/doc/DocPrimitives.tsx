import { forwardRef, useId, type ReactNode } from "react";
import type { DocumentStyles } from "@/lib/documentFontSizes";
import { buildDocumentFontCss } from "@/lib/documentFontSizes";

// Single source of truth for the horizontal page margin of every output
// document. The PDF generator owns the vertical margins; this owns the sides.
export const DOC_PAGE_PADDING_X_IN = 0.6;

const DEFAULT_BORDER = "#000000";
const DEFAULT_LINE = "#d1d5db";

/**
 * DocPage — the outer page shell shared by every output document.
 * - Applies base font family, color, and font-size role scope (buildDocumentFontCss).
 * - Enforces one horizontal margin for all documents.
 * - Remaps the legacy `border-black` / `border-gray-300` utility classes to the
 *   configured table colors within its scope, so every table (including bespoke
 *   ones) honors Document Styles without any table-markup changes.
 * Forwards its ref to the capture element used by the PDF generator.
 */
export const DocPage = forwardRef<
  HTMLDivElement,
  {
    scopeId: string;
    documentStyles?: DocumentStyles;
    className?: string;
    children: ReactNode;
  }
>(({ scopeId, documentStyles, className, children }, ref) => {
  const fontCss = buildDocumentFontCss(scopeId, documentStyles);
  const borderColor = documentStyles?.tableBorderColor || DEFAULT_BORDER;
  const lineColor = documentStyles?.tableLineColor || DEFAULT_LINE;
  const borderCss =
    `[data-doc-scope="${scopeId}"] .border-black{border-color:${borderColor} !important;}` +
    `[data-doc-scope="${scopeId}"] .border-gray-300{border-color:${lineColor} !important;}` +
    // html2canvas clips glyphs that sit tight against a bottom rule when the line box is
    // short. Give every table header cell in the scope a taller line box so table headers
    // (including bespoke tables) are not cut off in the generated PDF.
    `[data-doc-scope="${scopeId}"] th{line-height:1.4;}`;
  return (
    <div
      ref={ref}
      data-doc-scope={scopeId}
      className={`bg-white w-[8.5in] min-h-[11in] text-[13px] leading-tight ${className || ""}`}
      style={{
        fontFamily: documentStyles?.fontFamily || "Arial, sans-serif",
        color: documentStyles?.fontColor || "#000000",
        paddingLeft: `${DOC_PAGE_PADDING_X_IN}in`,
        paddingRight: `${DOC_PAGE_PADDING_X_IN}in`,
        paddingTop: "0.3in",
        paddingBottom: "0.3in",
      }}
    >
      <style>{`${fontCss}${borderCss}`}</style>
      {children}
    </div>
  );
});
DocPage.displayName = "DocPage";

/**
 * DocLetterhead — the standardized document header: dealer logo + company block
 * on the left, document title + right-aligned metadata rows on the right.
 */
export function DocLetterhead({
  dealerInfo,
  title,
  metaRows,
}: {
  dealerInfo?: {
    companyName: string;
    address: string;
    phone: string;
    website: string;
    logoUrl?: string;
  };
  title: string;
  metaRows?: { label: string; value: ReactNode; emphasize?: boolean }[];
}) {
  return (
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
            <p className="font-bold text-[13px]">{dealerInfo.companyName}</p>
            <p className="text-[12px]">{dealerInfo.address}</p>
            <p className="text-[12px]">{dealerInfo.phone}</p>
            <p className="text-[12px]">{dealerInfo.website}</p>
          </>
        )}
      </div>
      <div className="text-right">
        <h1 className="text-[24px] font-bold mb-2">{title}</h1>
        {metaRows && metaRows.length > 0 && (
          <table className="text-right ml-auto text-[13px]">
            <tbody>
              {metaRows.map((r, i) => (
                <tr key={i}>
                  <td className="pr-4">{r.label}:</td>
                  <td className={r.emphasize ? "font-semibold" : undefined}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/**
 * DocSection — one section wrapper: consistent bold section heading with a
 * single separator style and consistent spacing. Optional right-aligned action
 * slot (e.g. RFP / contract numbers).
 */
export function DocSection({
  title,
  action,
  className,
  children,
  documentStyles,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
  documentStyles?: DocumentStyles;
}) {
  const borderColor = documentStyles?.tableBorderColor || DEFAULT_BORDER;
  return (
    <div className={`mb-6 ${className || ""}`}>
      {(title || action) && (
        <div
          className="flex justify-between items-end gap-4 mb-2"
          style={{ borderBottom: `2px solid ${borderColor}`, paddingBottom: "6px" }}
        >
          {title ? <p className="font-bold text-[13px] leading-normal">{title}</p> : <span />}
          {action ? <div className="leading-normal">{action}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * DocSignature — wraps signature / acceptance blocks and guarantees they are
 * never split across a page break in the generated PDF.
 */
export function DocSignature({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`mb-6 ${className || ""}`} data-pdf-keep-together>
      {children}
    </div>
  );
}

/**
 * DocTable — the standardized table for regular (non-bespoke) tables: consistent
 * header border, row lines, cell padding, and alignment, all driven by Document
 * Styles. Pass <thead>/<tbody> as children. Direct-child selectors are used so
 * nested tables are unaffected.
 */
export function DocTable({
  documentStyles,
  className,
  children,
}: {
  documentStyles?: DocumentStyles;
  className?: string;
  children: ReactNode;
}) {
  const rawId = useId();
  const cls = `qdoc-t-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const borderColor = documentStyles?.tableBorderColor || DEFAULT_BORDER;
  const lineColor = documentStyles?.tableLineColor || DEFAULT_LINE;
  const css =
    `.${cls}{width:100%;border-collapse:collapse;}` +
    `.${cls} > thead > tr > th{border-bottom:2px solid ${borderColor};padding:3px 4px 6px;text-align:left;line-height:1.4;}` +
    `.${cls} > tbody > tr > td{border-bottom:1px solid ${lineColor};padding:2px 4px;vertical-align:top;}`;
  return (
    <>
      <style>{css}</style>
      <table className={`${cls} ${className || ""}`}>{children}</table>
    </>
  );
}
