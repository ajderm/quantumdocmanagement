// Form Customization types, utilities, and registry
// Allows admins to rename fields and hide sections across all document forms

export interface FormCustomizationConfig {
  fieldLabels?: Record<string, string>;
  hiddenSections?: string[];
}

export type FormCustomizationMap = Record<string, FormCustomizationConfig>;

// Utility: get a custom label or fall back to default
export function getLabel(
  config: FormCustomizationConfig | undefined,
  key: string,
  defaultLabel: string
): string {
  return config?.fieldLabels?.[key] || defaultLabel;
}

// Utility: check if a section should be visible
export function isSectionVisible(
  config: FormCustomizationConfig | undefined,
  sectionKey: string
): boolean {
  if (!config?.hiddenSections) return true;
  return !config.hiddenSections.includes(sectionKey);
}

// --- Registry: defines all sections and fields for each document type ---

export interface FieldDef {
  key: string;
  defaultLabel: string;
  section: string;
}

export interface SectionDef {
  key: string;
  defaultTitle: string;
}

export interface FormRegistry {
  sections: SectionDef[];
  fields: FieldDef[];
}

export const FORM_REGISTRIES: Record<string, FormRegistry> = {
  quote: {
    sections: [
      { key: 'customerInfo', defaultTitle: 'Prepared For' },
      { key: 'equipment', defaultTitle: 'Equipment' },
      { key: 'pricing', defaultTitle: 'Pricing' },
      { key: 'serviceAgreement', defaultTitle: 'Service Agreement' },
      { key: 'buyout', defaultTitle: 'Buyout' },
      { key: 'leaseTerms', defaultTitle: 'Lease Terms' },
      { key: 'termsAndConditions', defaultTitle: 'Terms & Conditions' },
      { key: 'acceptance', defaultTitle: 'Accepted By' },
    ],
    fields: [
      { key: 'quoteNumber', defaultLabel: 'Quote Number', section: 'customerInfo' },
      { key: 'quoteDate', defaultLabel: 'Quote Date', section: 'customerInfo' },
      { key: 'preparedBy', defaultLabel: 'Prepared By', section: 'customerInfo' },
      { key: 'companyName', defaultLabel: 'Company Name', section: 'customerInfo' },
      { key: 'address', defaultLabel: 'Address', section: 'customerInfo' },
      { key: 'phone', defaultLabel: 'Phone', section: 'customerInfo' },
      { key: 'retailPrice', defaultLabel: 'Retail Price', section: 'pricing' },
      { key: 'cashDiscount', defaultLabel: 'Cash Discount', section: 'pricing' },
      { key: 'serviceBaseRate', defaultLabel: 'Base Rate', section: 'serviceAgreement' },
      { key: 'includedBWCopies', defaultLabel: 'Included B/W Copies', section: 'serviceAgreement' },
      { key: 'includedColorCopies', defaultLabel: 'Included Color Copies', section: 'serviceAgreement' },
      { key: 'overageBWRate', defaultLabel: 'Overage B/W Rate', section: 'serviceAgreement' },
      { key: 'overageColorRate', defaultLabel: 'Overage Color Rate', section: 'serviceAgreement' },
    ],
  },
  installation: {
    sections: [
      { key: 'installationReport', defaultTitle: 'Installation Report' },
      { key: 'shipTo', defaultTitle: 'Customer Ship To' },
      { key: 'billTo', defaultTitle: 'Customer Bill To' },
      { key: 'equipmentInstalled', defaultTitle: 'Equipment (Installed)' },
      { key: 'networking', defaultTitle: 'Networking' },
      { key: 'additionalContacts', defaultTitle: 'Additional Contacts' },
      { key: 'equipmentRemoved', defaultTitle: 'Equipment (Removed)' },
      { key: 'removalInstructions', defaultTitle: 'Removal Instructions' },
      { key: 'signatures', defaultTitle: 'Signatures' },
    ],
    fields: [
      { key: 'meterBlack', defaultLabel: 'Meter (Black)', section: 'installationReport' },
      { key: 'meterColor', defaultLabel: 'Meter (Color)', section: 'installationReport' },
      { key: 'meterTotal', defaultLabel: 'Meter (Total)', section: 'installationReport' },
      { key: 'idNumber', defaultLabel: 'ID Number', section: 'installationReport' },
      { key: 'customerNumber', defaultLabel: 'Customer Number', section: 'installationReport' },
      { key: 'salesRep', defaultLabel: 'Sales Rep', section: 'installationReport' },
      { key: 'meterMethod', defaultLabel: 'Meter Method', section: 'installationReport' },
      { key: 'cca', defaultLabel: 'CCA', section: 'installationReport' },
      { key: 'company', defaultLabel: 'Company', section: 'shipTo' },
      { key: 'address', defaultLabel: 'Address', section: 'shipTo' },
      { key: 'attn', defaultLabel: 'ATTN', section: 'shipTo' },
      { key: 'phone', defaultLabel: 'Phone', section: 'shipTo' },
      { key: 'email', defaultLabel: 'Email', section: 'shipTo' },
      { key: 'serialNumber', defaultLabel: 'Serial #', section: 'equipmentInstalled' },
      { key: 'macAddress', defaultLabel: 'MAC Address', section: 'equipmentInstalled' },
      { key: 'ipAddress', defaultLabel: 'IP Address', section: 'equipmentInstalled' },
    ],
  },
  service_agreement: {
    sections: [
      { key: 'agreementDetails', defaultTitle: 'Agreement Details' },
      { key: 'shipTo', defaultTitle: 'Customer Ship To' },
      { key: 'billTo', defaultTitle: 'Customer Bill To' },
      { key: 'terms', defaultTitle: 'Terms' },
      { key: 'equipment', defaultTitle: 'Equipment' },
      { key: 'rates', defaultTitle: 'Rates' },
      { key: 'termsAndConditions', defaultTitle: 'Terms & Conditions' },
      { key: 'signatures', defaultTitle: 'Signatures' },
    ],
    fields: [
      { key: 'customerNumber', defaultLabel: 'Customer Number', section: 'agreementDetails' },
      { key: 'meterMethod', defaultLabel: 'Meter Method', section: 'agreementDetails' },
      { key: 'maintenanceType', defaultLabel: 'Maintenance Type', section: 'terms' },
      { key: 'paperStaples', defaultLabel: 'Paper & Staples', section: 'terms' },
      { key: 'drumToner', defaultLabel: 'Drum & Toner', section: 'terms' },
      { key: 'effectiveDate', defaultLabel: 'Effective Date', section: 'terms' },
      { key: 'contractLength', defaultLabel: 'Contract Length', section: 'terms' },
      { key: 'includesBW', defaultLabel: 'Includes (B/W)', section: 'rates' },
      { key: 'includesColor', defaultLabel: 'Includes (Color)', section: 'rates' },
      { key: 'overagesBW', defaultLabel: 'Overages (B/W)', section: 'rates' },
      { key: 'overagesColor', defaultLabel: 'Overages (Color)', section: 'rates' },
      { key: 'baseRate', defaultLabel: 'Base Rate', section: 'rates' },
    ],
  },
  fmv_lease: {
    sections: [
      { key: 'customerInfo', defaultTitle: 'Customer Information' },
      { key: 'equipmentInfo', defaultTitle: 'Equipment Information' },
      { key: 'paymentSchedule', defaultTitle: 'Payment Schedule' },
      { key: 'termsAndConditions', defaultTitle: 'Terms & Conditions' },
      { key: 'signatures', defaultTitle: 'Signatures' },
    ],
    fields: [
      { key: 'companyLegalName', defaultLabel: 'Company Legal Name', section: 'customerInfo' },
      { key: 'phone', defaultLabel: 'Phone', section: 'customerInfo' },
      { key: 'billingAddress', defaultLabel: 'Billing Address', section: 'customerInfo' },
      { key: 'equipmentAddress', defaultLabel: 'Equipment Address', section: 'customerInfo' },
      { key: 'termInMonths', defaultLabel: 'Term in Months', section: 'paymentSchedule' },
      { key: 'paymentFrequency', defaultLabel: 'Payment Frequency', section: 'paymentSchedule' },
      { key: 'firstPaymentDate', defaultLabel: 'First Payment Date', section: 'paymentSchedule' },
      { key: 'paymentAmount', defaultLabel: 'Payment Amount', section: 'paymentSchedule' },
    ],
  },
  lease_funding: {
    sections: [
      { key: 'dealInfo', defaultTitle: 'Deal Information' },
      { key: 'equipmentInfo', defaultTitle: 'Equipment Information' },
      { key: 'leaseDetails', defaultTitle: 'Lease Details' },
      { key: 'signatures', defaultTitle: 'Signatures' },
    ],
    fields: [
      { key: 'customerName', defaultLabel: 'Customer Name', section: 'dealInfo' },
      { key: 'locationBranch', defaultLabel: 'Location/Branch', section: 'dealInfo' },
      { key: 'salesRepresentative', defaultLabel: 'Sales Representative', section: 'dealInfo' },
      { key: 'date', defaultLabel: 'Date', section: 'dealInfo' },
      { key: 'equipmentMakeModel', defaultLabel: 'Equipment Make/Model', section: 'equipmentInfo' },
      { key: 'idNumber', defaultLabel: 'ID Number', section: 'equipmentInfo' },
      { key: 'serialNumber', defaultLabel: 'Serial Number', section: 'equipmentInfo' },
      { key: 'leaseVendor', defaultLabel: 'Lease Vendor', section: 'leaseDetails' },
      { key: 'leaseType', defaultLabel: 'Lease Type', section: 'leaseDetails' },
      { key: 'termLength', defaultLabel: 'Term Length', section: 'leaseDetails' },
      { key: 'monthlyPayment', defaultLabel: 'Monthly Payment', section: 'leaseDetails' },
      { key: 'rate', defaultLabel: 'Rate', section: 'leaseDetails' },
      { key: 'invoiceFundingAmount', defaultLabel: 'Invoice/Funding Amount', section: 'leaseDetails' },
    ],
  },
  loi: {
    sections: [
      { key: 'customerHeader', defaultTitle: 'Customer Company Header' },
      { key: 'letterDetails', defaultTitle: 'Letter Details' },
      { key: 'leaseCompanyInfo', defaultTitle: 'Lease Company Information' },
      { key: 'customerInfo', defaultTitle: 'Customer Information' },
      { key: 'equipment', defaultTitle: 'Equipment Being Returned' },
      { key: 'terminationDetails', defaultTitle: 'Termination Letter Details' },
      { key: 'signature', defaultTitle: 'Signature' },
    ],
    fields: [
      { key: 'leaseExpirationDate', defaultLabel: 'Lease Expiration Date', section: 'leaseCompanyInfo' },
      { key: 'sixtyDayLetterDue', defaultLabel: '60 Day Letter Due', section: 'leaseCompanyInfo' },
      { key: 'leaseNumber', defaultLabel: 'Lease Number', section: 'leaseCompanyInfo' },
      { key: 'leaseVendor', defaultLabel: 'Lease Vendor', section: 'leaseCompanyInfo' },
      { key: 'businessName', defaultLabel: 'Business Name', section: 'customerInfo' },
      { key: 'customerContact', defaultLabel: 'Contact', section: 'customerInfo' },
      { key: 'contractNumber', defaultLabel: 'Contract Number', section: 'terminationDetails' },
    ],
  },
  lease_return: {
    sections: [
      { key: 'leaseInfo', defaultTitle: 'Lease Information' },
      { key: 'equipment', defaultTitle: 'Equipment' },
      { key: 'signatures', defaultTitle: 'Signatures' },
    ],
    fields: [
      { key: 'amount', defaultLabel: 'Amount', section: 'leaseInfo' },
      { key: 'customerName', defaultLabel: 'Customer Name', section: 'leaseInfo' },
      { key: 'leaseNumber', defaultLabel: 'Lease Number', section: 'leaseInfo' },
      { key: 'leaseEndDate', defaultLabel: 'Lease End Date', section: 'leaseInfo' },
      { key: 'leaseCompany', defaultLabel: 'Lease Company', section: 'leaseInfo' },
    ],
  },
  interterritorial: {
    sections: [
      { key: 'originatingDealer', defaultTitle: 'Originating Dealer' },
      { key: 'installingDealer', defaultTitle: 'Installing Dealer' },
      { key: 'customerInfo', defaultTitle: 'Customer Information' },
      { key: 'equipment', defaultTitle: 'Equipment' },
      { key: 'removals', defaultTitle: 'Equipment Removals' },
      { key: 'serviceAgreement', defaultTitle: 'Service Agreement' },
      { key: 'termsAndConditions', defaultTitle: 'Terms & Conditions' },
      { key: 'signatures', defaultTitle: 'Signatures' },
    ],
    fields: [
      { key: 'requestedInstallDate', defaultLabel: 'Requested Install Date', section: 'originatingDealer' },
      { key: 'originatingName', defaultLabel: 'Name', section: 'originatingDealer' },
      { key: 'installingName', defaultLabel: 'Name', section: 'installingDealer' },
      { key: 'shipToCompany', defaultLabel: 'Ship To Company', section: 'customerInfo' },
      { key: 'billToCompany', defaultLabel: 'Bill To Company', section: 'customerInfo' },
    ],
  },
  new_customer: {
    sections: [
      { key: 'customerInfo', defaultTitle: 'Customer Information' },
      { key: 'addresses', defaultTitle: 'Addresses' },
      { key: 'contacts', defaultTitle: 'Contacts' },
      { key: 'bankReferences', defaultTitle: 'Bank References' },
      { key: 'businessReferences', defaultTitle: 'Business References' },
      { key: 'termsAndConditions', defaultTitle: 'Terms & Conditions' },
      { key: 'signatures', defaultTitle: 'Signatures' },
    ],
    fields: [
      { key: 'companyName', defaultLabel: 'Company Name', section: 'customerInfo' },
      { key: 'tradeName', defaultLabel: 'Trade Name', section: 'customerInfo' },
      { key: 'taxId', defaultLabel: 'Tax ID', section: 'customerInfo' },
      { key: 'yearEstablished', defaultLabel: 'Year Established', section: 'customerInfo' },
      { key: 'creditRequested', defaultLabel: 'Credit Requested', section: 'customerInfo' },
    ],
  },
  relocation: {
    sections: [
      { key: 'customerInfo', defaultTitle: 'Customer Information' },
      { key: 'currentLocation', defaultTitle: 'Current Location' },
      { key: 'destination', defaultTitle: 'Destination' },
      { key: 'equipment', defaultTitle: 'Equipment' },
    ],
    fields: [
      { key: 'companyName', defaultLabel: 'Company', section: 'customerInfo' },
      { key: 'submittedBy', defaultLabel: 'Submitted by', section: 'customerInfo' },
      { key: 'requestedDate', defaultLabel: 'Requested Date', section: 'customerInfo' },
      { key: 'billToAddress', defaultLabel: 'Bill To Address', section: 'customerInfo' },
    ],
  },
  equipment_removal: {
    sections: [
      { key: 'header', defaultTitle: 'Meter Information' },
      { key: 'shipTo', defaultTitle: 'Ship To' },
      { key: 'billTo', defaultTitle: 'Bill To' },
      { key: 'equipment', defaultTitle: 'Equipment' },
      { key: 'additionalComments', defaultTitle: 'Additional Comments' },
      { key: 'removalReceipt', defaultTitle: 'Removal Receipt' },
    ],
    fields: [
      { key: 'idNumber', defaultLabel: 'ID Number', section: 'header' },
      { key: 'meterBlack', defaultLabel: 'Meter Black', section: 'header' },
      { key: 'meterColor', defaultLabel: 'Meter Color', section: 'header' },
      { key: 'meterTotal', defaultLabel: 'Meter Total', section: 'header' },
      { key: 'salesRepresentative', defaultLabel: 'Sales Representative', section: 'removalReceipt' },
    ],
  },
  commission: {
    sections: [
      { key: 'saleInfo', defaultTitle: 'Sale Information' },
      { key: 'lineItems', defaultTitle: 'Line Items' },
      { key: 'costBreakdown', defaultTitle: 'Cost Breakdown' },
      { key: 'leaseInfo', defaultTitle: 'Lease Information' },
      { key: 'commissionCalc', defaultTitle: 'Commission Calculation' },
    ],
    fields: [
      { key: 'salesRepresentative', defaultLabel: 'Sales Representative', section: 'saleInfo' },
      { key: 'soldOnDate', defaultLabel: 'Sold On Date', section: 'saleInfo' },
      { key: 'customer', defaultLabel: 'Customer', section: 'saleInfo' },
      { key: 'orderNumber', defaultLabel: 'Order Number', section: 'saleInfo' },
      { key: 'transactionType', defaultLabel: 'Transaction Type', section: 'saleInfo' },
    ],
  },
};
