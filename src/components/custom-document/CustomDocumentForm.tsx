import { useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';
import { TableSectionRenderer } from './TableSectionRenderer';
import type { CustomDocument, DocumentSection, DocumentField } from '@/components/admin/types';
import { EXISTING_DOCUMENT_FIELDS } from '@/components/admin/types';

interface LabeledContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface LabeledContacts {
  shippingContact: LabeledContact | null;
  apContact: LabeledContact | null;
  itContact: LabeledContact | null;
}

interface RawProperties {
  company: Record<string, any>;
  deal: Record<string, any>;
  owner: Record<string, any>;
}

interface CustomDocumentFormProps {
  document: CustomDocument;
  formData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  company?: any;
  deal?: any;
  dealOwner?: any;
  lineItems?: any[];
  labeledContacts?: LabeledContacts | null;
  properties?: RawProperties;
}

export function CustomDocumentForm({
  document,
  formData,
  onChange,
  company,
  deal,
  dealOwner,
  lineItems = [],
  labeledContacts,
  properties,
}: CustomDocumentFormProps) {
  // Resolve value from existing document fields
  const resolveExistingField = useCallback((key: string): string => {
    const mappings: Record<string, () => string> = {
      companyName: () => company?.properties?.name || company?.name || '',
      companyAddress: () => company?.properties?.address || company?.address || '',
      companyCity: () => company?.properties?.city || company?.city || '',
      companyState: () => company?.properties?.state || company?.state || '',
      companyZip: () => company?.properties?.zip || company?.zip || '',
      companyPhone: () => company?.properties?.phone || company?.phone || '',
      customerNumber: () => company?.properties?.customer_number || '',
      
      shipToCompany: () => company?.properties?.name || company?.name || '',
      shipToAddress: () => company?.properties?.delivery_address || company?.deliveryAddress || '',
      shipToCity: () => company?.properties?.delivery_city || company?.deliveryCity || '',
      shipToState: () => company?.properties?.delivery_state || company?.deliveryState || '',
      shipToZip: () => company?.properties?.delivery_zip || company?.deliveryZip || '',
      shipToContact: () => labeledContacts?.shippingContact 
        ? `${labeledContacts.shippingContact.firstName} ${labeledContacts.shippingContact.lastName}`.trim() 
        : '',
      shipToEmail: () => labeledContacts?.shippingContact?.email || '',
      shipToPhone: () => labeledContacts?.shippingContact?.phone || '',
      
      billToCompany: () => company?.properties?.name || company?.name || '',
      billToAddress: () => company?.properties?.address || company?.address || '',
      billToCity: () => company?.properties?.city || company?.city || '',
      billToState: () => company?.properties?.state || company?.state || '',
      billToZip: () => company?.properties?.zip || company?.zip || '',
      apContactName: () => labeledContacts?.apContact 
        ? `${labeledContacts.apContact.firstName} ${labeledContacts.apContact.lastName}`.trim() 
        : '',
      apContactEmail: () => labeledContacts?.apContact?.email || '',
      apContactPhone: () => labeledContacts?.apContact?.phone || '',
      
      dealName: () => deal?.properties?.dealname || deal?.dealname || '',
      dealAmount: () => deal?.properties?.amount || deal?.amount || '',
      closeDate: () => deal?.properties?.closedate || deal?.closedate || '',
      
      ownerName: () => dealOwner 
        ? `${dealOwner.firstName || ''} ${dealOwner.lastName || ''}`.trim() 
        : '',
      ownerEmail: () => dealOwner?.email || '',
      ownerPhone: () => dealOwner?.phone || '',
      
      itContactName: () => labeledContacts?.itContact 
        ? `${labeledContacts.itContact.firstName} ${labeledContacts.itContact.lastName}`.trim() 
        : '',
      itContactEmail: () => labeledContacts?.itContact?.email || '',
      itContactPhone: () => labeledContacts?.itContact?.phone || '',
    };
    
    return mappings[key]?.() || '';
  }, [company, deal, dealOwner, labeledContacts]);

  // Resolve value from HubSpot field mapping - uses raw properties first, then structured data
  const resolveHubSpotField = useCallback((object: string, property: string): string => {
    // First try raw properties (from field mappings)
    if (properties) {
      switch (object) {
        case 'company':
          if (properties.company?.[property]) return String(properties.company[property]);
          break;
        case 'deal':
          if (properties.deal?.[property]) return String(properties.deal[property]);
          break;
        case 'owner':
          if (properties.owner?.[property]) return String(properties.owner[property]);
          break;
      }
    }
    
    // Fallback to structured data
    switch (object) {
      case 'company':
        return company?.properties?.[property] || company?.[property] || '';
      case 'deal':
        return deal?.properties?.[property] || deal?.[property] || '';
      case 'contact':
        return labeledContacts?.shippingContact?.[property as keyof LabeledContact] || '';
      case 'owner':
        return dealOwner?.[property] || '';
      default:
        return '';
    }
  }, [company, deal, dealOwner, labeledContacts, properties]);

  // Pre-populate fields on mount
  useEffect(() => {
    const sections = document.schema?.sections || [];
    const initialData: Record<string, any> = { ...formData };
    let hasChanges = false;

    sections.forEach((section) => {
      if (section.type === 'fields' && section.fields) {
        section.fields.forEach((field) => {
          // Only pre-populate if field is empty
          if (!initialData[field.id]) {
            let value = '';
            
            if (field.mapping.source === 'existing' && field.mapping.existingFieldKey) {
              value = resolveExistingField(field.mapping.existingFieldKey);
            } else if (field.mapping.source === 'hubspot' && field.mapping.object && field.mapping.property) {
              value = resolveHubSpotField(field.mapping.object, field.mapping.property);
            }
            
            if (value) {
              initialData[field.id] = value;
              hasChanges = true;
            }
          }
        });
      }
    });

    if (hasChanges) {
      onChange(initialData);
    }
  }, [document.schema, resolveExistingField, resolveHubSpotField]);

  const updateField = (fieldId: string, value: any) => {
    onChange({ ...formData, [fieldId]: value });
  };

  const updateTableRows = (sectionId: string, rows: any[]) => {
    onChange({ ...formData, [`table_${sectionId}`]: rows });
  };

  const renderSection = (section: DocumentSection) => {
    switch (section.type) {
      case 'header':
        return (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Header section will display dealer logo and company information on the generated document.
              </p>
            </CardContent>
          </Card>
        );

      case 'fields':
        return (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-4">
                {(section.fields || []).map((field) => (
                  <DynamicFieldRenderer
                    key={field.id}
                    field={field}
                    value={formData[field.id]}
                    onChange={(value) => updateField(field.id, value)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'table':
        return (
          <Card key={section.id}>
            <CardContent className="pt-6">
              <TableSectionRenderer
                section={section}
                rows={formData[`table_${section.id}`] || []}
                onChange={(rows) => updateTableRows(section.id, rows)}
                lineItems={lineItems}
              />
            </CardContent>
          </Card>
        );

      case 'signature':
        return (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{section.signerLabel || 'Signature'}</Label>
                  <Input
                    value={formData[`sig_${section.id}_name`] || ''}
                    onChange={(e) => updateField(`sig_${section.id}_name`, e.target.value)}
                    placeholder="Type full name"
                    className="font-script italic"
                  />
                </div>
                {section.includeDateLine && (
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      value={formData[`sig_${section.id}_date`] || new Date().toLocaleDateString()}
                      onChange={(e) => updateField(`sig_${section.id}_date`, e.target.value)}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'terms':
        return (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {section.showTerms 
                  ? 'Terms and conditions will be displayed on the generated document.' 
                  : 'Terms section is hidden.'}
              </p>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const sections = document.schema?.sections || [];

  return (
    <div className="space-y-4">
      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>This document has no sections configured.</p>
            <p className="text-sm">Edit the document in Admin Settings to add sections.</p>
          </CardContent>
        </Card>
      ) : (
        sections.map(renderSection)
      )}
    </div>
  );
}
