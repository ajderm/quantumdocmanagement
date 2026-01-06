import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Upload, Save, Loader2, CreditCard, FileText, ArrowLeft, Plus, X, Settings2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

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
  { code: 'lease_return', name: 'Lease Return' },
  { code: 'interterritorial', name: 'Interterritorial' },
  { code: 'new_customer', name: 'New Customer Application' },
  { code: 'relocation', name: 'Relocation' },
  { code: 'equipment_removal', name: 'Equipment Removal' },
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
  
  // Installation settings
  const [meterMethods, setMeterMethods] = useState<string[]>([]);
  const [newMeterMethod, setNewMeterMethod] = useState('');
  const [ccaValue, setCcaValue] = useState('');
  
  // Form visibility settings
  const [enabledForms, setEnabledForms] = useState<string[]>(ALL_FORM_TYPES.map(f => f.code));
  
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
      };

      const { data: result, error: invokeError } = await supabase.functions.invoke('dealer-account-save', {
        body: { portalId, accountData, documentTerms, dealerSettings },
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
              <h1 className="text-sm font-semibold">DocGen Admin</h1>
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
                    Select which document types are available in the Document Hub for this organization
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

              {/* Company Info Card */}
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
        </Tabs>
      </div>
    </div>
  );
}
