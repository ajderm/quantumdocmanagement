import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Upload, Save, Loader2, CreditCard, FileText, ArrowLeft, Plus, X, Settings2, Link2, FilePlus, Palette, Users, Download, DollarSign, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { FieldMappingEditor } from '@/components/admin/FieldMappingEditor';
import { CustomDocumentBuilder } from '@/components/admin/CustomDocumentBuilder';
import { FormCustomizationTab } from '@/components/admin/FormCustomizationTab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FormCustomizationMap } from '@/lib/formCustomization';

const DOCUMENT_TYPES = [
  { code: 'quote', name: 'Quote' },
  { code: 'service_agreement', name: 'Service Agreement' },
  { code: 'fmv_lease', name: 'FMV Lease' },
  { code: 'installation_removal_receipt', name: 'Installation: Removal Receipt' },
  { code: 'installation_delivery_acceptance', name: 'Installation: Delivery & Acceptance' },
  { code: 'interterritorial', name: 'Interterritorial' },
  { code: 'new_customer', name: 'New Customer Application' },
];

// All available form types for visibility toggle
const ALL_FORM_TYPES = [
  { code: 'quote', name: 'Quote' },
  { code: 'installation', name: 'Installation' },
  { code: 'service_agreement', name: 'Service Agreement' },
  { code: 'fmv_lease', name: 'FMV Lease' },
  { code: 'lease_funding', name: 'Lease Funding' },
  { code: 'loi', name: 'Letter of Intent' },
  { code: 'lease_return', name: 'Lease Return' },
  { code: 'interterritorial', name: 'Interterritorial' },
  { code: 'new_customer', name: 'New Customer Application' },
  { code: 'relocation', name: 'Relocation' },
  { code: 'equipment_removal', name: 'Equipment Removal' },
  { code: 'commission', name: 'Commission' },
];

export default function AdminSettings() {
  const [searchParams] = useSearchParams();
  // Support multiple param names + localStorage fallback (new tab may not include URL params)
  const portalId =
    searchParams.get('portalId') ||
    searchParams.get('portal_id') ||
    (typeof window !== 'undefined' ? window.localStorage.getItem('hs_portal_id') : null);
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dealerAccountId, setDealerAccountId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTermsTab, setActiveTermsTab] = useState('quote');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const proposalFileInputRef = useRef<HTMLInputElement>(null);
  // Installation settings
  const [meterMethods, setMeterMethods] = useState<string[]>([]);
  const [newMeterMethod, setNewMeterMethod] = useState('');
  const [ccaValue, setCcaValue] = useState('');
  
  // Form visibility settings
  const [enabledForms, setEnabledForms] = useState<string[]>(ALL_FORM_TYPES.map(f => f.code));
  
  // Form customization (field labels, hidden sections)
  const [formCustomization, setFormCustomization] = useState<FormCustomizationMap>({});
  
  // Document styles
  const [docStyleFontFamily, setDocStyleFontFamily] = useState('Arial, sans-serif');
  const [docStyleFontColor, setDocStyleFontColor] = useState('#000000');
  const [docStyleTableBorderColor, setDocStyleTableBorderColor] = useState('#000000');
  const [docStyleTableLineColor, setDocStyleTableLineColor] = useState('#d1d5db');
  
  // Proposal template
  const [proposalTemplateUrl, setProposalTemplateUrl] = useState<string | null>(null);
  const [proposalFileName, setProposalFileName] = useState<string | null>(null);
  const [uploadingProposal, setUploadingProposal] = useState(false);

  // Commission user settings
  const [commissionUsers, setCommissionUsers] = useState<Array<{ hubspot_user_name: string; hubspot_user_id: string; commission_percentage: number }>>([]);
  const [newCommissionUserName, setNewCommissionUserName] = useState('');
  const [newCommissionPercentage, setNewCommissionPercentage] = useState('40');
  const [fetchingOwners, setFetchingOwners] = useState(false);

  // Pricing tiers state
  const [pricingTiers, setPricingTiers] = useState<Array<{ name: string; prices: Array<{ product_model: string; rep_cost: string }> }>>([]);
  const [savingTiers, setSavingTiers] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    company_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    website: '',
    email: '',
    terms_and_conditions: '',
  });

  // Document-specific terms
  const [documentTerms, setDocumentTerms] = useState<Record<string, string>>({
    quote: '',
    service_agreement: '',
    fmv_lease: '',
    installation_removal_receipt: '',
    installation_delivery_acceptance: '',
    interterritorial: '',
    new_customer: '',
  });

  // Load existing dealer account data
  useEffect(() => {
    const loadDealerAccount = async () => {
      if (!portalId) {
        setLoading(false);
        return;
      }

      try {
        const { data: result, error: invokeError } = await supabase.functions.invoke('dealer-account-get', {
          body: { portalId },
        });

        if (invokeError) throw invokeError;

        const data = result?.dealer;
        if (data) {
          setDealerAccountId(data.id);
          setLogoUrl(data.logo_url);
          setFormData({
            company_name: data.company_name || '',
            address_line1: data.address_line1 || '',
            address_line2: data.address_line2 || '',
            city: data.city || '',
            state: data.state || '',
            zip_code: data.zip_code || '',
            phone: data.phone || '',
            website: data.website || '',
            email: data.email || '',
            terms_and_conditions: data.terms_and_conditions || '',
          });
        }

        // Load document-specific terms
        if (result?.documentTerms) {
          setDocumentTerms(prev => ({
            ...prev,
            ...result.documentTerms
          }));
        }

        // Load dealer settings (meter methods, CCA value, enabled forms)
        if (result?.dealerSettings) {
          const settings = result.dealerSettings;
          if (settings.meter_methods) {
            setMeterMethods(settings.meter_methods);
          }
          if (settings.cca_value) {
            setCcaValue(settings.cca_value);
          }
          if (settings.enabled_forms && Array.isArray(settings.enabled_forms)) {
            setEnabledForms(settings.enabled_forms);
          }
          if (settings.form_customization && typeof settings.form_customization === 'object') {
            setFormCustomization(settings.form_customization as FormCustomizationMap);
          }
          if (settings.document_styles) {
            const ds = settings.document_styles;
            if (ds.fontFamily) setDocStyleFontFamily(ds.fontFamily);
            if (ds.fontColor) setDocStyleFontColor(ds.fontColor);
            if (ds.tableBorderColor) setDocStyleTableBorderColor(ds.tableBorderColor);
            if (ds.tableLineColor) setDocStyleTableLineColor(ds.tableLineColor);
          }
          if (settings.proposal_template_url) {
            setProposalTemplateUrl(settings.proposal_template_url);
            setProposalFileName(settings.proposal_template_name || 'proposal.pdf');
          }
        }

        // Load commission user settings
        if (result?.commissionUsers) {
          setCommissionUsers(result.commissionUsers.map((u: any) => ({
            hubspot_user_name: u.hubspot_user_name || '',
            hubspot_user_id: u.hubspot_user_id || '',
            commission_percentage: u.commission_percentage ?? 40,
          })));
        }

        // Load pricing tiers
        if (portalId) {
          try {
            const { data: tiersData } = await supabase.functions.invoke('pricing-tiers-get', {
              body: { portalId }
            });
            if (tiersData?.tiers) {
              setPricingTiers(tiersData.tiers.map((t: any) => ({
                name: t.name,
                prices: (t.prices || []).map((p: any) => ({
                  product_model: p.product_model,
                  rep_cost: String(p.rep_cost),
                })),
              })));
            }
          } catch (err) {
            console.error('Failed to load pricing tiers:', err);
          }
        }
      } catch (error) {
        console.error('Error loading dealer account:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadDealerAccount();
  }, [portalId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentTermsChange = (docType: string, value: string) => {
    setDocumentTerms(prev => ({ ...prev, [docType]: value }));
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setUploadingLogo(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${portalId || 'default'}-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAddMeterMethod = () => {
    if (newMeterMethod.trim() && !meterMethods.includes(newMeterMethod.trim())) {
      setMeterMethods(prev => [...prev, newMeterMethod.trim()]);
      setNewMeterMethod('');
    }
  };

  const handleRemoveMeterMethod = (method: string) => {
    setMeterMethods(prev => prev.filter(m => m !== method));
  };

  const handleProposalUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    setUploadingProposal(true);
    try {
      const fileName = `${portalId || 'default'}-proposal-${Date.now()}.pdf`;
      const filePath = `proposals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      setProposalTemplateUrl(urlData.publicUrl);
      setProposalFileName(file.name);
      toast.success('Proposal template uploaded');
    } catch (error) {
      console.error('Error uploading proposal:', error);
      toast.error('Failed to upload proposal template');
    } finally {
      setUploadingProposal(false);
    }
  };

  const handleRemoveProposal = () => {
    setProposalTemplateUrl(null);
    setProposalFileName(null);
    toast.success('Proposal template removed');
  };

  const handleSave = async () => {
    if (!portalId) {
      toast.error('Missing portal ID - please access this page from HubSpot');
      return;
    }

    if (!formData.company_name.trim()) {
      toast.error('Company name is required');
      return;
    }

    setSaving(true);

    try {
      const accountData = {
        company_name: formData.company_name,
        address_line1: formData.address_line1 || null,
        address_line2: formData.address_line2 || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        phone: formData.phone || null,
        website: formData.website || null,
        email: formData.email || null,
        terms_and_conditions: formData.terms_and_conditions || null,
        logo_url: logoUrl,
      };

      const dealerSettings = {
        meter_methods: meterMethods,
        cca_value: ccaValue,
        enabled_forms: enabledForms,
        document_styles: {
          fontFamily: docStyleFontFamily,
          fontColor: docStyleFontColor,
          tableBorderColor: docStyleTableBorderColor,
          tableLineColor: docStyleTableLineColor,
        },
        proposal_template_url: proposalTemplateUrl,
        proposal_template_name: proposalFileName,
        form_customization: formCustomization,
      };

      const { data: result, error: invokeError } = await supabase.functions.invoke('dealer-account-save', {
        body: { portalId, accountData, documentTerms, dealerSettings, commissionUsers },
      });

      if (invokeError) throw invokeError;

      if (result?.id) {
        setDealerAccountId(result.id);
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden file input for logo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLogoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="flex items-center h-14 px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Document Settings</h1>
              <span className="text-xs text-muted-foreground">Settings & Configuration</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Back link for when accessed standalone */}
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link to={`/?portalId=${portalId || ''}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your company branding, templates, and leasing partners
          </p>
        </div>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="company">
              <Building2 className="h-4 w-4 mr-2" />
              Company
            </TabsTrigger>
            <TabsTrigger value="field-mappings">
              <Link2 className="h-4 w-4 mr-2" />
              Field Mappings
            </TabsTrigger>
            <TabsTrigger value="custom-documents">
              <FilePlus className="h-4 w-4 mr-2" />
              Custom Documents
            </TabsTrigger>
            <TabsTrigger value="pricing-tiers">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing Tiers
            </TabsTrigger>
            <TabsTrigger value="form-customization">
              <Settings2 className="h-4 w-4 mr-2" />
              Form Customization
            </TabsTrigger>
            <TabsTrigger value="leasing" asChild>
              <Link to={`/admin/leasing?portalId=${portalId || ''}`}>
                <CreditCard className="h-4 w-4 mr-2" />
                Leasing Partners
              </Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <div className="space-y-6">
              {/* Form Visibility Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Form Visibility
                  </CardTitle>
                  <CardDescription>
                    Select which document types are available in the Document App for this organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ALL_FORM_TYPES.map((form) => (
                      <label
                        key={form.code}
                        className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={enabledForms.includes(form.code)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEnabledForms(prev => [...prev, form.code]);
                            } else {
                              setEnabledForms(prev => prev.filter(f => f !== form.code));
                            }
                          }}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="text-sm">{form.name}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Document Styles Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Document Styles
                  </CardTitle>
                  <CardDescription>
                    Customize the visual appearance of all output documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Font Family</Label>
                      <Select value={docStyleFontFamily} onValueChange={setDocStyleFontFamily}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                          <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                          <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                          <SelectItem value="Georgia, serif">Georgia</SelectItem>
                          <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                          <SelectItem value="Calibri, sans-serif">Calibri</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Font Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={docStyleFontColor}
                          onChange={e => setDocStyleFontColor(e.target.value)}
                          className="h-10 w-10 rounded border cursor-pointer"
                        />
                        <Input value={docStyleFontColor} onChange={e => setDocStyleFontColor(e.target.value)} className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Table Header Border Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={docStyleTableBorderColor}
                          onChange={e => setDocStyleTableBorderColor(e.target.value)}
                          className="h-10 w-10 rounded border cursor-pointer"
                        />
                        <Input value={docStyleTableBorderColor} onChange={e => setDocStyleTableBorderColor(e.target.value)} className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Table Line Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={docStyleTableLineColor}
                          onChange={e => setDocStyleTableLineColor(e.target.value)}
                          className="h-10 w-10 rounded border cursor-pointer"
                        />
                        <Input value={docStyleTableLineColor} onChange={e => setDocStyleTableLineColor(e.target.value)} className="flex-1" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-md border bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                    <div style={{ fontFamily: docStyleFontFamily, color: docStyleFontColor }} className="text-sm">
                      <div className="font-bold pb-1 mb-1" style={{ borderBottom: `2px solid ${docStyleTableBorderColor}` }}>SECTION HEADER</div>
                      <div className="py-1" style={{ borderBottom: `1px solid ${docStyleTableLineColor}` }}>Sample row content</div>
                      <div className="py-1" style={{ borderBottom: `1px solid ${docStyleTableLineColor}` }}>Another row of data</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Proposal Template Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Proposal Template
                  </CardTitle>
                  <CardDescription>
                    Upload a PDF proposal that will be prepended to Quote documents when generating PDFs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    type="file"
                    ref={proposalFileInputRef}
                    onChange={handleProposalUpload}
                    accept="application/pdf"
                    className="hidden"
                  />
                  {proposalTemplateUrl ? (
                    <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/50">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{proposalFileName || 'proposal.pdf'}</p>
                        <p className="text-xs text-muted-foreground">Will be prepended to Quote PDFs</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => proposalFileInputRef.current?.click()}
                          disabled={uploadingProposal}
                        >
                          {uploadingProposal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Replace'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveProposal}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => proposalFileInputRef.current?.click()}
                      disabled={uploadingProposal}
                    >
                      {uploadingProposal ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Proposal PDF
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    This information appears on all generated documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo upload */}
                  <div className="space-y-2">
                    <Label>Company Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Company logo" className="h-full w-full object-contain" />
                        ) : (
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleLogoClick}
                          disabled={uploadingLogo}
                        >
                          {uploadingLogo ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Logo
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG up to 2MB. Max: 250x100px (supports rectangular logos)
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Company name */}
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      placeholder="Acme Office Machines, Inc."
                    />
                  </div>

                  {/* Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address_line1">Address Line 1</Label>
                      <Input
                        id="address_line1"
                        value={formData.address_line1}
                        onChange={(e) => handleInputChange('address_line1', e.target.value)}
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address_line2">Address Line 2</Label>
                      <Input
                        id="address_line2"
                        value={formData.address_line2}
                        onChange={(e) => handleInputChange('address_line2', e.target.value)}
                        placeholder="Suite 100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Lubbock"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          placeholder="TX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zip_code">ZIP Code</Label>
                        <Input
                          id="zip_code"
                          value={formData.zip_code}
                          onChange={(e) => handleInputChange('zip_code', e.target.value)}
                          placeholder="79401"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="(806) 555-1234"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="info@company.com"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="www.company.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Commission Users Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Commission User Settings
                  </CardTitle>
                  <CardDescription>
                    Define commission percentages per sales rep. These will auto-populate in the Commission form.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {commissionUsers.length > 0 && (
                    <div className="space-y-2">
                      {commissionUsers.map((user, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-md border">
                          <span className="text-sm flex-1">{user.hubspot_user_name}</span>
                          <div className="flex items-center gap-1">
                            <Input
                              className="w-20 h-8 text-sm text-right"
                              value={user.commission_percentage}
                              onChange={e => {
                                const updated = [...commissionUsers];
                                updated[idx] = { ...updated[idx], commission_percentage: parseFloat(e.target.value) || 0 };
                                setCommissionUsers(updated);
                              }}
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCommissionUsers(prev => prev.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {commissionUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No commission users configured</p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newCommissionUserName}
                      onChange={e => setNewCommissionUserName(e.target.value)}
                      placeholder="User name (e.g., John Smith)"
                      className="flex-1"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newCommissionUserName.trim()) {
                            setCommissionUsers(prev => [...prev, {
                              hubspot_user_name: newCommissionUserName.trim(),
                              hubspot_user_id: '',
                              commission_percentage: parseFloat(newCommissionPercentage) || 40,
                            }]);
                            setNewCommissionUserName('');
                            setNewCommissionPercentage('40');
                          }
                        }
                      }}
                    />
                    <Input
                      className="w-20"
                      value={newCommissionPercentage}
                      onChange={e => setNewCommissionPercentage(e.target.value)}
                      placeholder="%"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      if (newCommissionUserName.trim()) {
                        setCommissionUsers(prev => [...prev, {
                          hubspot_user_name: newCommissionUserName.trim(),
                          hubspot_user_id: '',
                          commission_percentage: parseFloat(newCommissionPercentage) || 40,
                        }]);
                        setNewCommissionUserName('');
                        setNewCommissionPercentage('40');
                      }
                    }}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={fetchingOwners || !portalId}
                    onClick={async () => {
                      if (!portalId) return;
                      setFetchingOwners(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('hubspot-get-owners', {
                          body: { portalId }
                        });
                        if (error) throw error;
                        if (data?.owners?.length) {
                          const existingNames = new Set(commissionUsers.map(u => u.hubspot_user_name.toLowerCase()));
                          const newOwners = data.owners
                            .filter((o: any) => !existingNames.has(`${o.firstName} ${o.lastName}`.trim().toLowerCase()))
                            .map((o: any) => ({
                              hubspot_user_name: `${o.firstName} ${o.lastName}`.trim(),
                              hubspot_user_id: o.id || '',
                              commission_percentage: 40,
                            }));
                          if (newOwners.length > 0) {
                            setCommissionUsers(prev => [...prev, ...newOwners]);
                            toast.success(`Added ${newOwners.length} new user(s) from HubSpot`);
                          } else {
                            toast.info('All HubSpot owners are already in the list');
                          }
                        } else {
                          toast.info('No owners found in HubSpot');
                        }
                      } catch (err) {
                        console.error('Failed to fetch owners:', err);
                        toast.error('Failed to fetch owners from HubSpot');
                      } finally {
                        setFetchingOwners(false);
                      }
                    }}
                  >
                    {fetchingOwners ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                    Fetch from HubSpot
                  </Button>
                </CardContent>
              </Card>

              {/* Installation Settings Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Installation Settings
                  </CardTitle>
                  <CardDescription>
                    Configure dropdown options and values for installation documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Meter Methods */}
                  <div className="space-y-3">
                    <Label>Meter Methods</Label>
                    <p className="text-xs text-muted-foreground">
                      Add the meter method options that will appear in the Installation document dropdown
                    </p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {meterMethods.map((method) => (
                        <Badge key={method} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                          {method}
                          <button
                            type="button"
                            onClick={() => handleRemoveMeterMethod(method)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {meterMethods.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">No meter methods configured</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newMeterMethod}
                        onChange={(e) => setNewMeterMethod(e.target.value)}
                        placeholder="e.g., Network, USB, Email"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMeterMethod();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddMeterMethod}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* CCA Value */}
                  <div className="space-y-2">
                    <Label htmlFor="cca_value">CCA Value</Label>
                    <p className="text-xs text-muted-foreground">
                      The CCA identifier that appears on installation documents
                    </p>
                    <Input
                      id="cca_value"
                      value={ccaValue}
                      onChange={(e) => setCcaValue(e.target.value)}
                      placeholder="Enter CCA value"
                      className="max-w-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Document-Specific Terms & Conditions Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Terms & Conditions by Document Type</CardTitle>
                  <CardDescription>
                    Set different terms for each document type. These will appear at the bottom of each document.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTermsTab} onValueChange={setActiveTermsTab}>
                    <TabsList className="mb-4 flex-wrap h-auto">
                      {DOCUMENT_TYPES.map((doc) => (
                        <TabsTrigger key={doc.code} value={doc.code} className="text-xs">
                          {doc.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {DOCUMENT_TYPES.map((doc) => (
                      <TabsContent key={doc.code} value={doc.code}>
                        <div className="space-y-2">
                          <Label>{doc.name} Terms & Conditions</Label>
                          <Textarea
                            value={documentTerms[doc.code] || ''}
                            onChange={(e) => handleDocumentTermsChange(doc.code, e.target.value)}
                            placeholder={`Enter terms and conditions for ${doc.name} documents...`}
                            className="min-h-[200px]"
                          />
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* Save button */}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="field-mappings">
            {portalId && <FieldMappingEditor portalId={portalId} />}
          </TabsContent>

          <TabsContent value="custom-documents">
            {portalId && <CustomDocumentBuilder portalId={portalId} />}
          </TabsContent>

          <TabsContent value="pricing-tiers">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing Tiers
                  </CardTitle>
                  <CardDescription>
                    Configure special pricing tiers (e.g., DIR, NASPO, SourceWell). Each tier has a fixed price list mapping product models to rep costs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {pricingTiers.map((tier, tierIdx) => (
                    <Card key={tierIdx} className="border">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Input
                              className="h-8 text-sm font-semibold w-48"
                              value={tier.name}
                              onChange={e => {
                                const updated = [...pricingTiers];
                                updated[tierIdx] = { ...updated[tierIdx], name: e.target.value };
                                setPricingTiers(updated);
                              }}
                              placeholder="Tier name (e.g., DIR)"
                            />
                            <Badge variant="secondary">{tier.prices.length} products</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setPricingTiers(prev => prev.filter((_, i) => i !== tierIdx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="grid grid-cols-[1fr_120px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                            <span>Product Model</span>
                            <span>Rep Cost</span>
                            <span></span>
                          </div>
                          {tier.prices.map((price, priceIdx) => (
                            <div key={priceIdx} className="grid grid-cols-[1fr_120px_40px] gap-2">
                              <Input
                                className="h-8 text-sm"
                                value={price.product_model}
                                onChange={e => {
                                  const updated = [...pricingTiers];
                                  const prices = [...updated[tierIdx].prices];
                                  prices[priceIdx] = { ...prices[priceIdx], product_model: e.target.value };
                                  updated[tierIdx] = { ...updated[tierIdx], prices };
                                  setPricingTiers(updated);
                                }}
                                placeholder="e.g., iR-ADV C5560i"
                              />
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <Input
                                  className="h-8 text-sm pl-5"
                                  value={price.rep_cost}
                                  onChange={e => {
                                    const updated = [...pricingTiers];
                                    const prices = [...updated[tierIdx].prices];
                                    prices[priceIdx] = { ...prices[priceIdx], rep_cost: e.target.value };
                                    updated[tierIdx] = { ...updated[tierIdx], prices };
                                    setPricingTiers(updated);
                                  }}
                                  placeholder="0.00"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => {
                                  const updated = [...pricingTiers];
                                  updated[tierIdx] = {
                                    ...updated[tierIdx],
                                    prices: updated[tierIdx].prices.filter((_, i) => i !== priceIdx),
                                  };
                                  setPricingTiers(updated);
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updated = [...pricingTiers];
                              updated[tierIdx] = {
                                ...updated[tierIdx],
                                prices: [...updated[tierIdx].prices, { product_model: '', rep_cost: '' }],
                              };
                              setPricingTiers(updated);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Product
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setPricingTiers(prev => [...prev, { name: '', prices: [] }])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Pricing Tier
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!portalId) return;
                        setSavingTiers(true);
                        try {
                          const tiersPayload = pricingTiers
                            .filter(t => t.name.trim())
                            .map(t => ({
                              name: t.name.trim(),
                              prices: t.prices
                                .filter(p => p.product_model.trim() && p.rep_cost)
                                .map(p => ({
                                  product_model: p.product_model.trim(),
                                  rep_cost: parseFloat(p.rep_cost) || 0,
                                })),
                            }));
                          const { error } = await supabase.functions.invoke('pricing-tiers-save', {
                            body: { portalId, tiers: tiersPayload }
                          });
                          if (error) throw error;
                          toast.success('Pricing tiers saved successfully');
                        } catch (error) {
                          console.error('Error saving pricing tiers:', error);
                          toast.error('Failed to save pricing tiers');
                        } finally {
                          setSavingTiers(false);
                        }
                      }}
                      disabled={savingTiers}
                    >
                      {savingTiers ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                      ) : (
                        <><Save className="h-4 w-4 mr-2" />Save Pricing Tiers</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
