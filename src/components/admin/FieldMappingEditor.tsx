import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, RefreshCw, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FieldMapping, 
  FieldMappingsGrouped, 
  HubSpotPropertiesResponse,
  EXISTING_DOCUMENT_FIELDS 
} from './types';

interface FieldMappingEditorProps {
  portalId: string;
}

const ALL_FORM_TYPES = [
  { code: 'quote', name: 'Quote' },
  { code: 'installation', name: 'Installation' },
  { code: 'service_agreement', name: 'Service Agreement' },
  { code: 'fmv_lease', name: 'FMV Lease' },
  { code: 'lease_funding', name: 'Lease Funding' },
  { code: 'loi', name: 'Letter of Intent' },
  { code: 'lease_return', name: 'Lease Return' },
  { code: 'interterritorial', name: 'Interterritorial' },
  { code: 'new_customer', name: 'New Customer' },
  { code: 'relocation', name: 'Relocation' },
  { code: 'equipment_removal', name: 'Equipment Removal' },
];

export function FieldMappingEditor({ portalId }: FieldMappingEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  
  const [hubspotProperties, setHubspotProperties] = useState<HubSpotPropertiesResponse | null>(null);
  const [mappings, setMappings] = useState<FieldMappingsGrouped>({ global: [] });
  
  const [isPerDocument, setIsPerDocument] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('quote');

  // Group existing fields by category
  const fieldsByCategory = EXISTING_DOCUMENT_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof EXISTING_DOCUMENT_FIELDS>);

  // Load HubSpot properties
  const loadHubSpotProperties = useCallback(async () => {
    setLoadingProperties(true);
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-get-properties', {
        body: { portalId },
      });

      if (error) throw error;
      setHubspotProperties(data);
    } catch (error) {
      console.error('Error loading HubSpot properties:', error);
      toast.error('Failed to load HubSpot properties');
    } finally {
      setLoadingProperties(false);
    }
  }, [portalId]);

  // Load existing mappings
  const loadMappings = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('field-mappings-save', {
        body: { portalId, action: 'get' },
      });

      if (error) throw error;
      if (data?.mappings) {
        setMappings(data.mappings);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    }
  }, [portalId]);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([loadHubSpotProperties(), loadMappings()]);
      setLoading(false);
    };
    initialize();
  }, [loadHubSpotProperties, loadMappings]);

  const getCurrentMappings = () => {
    if (isPerDocument) {
      return mappings[selectedDocumentType] || [];
    }
    return mappings.global || [];
  };

  const getFieldMapping = (fieldKey: string): FieldMapping | undefined => {
    return getCurrentMappings().find((m) => m.field_key === fieldKey);
  };

  const updateFieldMapping = (
    fieldKey: string,
    hubspotObject: string,
    hubspotProperty: string,
    associationLabel?: string,
    associationPath?: string
  ) => {
    const scope = isPerDocument ? selectedDocumentType : 'global';
    
    setMappings((prev) => {
      const current = prev[scope] || [];
      const existingIndex = current.findIndex((m) => m.field_key === fieldKey);
      
      const newMapping: FieldMapping = {
        field_key: fieldKey,
        hubspot_object: hubspotObject,
        hubspot_property: hubspotProperty,
        association_label: associationLabel,
        association_path: associationPath,
      };

      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = newMapping;
        return { ...prev, [scope]: updated };
      }
      
      return { ...prev, [scope]: [...current, newMapping] };
    });
  };

  const removeFieldMapping = (fieldKey: string) => {
    const scope = isPerDocument ? selectedDocumentType : 'global';
    
    setMappings((prev) => ({
      ...prev,
      [scope]: (prev[scope] || []).filter((m) => m.field_key !== fieldKey),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const scope = isPerDocument ? selectedDocumentType : null;
      const mappingsToSave = isPerDocument 
        ? mappings[selectedDocumentType] || []
        : mappings.global || [];

      const { error } = await supabase.functions.invoke('field-mappings-save', {
        body: { 
          portalId, 
          action: 'save', 
          mappings: mappingsToSave,
          documentType: scope,
        },
      });

      if (error) throw error;
      toast.success('Field mappings saved successfully');
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast.error('Failed to save field mappings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            HubSpot Field Mappings
          </CardTitle>
          <CardDescription>
            Map document fields to HubSpot properties. Set global defaults or customize per document type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scope Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <Label className="text-sm font-medium">Mapping Scope</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {isPerDocument 
                  ? 'Configure mappings for each document type individually' 
                  : 'Set global defaults that apply to all documents'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={!isPerDocument ? 'font-medium' : 'text-muted-foreground'}>Global</span>
              <Switch checked={isPerDocument} onCheckedChange={setIsPerDocument} />
              <span className={isPerDocument ? 'font-medium' : 'text-muted-foreground'}>Per-Document</span>
            </div>
          </div>

          {/* Document Type Selector (when per-document mode) */}
          {isPerDocument && (
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_FORM_TYPES.map((doc) => (
                    <SelectItem key={doc.code} value={doc.code}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Refresh Properties Button */}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadHubSpotProperties}
              disabled={loadingProperties}
            >
              {loadingProperties ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh HubSpot Properties
            </Button>
          </div>

          {/* Field Mappings by Category */}
          {Object.entries(fieldsByCategory).map(([category, fields]) => (
            <div key={category} className="space-y-3">
              <h4 className="font-medium text-sm border-b pb-2">{category} Fields</h4>
              <div className="grid gap-3">
                {fields.map((field) => {
                  const mapping = getFieldMapping(field.key);
                  
                  return (
                    <FieldMappingRow
                      key={field.key}
                      fieldKey={field.key}
                      fieldLabel={field.label}
                      mapping={mapping}
                      hubspotProperties={hubspotProperties}
                      onUpdate={updateFieldMapping}
                      onRemove={removeFieldMapping}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Mappings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface FieldMappingRowProps {
  fieldKey: string;
  fieldLabel: string;
  mapping?: FieldMapping;
  hubspotProperties: HubSpotPropertiesResponse | null;
  onUpdate: (fieldKey: string, object: string, property: string, label?: string, path?: string) => void;
  onRemove: (fieldKey: string) => void;
}

function FieldMappingRow({ 
  fieldKey, 
  fieldLabel, 
  mapping, 
  hubspotProperties, 
  onUpdate,
  onRemove,
}: FieldMappingRowProps) {
  const [selectedObject, setSelectedObject] = useState(mapping?.hubspot_object || '');
  const [selectedProperty, setSelectedProperty] = useState(mapping?.hubspot_property || '');
  const [selectedLabel, setSelectedLabel] = useState(mapping?.association_label || '');
  const [selectedPath, setSelectedPath] = useState(mapping?.association_path || '');

  const objectOptions = hubspotProperties?.objects || {};
  const selectedObjectData = objectOptions[selectedObject];
  
  // Show association path dropdown only for contact object
  const showAssociationPath = selectedObject === 'contact';
  // Show association label when "Via Company" path is selected (required to identify which contact)
  const showAssociationLabel = selectedObject === 'contact' && selectedPath === 'company_contact';

  const handleObjectChange = (value: string) => {
    setSelectedObject(value);
    setSelectedProperty('');
    setSelectedLabel('');
    setSelectedPath('');
  };

  const handlePathChange = (value: string) => {
    const effectiveValue = value === '__direct__' ? '' : value;
    setSelectedPath(effectiveValue);
    // Clear label when switching to direct
    if (!effectiveValue) {
      setSelectedLabel('');
    }
    if (selectedProperty) {
      onUpdate(fieldKey, selectedObject, selectedProperty, effectiveValue ? selectedLabel : undefined, effectiveValue || undefined);
    }
  };

  const handlePropertyChange = (value: string) => {
    setSelectedProperty(value);
    onUpdate(fieldKey, selectedObject, value, showAssociationLabel ? selectedLabel : undefined, selectedPath || undefined);
  };

  const handleLabelChange = (value: string) => {
    const effectiveValue = value === '__none__' ? '' : value;
    setSelectedLabel(effectiveValue);
    if (selectedProperty) {
      onUpdate(fieldKey, selectedObject, selectedProperty, effectiveValue || undefined, selectedPath || undefined);
    }
  };

  const handleClear = () => {
    setSelectedObject('');
    setSelectedProperty('');
    setSelectedLabel('');
    setSelectedPath('');
    onRemove(fieldKey);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center p-2 rounded border bg-card">
      <div className="col-span-2">
        <span className="text-sm font-medium">{fieldLabel}</span>
      </div>
      
      {/* Object Dropdown */}
      <div className="col-span-2">
        <Select value={selectedObject} onValueChange={handleObjectChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Object..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(objectOptions)
              .filter(([_, obj]) => obj && obj.label)
              .map(([key, obj]) => (
                <SelectItem key={key} value={key}>
                  {obj.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Association Path Dropdown (only for Contact) */}
      {showAssociationPath ? (
        <div className="col-span-2">
          <Select value={selectedPath || '__direct__'} onValueChange={handlePathChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Path..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__direct__">Direct (Deal)</SelectItem>
              <SelectItem value="company_contact">Via Company</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="col-span-2" />
      )}

      {/* Property Dropdown */}
      <div className="col-span-2">
        <Select 
          value={selectedProperty} 
          onValueChange={handlePropertyChange}
          disabled={!selectedObject}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Property..." />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {(selectedObjectData?.properties || [])
              .filter((prop) => prop && prop.name && prop.label)
              .map((prop) => (
                <SelectItem key={prop.name} value={prop.name}>
                  {prop.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Association Label Dropdown (required when Via Company) */}
      {showAssociationLabel ? (
        <div className="col-span-2">
          <Select value={selectedLabel || '__none__'} onValueChange={handleLabelChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Label (required)..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select label...</SelectItem>
              {(hubspotProperties?.associationLabels || [])
                .filter((label) => label && label.id && label.label)
                .map((label) => (
                  <SelectItem key={label.id} value={label.id}>
                    {label.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="col-span-2" />
      )}

      <div className="col-span-2 flex justify-end">
        {(selectedObject || selectedProperty) && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 px-2 text-xs">
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
