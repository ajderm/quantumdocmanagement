import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, Plus, Trash2, GripVertical, Save, 
  FileText, ArrowUp, ArrowDown, Edit2, X, ChevronDown, ChevronUp, Eye, EyeOff, Copy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IconSelector } from './IconSelector';
import { CustomDocumentPreview } from '@/components/custom-document/CustomDocumentPreview';
import { 
  CustomDocument, 
  DocumentSchema, 
  DocumentSection, 
  DocumentField,
  TableColumn,
  EXISTING_DOCUMENT_FIELDS,
  HubSpotPropertiesResponse,
} from './types';

interface CustomDocumentBuilderProps {
  portalId: string;
}

const SECTION_TYPES = [
  { type: 'header', label: 'Header (Logo & Company Info)', icon: FileText },
  { type: 'fields', label: 'Field Section', icon: FileText },
  { type: 'table', label: 'Table (Equipment/Products)', icon: FileText },
  { type: 'signature', label: 'Signature Block', icon: FileText },
  { type: 'terms', label: 'Terms & Conditions', icon: FileText },
];

const FIELD_TYPES = [
  { type: 'text', label: 'Text Input' },
  { type: 'textarea', label: 'Text Area' },
  { type: 'date', label: 'Date Picker' },
  { type: 'dropdown', label: 'Dropdown' },
  { type: 'checkbox', label: 'Checkbox' },
];

const FIELD_WIDTHS = [
  { value: 'full', label: 'Full Width' },
  { value: 'half', label: 'Half Width' },
  { value: 'third', label: 'One Third' },
];

export function CustomDocumentBuilder({ portalId }: CustomDocumentBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<CustomDocument[]>([]);
  const [hubspotProperties, setHubspotProperties] = useState<HubSpotPropertiesResponse | null>(null);
  
  // Editor state
  const [editingDocument, setEditingDocument] = useState<Partial<CustomDocument> | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load documents and HubSpot properties
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsResult, propsResult] = await Promise.all([
        supabase.functions.invoke('custom-document-save', {
          body: { portalId, action: 'list' },
        }),
        supabase.functions.invoke('hubspot-get-properties', {
          body: { portalId },
        }),
      ]);

      if (docsResult.data?.documents) {
        setDocuments(docsResult.data.documents);
      }
      if (propsResult.data) {
        setHubspotProperties(propsResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load custom documents');
    } finally {
      setLoading(false);
    }
  }, [portalId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateNew = () => {
    if (documents.length >= 10) {
      toast.error('Maximum of 10 custom documents allowed');
      return;
    }

    setEditingDocument({
      name: '',
      icon: 'FileText',
      description: '',
      schema: { sections: [] },
      terms_and_conditions: '',
      is_active: true,
      sort_order: documents.length * 10 + 10,
    });
    setIsEditorOpen(true);
  };

  const handleEdit = (doc: CustomDocument) => {
    setEditingDocument({ ...doc });
    setIsEditorOpen(true);
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error } = await supabase.functions.invoke('custom-document-save', {
        body: { portalId, action: 'delete', documentId: docId },
      });

      if (error) throw error;
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleToggleActive = async (doc: CustomDocument) => {
    try {
      const { error } = await supabase.functions.invoke('custom-document-save', {
        body: { 
          portalId, 
          action: 'update', 
          documentId: doc.id,
          document: { ...doc, is_active: !doc.is_active },
        },
      });

      if (error) throw error;
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, is_active: !d.is_active } : d))
      );
    } catch (error) {
      console.error('Error toggling document:', error);
      toast.error('Failed to update document');
    }
  };

  const handleDuplicate = async (doc: CustomDocument) => {
    if (documents.length >= 10) {
      toast.error('Maximum of 10 custom documents allowed');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('custom-document-save', {
        body: { 
          portalId, 
          action: 'create',
          document: {
            name: `${doc.name} (Copy)`,
            icon: doc.icon,
            description: doc.description,
            schema: doc.schema,
            terms_and_conditions: doc.terms_and_conditions,
            is_active: false, // Start inactive
            sort_order: (documents.length + 1) * 10,
          },
        },
      });

      if (error) throw error;
      if (data?.document) {
        setDocuments(prev => [...prev, data.document]);
        toast.success('Document duplicated successfully');
      }
    } catch (error) {
      console.error('Error duplicating document:', error);
      toast.error('Failed to duplicate document');
    }
  };

  const handleSaveDocument = async () => {
    if (!editingDocument?.name?.trim()) {
      toast.error('Document name is required');
      return;
    }

    setSaving(true);
    try {
      const action = editingDocument.id ? 'update' : 'create';
      const { data, error } = await supabase.functions.invoke('custom-document-save', {
        body: { 
          portalId, 
          action,
          documentId: editingDocument.id,
          document: editingDocument,
        },
      });

      if (error) throw error;

      if (action === 'create' && data?.document) {
        setDocuments((prev) => [...prev, data.document]);
      } else if (action === 'update' && data?.document) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === data.document.id ? data.document : d))
        );
      }

      setIsEditorOpen(false);
      setEditingDocument(null);
      toast.success(`Document ${action === 'create' ? 'created' : 'updated'} successfully`);
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  // Section management
  const addSection = (type: string) => {
    if (!editingDocument) return;

    const newSection: DocumentSection = {
      id: `section_${Date.now()}`,
      title: type === 'header' ? 'Document Header' : `New ${type} Section`,
      type: type as DocumentSection['type'],
      ...(type === 'header' && { showDealerLogo: true, showDealerAddress: true }),
      ...(type === 'fields' && { fields: [] }),
      ...(type === 'table' && { columns: [], maxRows: 20 }),
      ...(type === 'signature' && { signerLabel: 'Authorized Signature', includeDateLine: true }),
      ...(type === 'terms' && { showTerms: true }),
    };

    setEditingDocument((prev) => ({
      ...prev,
      schema: {
        sections: [...(prev?.schema?.sections || []), newSection],
      },
    }));
    setExpandedSection(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<DocumentSection>) => {
    setEditingDocument((prev) => ({
      ...prev,
      schema: {
        sections: (prev?.schema?.sections || []).map((s) =>
          s.id === sectionId ? { ...s, ...updates } : s
        ),
      },
    }));
  };

  const removeSection = (sectionId: string) => {
    setEditingDocument((prev) => ({
      ...prev,
      schema: {
        sections: (prev?.schema?.sections || []).filter((s) => s.id !== sectionId),
      },
    }));
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    setEditingDocument((prev) => {
      const sections = [...(prev?.schema?.sections || [])];
      [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
      return { ...prev, schema: { sections } };
    });
  };

  const moveSectionDown = (index: number) => {
    const sections = editingDocument?.schema?.sections || [];
    if (index >= sections.length - 1) return;
    setEditingDocument((prev) => {
      const newSections = [...(prev?.schema?.sections || [])];
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      return { ...prev, schema: { sections: newSections } };
    });
  };

  // Field management
  const addField = (sectionId: string) => {
    const newField: DocumentField = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      mapping: { source: 'manual' },
      required: false,
      width: 'half',
    };

    setEditingDocument((prev) => ({
      ...prev,
      schema: {
        sections: (prev?.schema?.sections || []).map((s) =>
          s.id === sectionId
            ? { ...s, fields: [...(s.fields || []), newField] }
            : s
        ),
      },
    }));
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<DocumentField>) => {
    setEditingDocument((prev) => ({
      ...prev,
      schema: {
        sections: (prev?.schema?.sections || []).map((s) =>
          s.id === sectionId
            ? {
                ...s,
                fields: (s.fields || []).map((f) =>
                  f.id === fieldId ? { ...f, ...updates } : f
                ),
              }
            : s
        ),
      },
    }));
  };

  const removeField = (sectionId: string, fieldId: string) => {
    setEditingDocument((prev) => ({
      ...prev,
      schema: {
        sections: (prev?.schema?.sections || []).map((s) =>
          s.id === sectionId
            ? { ...s, fields: (s.fields || []).filter((f) => f.id !== fieldId) }
            : s
        ),
      },
    }));
  };

  // Table column management
  const addColumn = (sectionId: string) => {
    const newColumn: TableColumn = {
      id: `col_${Date.now()}`,
      label: 'New Column',
      mapping: { source: 'manual' },
    };

    setEditingDocument((prev) => ({
      ...prev,
      schema: {
        sections: (prev?.schema?.sections || []).map((s) =>
          s.id === sectionId
            ? { ...s, columns: [...(s.columns || []), newColumn] }
            : s
        ),
      },
    }));
  };

  const updateColumn = (sectionId: string, columnId: string, updates: Partial<TableColumn>) => {
    setEditingDocument((prev) => ({
      ...prev,
      schema: {
        sections: (prev?.schema?.sections || []).map((s) =>
          s.id === sectionId
            ? {
                ...s,
                columns: (s.columns || []).map((c) =>
                  c.id === columnId ? { ...c, ...updates } : c
                ),
              }
            : s
        ),
      },
    }));
  };

  const removeColumn = (sectionId: string, columnId: string) => {
    setEditingDocument((prev) => ({
      ...prev,
      schema: {
        sections: (prev?.schema?.sections || []).map((s) =>
          s.id === sectionId
            ? { ...s, columns: (s.columns || []).filter((c) => c.id !== columnId) }
            : s
        ),
      },
    }));
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
            <FileText className="h-5 w-5" />
            Custom Documents ({documents.length}/10)
          </CardTitle>
          <CardDescription>
            Create custom document templates with your own fields and layout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document List */}
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No custom documents yet</p>
              <p className="text-sm">Create your first custom document template</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={doc.is_active}
                      onCheckedChange={() => handleToggleActive(doc)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(doc)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDuplicate(doc)} title="Duplicate">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Button */}
          <Button onClick={handleCreateNew} disabled={documents.length >= 10} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create New Document
          </Button>
        </CardContent>
      </Card>

      {/* Document Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={(open) => { setIsEditorOpen(open); setShowPreview(false); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {editingDocument?.id ? 'Edit Document' : 'Create New Document'}
                </DialogTitle>
                <DialogDescription>
                  Configure your custom document template
                </DialogDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>
          </DialogHeader>

          {editingDocument && (
            <div className={`flex-1 overflow-hidden ${showPreview ? 'grid grid-cols-2 gap-4' : ''}`}>
              {/* Editor Panel */}
              <ScrollArea className="h-[calc(90vh-180px)] pr-4">
                <div className="space-y-6 pb-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Document Name *</Label>
                  <Input
                    value={editingDocument.name || ''}
                    onChange={(e) =>
                      setEditingDocument((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Customer Onboarding Form"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <IconSelector
                    value={editingDocument.icon || 'FileText'}
                    onChange={(icon) =>
                      setEditingDocument((prev) => ({ ...prev, icon }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingDocument.description || ''}
                  onChange={(e) =>
                    setEditingDocument((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief description of this document"
                  rows={2}
                />
              </div>

              <Separator />

              {/* Document Structure */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Document Sections</Label>
                </div>

                {/* Add Section Buttons */}
                <div className="flex flex-wrap gap-2">
                  {SECTION_TYPES.map((sectionType) => (
                    <Button
                      key={sectionType.type}
                      variant="outline"
                      size="sm"
                      onClick={() => addSection(sectionType.type)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {sectionType.label}
                    </Button>
                  ))}
                </div>

                {/* Sections List */}
                <div className="space-y-2">
                  {(editingDocument.schema?.sections || []).map((section, index) => (
                    <SectionEditor
                      key={section.id}
                      section={section}
                      index={index}
                      totalSections={(editingDocument.schema?.sections || []).length}
                      expanded={expandedSection === section.id}
                      onToggleExpand={() =>
                        setExpandedSection(
                          expandedSection === section.id ? null : section.id
                        )
                      }
                      onUpdate={(updates) => updateSection(section.id, updates)}
                      onRemove={() => removeSection(section.id)}
                      onMoveUp={() => moveSectionUp(index)}
                      onMoveDown={() => moveSectionDown(index)}
                      onAddField={() => addField(section.id)}
                      onUpdateField={(fieldId, updates) =>
                        updateField(section.id, fieldId, updates)
                      }
                      onRemoveField={(fieldId) => removeField(section.id, fieldId)}
                      onAddColumn={() => addColumn(section.id)}
                      onUpdateColumn={(columnId, updates) =>
                        updateColumn(section.id, columnId, updates)
                      }
                      onRemoveColumn={(columnId) => removeColumn(section.id, columnId)}
                      hubspotProperties={hubspotProperties}
                    />
                  ))}
                </div>

                {(editingDocument.schema?.sections || []).length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                    <p>No sections yet</p>
                    <p className="text-sm">Add sections using the buttons above</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Terms & Conditions */}
              <div className="space-y-2">
                <Label>Default Terms & Conditions</Label>
                <Textarea
                  value={editingDocument.terms_and_conditions || ''}
                  onChange={(e) =>
                    setEditingDocument((prev) => ({
                      ...prev,
                      terms_and_conditions: e.target.value,
                    }))
                  }
                  placeholder="Enter default terms and conditions for this document..."
                  rows={4}
                />
              </div>
                </div>
              </ScrollArea>

              {/* Preview Panel */}
              {showPreview && (
                <ScrollArea className="h-[calc(90vh-180px)] border rounded-lg bg-muted/30">
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground mb-2 uppercase font-medium">Live Preview</div>
                    <div className="transform scale-[0.6] origin-top-left w-[166%]">
                      <CustomDocumentPreview
                        document={editingDocument as CustomDocument}
                        formData={{}}
                        dealerInfo={null}
                      />
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDocument} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Section Editor Component
interface SectionEditorProps {
  section: DocumentSection;
  index: number;
  totalSections: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<DocumentSection>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddField: () => void;
  onUpdateField: (fieldId: string, updates: Partial<DocumentField>) => void;
  onRemoveField: (fieldId: string) => void;
  onAddColumn: () => void;
  onUpdateColumn: (columnId: string, updates: Partial<TableColumn>) => void;
  onRemoveColumn: (columnId: string) => void;
  hubspotProperties: HubSpotPropertiesResponse | null;
}

function SectionEditor({
  section,
  index,
  totalSections,
  expanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddField,
  onUpdateField,
  onRemoveField,
  onAddColumn,
  onUpdateColumn,
  onRemoveColumn,
  hubspotProperties,
}: SectionEditorProps) {
  return (
    <div className="border rounded-lg bg-card">
      {/* Section Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">{section.type}</span>
          <span className="font-medium">{section.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={index === totalSections - 1}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Section Content */}
      {expanded && (
        <div className="p-4 border-t space-y-4">
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input
              value={section.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
            />
          </div>

          {/* Header Section Options */}
          {section.type === 'header' && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={section.showDealerLogo ?? true}
                  onChange={(e) => onUpdate({ showDealerLogo: e.target.checked })}
                />
                <span className="text-sm">Show Logo</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={section.showDealerAddress ?? true}
                  onChange={(e) => onUpdate({ showDealerAddress: e.target.checked })}
                />
                <span className="text-sm">Show Address</span>
              </label>
            </div>
          )}

          {/* Fields Section */}
          {section.type === 'fields' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button variant="outline" size="sm" onClick={onAddField}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Field
                </Button>
              </div>
              <div className="space-y-2">
                {(section.fields || []).map((field) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    onUpdate={(updates) => onUpdateField(field.id, updates)}
                    onRemove={() => onRemoveField(field.id)}
                    hubspotProperties={hubspotProperties}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Table Section */}
          {section.type === 'table' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Columns</Label>
                <Button variant="outline" size="sm" onClick={onAddColumn}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Column
                </Button>
              </div>
              <div className="space-y-2">
                {(section.columns || []).map((column) => (
                  <ColumnEditor
                    key={column.id}
                    column={column}
                    onUpdate={(updates) => onUpdateColumn(column.id, updates)}
                    onRemove={() => onRemoveColumn(column.id)}
                  />
                ))}
              </div>
              <div className="space-y-2">
                <Label>Max Rows</Label>
                <Input
                  type="number"
                  value={section.maxRows || 20}
                  onChange={(e) => onUpdate({ maxRows: parseInt(e.target.value) || 20 })}
                  className="w-24"
                />
              </div>
            </div>
          )}

          {/* Signature Section */}
          {section.type === 'signature' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Signer Label</Label>
                <Input
                  value={section.signerLabel || ''}
                  onChange={(e) => onUpdate({ signerLabel: e.target.value })}
                  placeholder="e.g., Customer Signature"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={section.includeDateLine ?? true}
                  onChange={(e) => onUpdate({ includeDateLine: e.target.checked })}
                />
                <span className="text-sm">Include Date Line</span>
              </label>
            </div>
          )}

          {/* Terms Section */}
          {section.type === 'terms' && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={section.showTerms ?? true}
                onChange={(e) => onUpdate({ showTerms: e.target.checked })}
              />
              <span className="text-sm">Show Terms & Conditions</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// Field Editor Component
interface FieldEditorProps {
  field: DocumentField;
  onUpdate: (updates: Partial<DocumentField>) => void;
  onRemove: () => void;
  hubspotProperties: HubSpotPropertiesResponse | null;
}

function FieldEditor({ field, onUpdate, onRemove, hubspotProperties }: FieldEditorProps) {
  return (
    <div className="grid grid-cols-12 gap-2 p-2 border rounded bg-muted/30 items-center">
      <div className="col-span-3">
        <Input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Field label"
          className="h-8 text-sm"
        />
      </div>
      <div className="col-span-2">
        <Select
          value={field.type}
          onValueChange={(value: DocumentField['type']) => onUpdate({ type: value })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((t) => (
              <SelectItem key={t.type} value={t.type}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Select
          value={field.width}
          onValueChange={(value: DocumentField['width']) => onUpdate({ width: value })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_WIDTHS.map((w) => (
              <SelectItem key={w.value} value={w.value}>
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Select
          value={field.mapping.source}
          onValueChange={(value: 'hubspot' | 'manual' | 'existing') =>
            onUpdate({ mapping: { ...field.mapping, source: value } })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual Entry</SelectItem>
            <SelectItem value="hubspot">HubSpot Field</SelectItem>
            <SelectItem value="existing">Existing Field</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        {field.mapping.source === 'existing' && (
          <Select
            value={field.mapping.existingFieldKey || ''}
            onValueChange={(value) =>
              onUpdate({ mapping: { ...field.mapping, existingFieldKey: value } })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {EXISTING_DOCUMENT_FIELDS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {field.mapping.source === 'hubspot' && hubspotProperties && (
          <Select
            value={`${field.mapping.object || ''}:${field.mapping.property || ''}`}
            onValueChange={(value) => {
              const [object, property] = value.split(':');
              onUpdate({ mapping: { ...field.mapping, object, property } });
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {Object.entries(hubspotProperties.objects).map(([objKey, obj]) => (
                <div key={objKey}>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    {obj.label}
                  </div>
                  {obj.properties.slice(0, 20).map((prop) => (
                    <SelectItem key={`${objKey}:${prop.name}`} value={`${objKey}:${prop.name}`}>
                      {prop.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="col-span-1 flex items-center justify-end gap-1">
        <label className="flex items-center" title="Required">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="h-3 w-3"
          />
        </label>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Column Editor Component
interface ColumnEditorProps {
  column: TableColumn;
  onUpdate: (updates: Partial<TableColumn>) => void;
  onRemove: () => void;
}

function ColumnEditor({ column, onUpdate, onRemove }: ColumnEditorProps) {
  return (
    <div className="grid grid-cols-12 gap-2 p-2 border rounded bg-muted/30 items-center">
      <div className="col-span-4">
        <Input
          value={column.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Column header"
          className="h-8 text-sm"
        />
      </div>
      <div className="col-span-3">
        <Select
          value={column.mapping.source}
          onValueChange={(value: 'line_item' | 'manual') =>
            onUpdate({ mapping: { ...column.mapping, source: value } })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual Entry</SelectItem>
            <SelectItem value="line_item">Line Item Field</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4">
        {column.mapping.source === 'line_item' && (
          <Select
            value={column.mapping.property || ''}
            onValueChange={(value) =>
              onUpdate({ mapping: { ...column.mapping, property: value } })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select property..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="description">Description</SelectItem>
              <SelectItem value="quantity">Quantity</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="hs_sku">SKU</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="col-span-1 flex justify-end">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
