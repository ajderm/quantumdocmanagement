// Shared types for admin components

export interface HubSpotProperty {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  groupName: string;
  description?: string;
}

export interface HubSpotObject {
  label: string;
  properties: HubSpotProperty[];
  isCustomObject?: boolean;
}

export interface HubSpotPropertiesResponse {
  objects: Record<string, HubSpotObject>;
  associationLabels: { id: string; label: string }[];
}

export interface FieldMapping {
  field_key: string;
  hubspot_object: string;
  hubspot_property: string;
  association_label?: string;
  association_path?: string; // 'company_contact' = contact via company association
}

export interface FieldMappingsGrouped {
  global: FieldMapping[];
  [documentType: string]: FieldMapping[];
}

// Document Builder Types
export interface DocumentField {
  id: string;
  label: string;
  type: 'text' | 'date' | 'dropdown' | 'checkbox' | 'textarea' | 'signature';
  mapping: {
    source: 'hubspot' | 'manual' | 'existing';
    object?: string;
    property?: string;
    existingFieldKey?: string;
  };
  required: boolean;
  width: 'full' | 'half' | 'third';
  options?: string[]; // For dropdown type
}

export interface TableColumn {
  id: string;
  label: string;
  mapping: {
    source: 'line_item' | 'manual';
    property?: string;
  };
}

export interface DocumentSection {
  id: string;
  title: string;
  type: 'header' | 'fields' | 'table' | 'signature' | 'terms';
  showDealerLogo?: boolean;
  showDealerAddress?: boolean;
  fields?: DocumentField[];
  columns?: TableColumn[];
  maxRows?: number;
  signerLabel?: string;
  includeDateLine?: boolean;
  showTerms?: boolean;
}

export interface DocumentSchema {
  sections: DocumentSection[];
}

export interface CustomDocument {
  id: string;
  dealer_account_id: string;
  code: string;
  name: string;
  icon: string;
  description?: string;
  schema: DocumentSchema;
  terms_and_conditions?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// All fields used across existing documents for reuse in custom documents
export const EXISTING_DOCUMENT_FIELDS: { key: string; label: string; category: string }[] = [
  // Company fields
  { key: 'companyName', label: 'Company Name', category: 'Company' },
  { key: 'companyAddress', label: 'Company Address', category: 'Company' },
  { key: 'companyCity', label: 'Company City', category: 'Company' },
  { key: 'companyState', label: 'Company State', category: 'Company' },
  { key: 'companyZip', label: 'Company Zip', category: 'Company' },
  { key: 'companyPhone', label: 'Company Phone', category: 'Company' },
  { key: 'customerNumber', label: 'Customer Number', category: 'Company' },
  
  // Ship To fields
  { key: 'shipToCompany', label: 'Ship To Company', category: 'Ship To' },
  { key: 'shipToAddress', label: 'Ship To Address', category: 'Ship To' },
  { key: 'shipToCity', label: 'Ship To City', category: 'Ship To' },
  { key: 'shipToState', label: 'Ship To State', category: 'Ship To' },
  { key: 'shipToZip', label: 'Ship To Zip', category: 'Ship To' },
  { key: 'shipToContact', label: 'Ship To Contact Name', category: 'Ship To' },
  { key: 'shipToEmail', label: 'Ship To Email', category: 'Ship To' },
  { key: 'shipToPhone', label: 'Ship To Phone', category: 'Ship To' },
  
  // Bill To fields
  { key: 'billToCompany', label: 'Bill To Company', category: 'Bill To' },
  { key: 'billToAddress', label: 'Bill To Address', category: 'Bill To' },
  { key: 'billToCity', label: 'Bill To City', category: 'Bill To' },
  { key: 'billToState', label: 'Bill To State', category: 'Bill To' },
  { key: 'billToZip', label: 'Bill To Zip', category: 'Bill To' },
  { key: 'apContactName', label: 'AP Contact Name', category: 'Bill To' },
  { key: 'apContactEmail', label: 'AP Contact Email', category: 'Bill To' },
  { key: 'apContactPhone', label: 'AP Contact Phone', category: 'Bill To' },
  
  // Deal fields
  { key: 'dealName', label: 'Deal Name', category: 'Deal' },
  { key: 'dealAmount', label: 'Deal Amount', category: 'Deal' },
  { key: 'closeDate', label: 'Close Date', category: 'Deal' },
  
  // Owner fields
  { key: 'ownerName', label: 'Sales Rep Name', category: 'Owner' },
  { key: 'ownerEmail', label: 'Sales Rep Email', category: 'Owner' },
  { key: 'ownerPhone', label: 'Sales Rep Phone', category: 'Owner' },
  
  // IT Contact fields
  { key: 'itContactName', label: 'IT Contact Name', category: 'Contacts' },
  { key: 'itContactEmail', label: 'IT Contact Email', category: 'Contacts' },
  { key: 'itContactPhone', label: 'IT Contact Phone', category: 'Contacts' },
];

export const AVAILABLE_ICONS = [
  'FileText',
  'File',
  'FilePlus',
  'FileCheck',
  'FileSignature',
  'ClipboardList',
  'ClipboardCheck',
  'Receipt',
  'Truck',
  'Package',
  'PackageCheck',
  'Building2',
  'Warehouse',
  'Settings',
  'Wrench',
  'ShieldCheck',
  'CheckCircle',
  'Send',
  'Mail',
  'MailCheck',
  'Users',
  'UserCheck',
  'Calendar',
  'DollarSign',
  'CreditCard',
];
