import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import { FORM_REGISTRIES, type FormCustomizationMap, type FormCustomizationConfig } from '@/lib/formCustomization';

const DOC_TYPE_OPTIONS = [
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
  { code: 'commission', name: 'Commission' },
];

interface FormCustomizationTabProps {
  value: FormCustomizationMap;
  onChange: (value: FormCustomizationMap) => void;
}

export function FormCustomizationTab({ value, onChange }: FormCustomizationTabProps) {
  const [selectedDocType, setSelectedDocType] = useState('quote');

  const registry = FORM_REGISTRIES[selectedDocType];
  const config: FormCustomizationConfig = value[selectedDocType] || {};
  const hiddenSections = config.hiddenSections || [];
  const fieldLabels = config.fieldLabels || {};

  const updateConfig = (patch: Partial<FormCustomizationConfig>) => {
    onChange({
      ...value,
      [selectedDocType]: { ...config, ...patch },
    });
  };

  const toggleSection = (sectionKey: string) => {
    const isHidden = hiddenSections.includes(sectionKey);
    const next = isHidden
      ? hiddenSections.filter((k) => k !== sectionKey)
      : [...hiddenSections, sectionKey];
    updateConfig({ hiddenSections: next });
  };

  const updateFieldLabel = (fieldKey: string, newLabel: string) => {
    const next = { ...fieldLabels, [fieldKey]: newLabel };
    // Remove if empty (revert to default)
    if (!newLabel.trim()) delete next[fieldKey];
    updateConfig({ fieldLabels: next });
  };

  const resetFieldLabel = (fieldKey: string) => {
    const next = { ...fieldLabels };
    delete next[fieldKey];
    updateConfig({ fieldLabels: next });
  };

  if (!registry) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Form Customization</CardTitle>
          <CardDescription>
            Rename fields and hide sections. Changes apply to both the form and the output document (PDF).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={selectedDocType} onValueChange={setSelectedDocType}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPE_OPTIONS.map((dt) => (
                  <SelectItem key={dt.code} value={dt.code}>
                    {dt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Sections</CardTitle>
          <CardDescription className="text-xs">
            Toggle sections on/off. Hidden sections won't appear in the form or the generated document.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {registry.sections.map((section) => {
              const isVisible = !hiddenSections.includes(section.key);
              return (
                <div
                  key={section.key}
                  className="flex items-center justify-between py-2 px-3 rounded-md border"
                >
                  <div className="flex items-center gap-2">
                    {isVisible ? (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                    )}
                    <span className={!isVisible ? 'text-muted-foreground line-through' : ''}>
                      {section.defaultTitle}
                    </span>
                  </div>
                  <Switch
                    checked={isVisible}
                    onCheckedChange={() => toggleSection(section.key)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Field Labels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Field Labels</CardTitle>
          <CardDescription className="text-xs">
            Rename field labels. Leave blank to use the default label.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {registry.sections
              .filter((s) => !hiddenSections.includes(s.key))
              .map((section) => {
                const sectionFields = registry.fields.filter((f) => f.section === section.key);
                if (sectionFields.length === 0) return null;
                return (
                  <div key={section.key}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      {section.defaultTitle}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {sectionFields.map((field) => {
                        const customLabel = fieldLabels[field.key] || '';
                        const isCustomized = !!customLabel;
                        return (
                          <div key={field.key} className="flex items-center gap-2">
                            <Input
                              className="h-8 text-sm"
                              placeholder={field.defaultLabel}
                              value={customLabel}
                              onChange={(e) => updateFieldLabel(field.key, e.target.value)}
                            />
                            {isCustomized && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0"
                                onClick={() => resetFieldLabel(field.key)}
                                title="Reset to default"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
