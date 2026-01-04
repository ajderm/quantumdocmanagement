import { useState, useRef, useCallback, useEffect } from 'react';
import { HubSpotProvider, useHubSpot } from '@/hooks/useHubSpot';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  FileText, 
  ClipboardList, 
  FileCheck, 
  FileSpreadsheet, 
  Receipt, 
  MailOpen, 
  MapPin, 
  UserPlus, 
  Truck,
  Trash2,
  Building2,
  User,
  Package,
  Loader2,
  Settings,
  UserCircle,
  Download,
  Eye,
  Save
} from 'lucide-react';
import { QuoteForm, QuoteFormData } from '@/components/quote/QuoteForm';
import { QuotePreview } from '@/components/quote/QuotePreview';

const documentTypes = [
  { code: 'quote', name: 'Quote', icon: FileText },
  { code: 'installation', name: 'Installation', icon: ClipboardList },
  { code: 'service_agreement', name: 'Service Agreement', icon: FileCheck },
  { code: 'fmv_lease', name: 'FMV Lease', icon: FileSpreadsheet },
  { code: 'lease_funding', name: 'Lease Funding', icon: Receipt },
  { code: 'lease_return', name: 'Lease Return', icon: MailOpen },
  { code: 'interterritorial', name: 'Interterritorial', icon: MapPin },
  { code: 'new_customer', name: 'New Customer', icon: UserPlus },
  { code: 'relocation', name: 'Relocation', icon: Truck },
  { code: 'equipment_removal', name: 'Removal', icon: Trash2 },
];

interface DealerInfo {
  companyName: string;
  address: string;
  phone: string;
  website: string;
  logoUrl?: string;
  termsAndConditions?: string;
}

// Auto-save debounce delay in milliseconds
const AUTO_SAVE_DELAY = 3000;

function DocumentHubContent() {
  const { deal, company, contacts, lineItems, dealOwner, loading, error, portalId } = useHubSpot();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<QuoteFormData | null>(null);
  const [dealerInfo, setDealerInfo] = useState<DealerInfo | null>(null);
  const [savedConfig, setSavedConfig] = useState<QuoteFormData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formDataRef = useRef<QuoteFormData | null>(null);

  // Keep formDataRef in sync with formData
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Fetch dealer info when portalId is available
  useEffect(() => {
    const fetchDealerInfo = async () => {
      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      if (!currentPortalId) return;

      try {
        const { data, error } = await supabase.functions.invoke('dealer-account-get', {
          body: { portalId: currentPortalId }
        });

        if (error) {
          console.error('Error fetching dealer info:', error);
          return;
        }

        if (data?.dealer) {
          const d = data.dealer;
          const addressParts = [d.address_line1, d.address_line2, `${d.city || ''}, ${d.state || ''} ${d.zip_code || ''}`]
            .filter(Boolean)
            .join(', ');
          
          // Get quote-specific T&C or fall back to default
          const quoteTerms = data.documentTerms?.quote || d.terms_and_conditions || '';
          
          setDealerInfo({
            companyName: d.company_name || '',
            address: addressParts,
            phone: d.phone || '',
            website: d.website || '',
            logoUrl: d.logo_url || undefined,
            termsAndConditions: quoteTerms
          });
        }
      } catch (err) {
        console.error('Failed to fetch dealer info:', err);
      }
    };

    fetchDealerInfo();
  }, [portalId]);

  // Load saved configuration on mount
  useEffect(() => {
    const loadSavedConfig = async () => {
      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      const dealId = deal?.hsObjectId;
      
      if (!currentPortalId || !dealId) return;

      try {
        const { data, error } = await supabase
          .from('quote_configurations')
          .select('configuration')
          .eq('portal_id', currentPortalId)
          .eq('deal_id', dealId)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // Not found is OK
            console.error('Error loading saved config:', error);
          }
          return;
        }

        if (data?.configuration) {
          console.log('Loaded saved configuration');
          setSavedConfig(data.configuration as unknown as QuoteFormData);
        }
      } catch (err) {
        console.error('Failed to load saved config:', err);
      }
    };

    if (deal?.hsObjectId) {
      loadSavedConfig();
    }
  }, [portalId, deal?.hsObjectId]);

  // Silent auto-save function (doesn't show toasts or sync to HubSpot)
  const performAutoSave = useCallback(async (dataToSave: QuoteFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId || !dataToSave) return;

    // Check if data has actually changed
    const dataString = JSON.stringify(dataToSave);
    if (dataString === lastSavedData) return;

    try {
      const { error: saveError } = await supabase
        .from('quote_configurations')
        .upsert({
          portal_id: currentPortalId,
          deal_id: dealId,
          configuration: dataToSave as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'deal_id,portal_id'
        });

      if (!saveError) {
        setLastSavedData(dataString);
        setHasUnsavedChanges(false);
        console.log('Auto-saved configuration');
      }
    } catch (err) {
      console.error('Auto-save error:', err);
    }
  }, [portalId, deal?.hsObjectId, lastSavedData]);

  // Handle form change with auto-save debounce
  const handleFormChange = useCallback((data: QuoteFormData) => {
    setFormData(data);
    setHasUnsavedChanges(true);
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new debounced auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave(data);
    }, AUTO_SAVE_DELAY);
  }, [performAutoSave]);

  // Auto-save on tab/window close or visibility change
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && formDataRef.current) {
        // Perform synchronous save attempt
        const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
        const dealId = deal?.hsObjectId;
        
        if (currentPortalId && dealId) {
          // Use sendBeacon for reliable save on page unload
          const payload = JSON.stringify({
            portal_id: currentPortalId,
            deal_id: dealId,
            configuration: formDataRef.current,
            updated_at: new Date().toISOString()
          });
          
          // Store in localStorage as backup
          localStorage.setItem(`quote_backup_${dealId}`, payload);
        }
        
        // Show browser's native "unsaved changes" dialog
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChanges && formDataRef.current) {
        performAutoSave(formDataRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clear timeout on unmount
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, portalId, deal?.hsObjectId, performAutoSave]);

  // Recover from localStorage backup if exists
  useEffect(() => {
    const dealId = deal?.hsObjectId;
    if (!dealId) return;

    const backup = localStorage.getItem(`quote_backup_${dealId}`);
    if (backup && !savedConfig) {
      try {
        const parsed = JSON.parse(backup);
        if (parsed.configuration) {
          console.log('Recovered backup configuration');
          setSavedConfig(parsed.configuration as QuoteFormData);
          localStorage.removeItem(`quote_backup_${dealId}`);
        }
      } catch {
        localStorage.removeItem(`quote_backup_${dealId}`);
      }
    }
  }, [deal?.hsObjectId, savedConfig]);

  const handleSave = async () => {
    if (!formData) {
      toast.error('No data to save');
      return;
    }

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId) {
      toast.error('Missing portal or deal information');
      return;
    }

    setSaving(true);
    try {
      // Upsert configuration to database
      const { error: saveError } = await supabase
        .from('quote_configurations')
        .upsert({
          portal_id: currentPortalId,
          deal_id: dealId,
          configuration: formData as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'deal_id,portal_id'
        });

      if (saveError) {
        console.error('Save error:', saveError);
        toast.error('Failed to save configuration');
        return;
      }

      // Update last saved data to prevent unnecessary auto-saves
      setLastSavedData(JSON.stringify(formData));
      setHasUnsavedChanges(false);

      // Clear any localStorage backup
      localStorage.removeItem(`quote_backup_${dealId}`);

      // If buyoutFinancingAmount is set, update HubSpot deal
      if (formData.buyoutFinancingAmount > 0) {
        try {
          const { error: hubspotError } = await supabase.functions.invoke('hubspot-update-deal', {
            body: {
              portalId: currentPortalId,
              dealId: dealId,
              properties: {
                financing_amount: formData.buyoutFinancingAmount.toString()
              }
            }
          });

          if (hubspotError) {
            console.error('HubSpot update error:', hubspotError);
            toast.success('Configuration saved (HubSpot sync failed)');
          } else {
            toast.success('Configuration saved & synced to HubSpot');
          }
        } catch (hsErr) {
          console.error('HubSpot sync error:', hsErr);
          toast.success('Configuration saved (HubSpot sync failed)');
        }
      } else {
        toast.success('Configuration saved');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!previewRef.current || !formData) {
      toast.error('Please fill in the quote details first');
      return;
    }

    setGenerating(true);
    try {
      // Create a temporary container for rendering
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      document.body.appendChild(tempContainer);

      // Clone the preview element
      const clone = previewRef.current.cloneNode(true) as HTMLElement;
      tempContainer.appendChild(clone);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Clean up
      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
      });

      const imgWidth = 8.5;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Generate filename: Quote_Company_Name_Date_Time.pdf
      const sanitizedCompanyName = (formData.companyName || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const fileName = `Quote_${sanitizedCompanyName}_${dateStr}_${timeStr}.pdf`;
      
      // Save locally
      pdf.save(fileName);

      // Attach to HubSpot deal
      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      const currentDealId = deal?.hsObjectId;

      console.log('Preparing to attach to HubSpot:', { currentPortalId, dealId: currentDealId, fileName });

      if (currentPortalId && currentDealId) {
        try {
          // Convert PDF to base64
          const pdfBase64 = pdf.output('datauristring').split(',')[1];
          console.log('PDF base64 length:', pdfBase64?.length);
          
          console.log('Invoking hubspot-attach-file function...');
          const { data, error: attachError } = await supabase.functions.invoke('hubspot-attach-file', {
            body: {
              portalId: currentPortalId,
              dealId: currentDealId,
              fileName: fileName,
              fileBase64: pdfBase64
            }
          });

          console.log('HubSpot attach response:', { data, error: attachError });

          if (attachError) {
            console.error('Error attaching to HubSpot:', attachError);
            toast.success('PDF downloaded! (Could not attach to deal)');
          } else if (data?.error) {
            console.error('HubSpot API error:', data.error);
            toast.success('PDF downloaded! (Could not attach to deal)');
          } else {
            toast.success('PDF downloaded and attached to deal!');
          }
        } catch (attachErr) {
          console.error('Failed to attach to HubSpot:', attachErr);
          toast.success('PDF downloaded! (Could not attach to deal)');
        }
      } else {
        console.log('Missing portalId or dealId, skipping attachment');
        toast.success('Quote PDF downloaded successfully!');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = () => {
    if (!formData) {
      toast.error('Please fill in the quote details first');
      return;
    }
    setShowPreview(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-2">Failed to load deal data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Quantum Document Management</h1>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a
              href={`/admin?portalId=${encodeURIComponent(
                portalId || window.localStorage.getItem('hs_portal_id') || ''
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </a>
          </Button>
        </div>
      </header>

      <div className="p-4">

        {/* Deal Context Card */}
        {deal && (
          <Card className="mb-4">
            <CardHeader className="py-3 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{deal.dealName}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {deal.stage}
                    </Badge>
                    {deal.amount && (
                      <span className="text-xs">
                        ${deal.amount.toLocaleString()}
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-0 px-4 pb-3">
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{company?.name || 'No company'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">
                    {dealOwner ? `${dealOwner.firstName} ${dealOwner.lastName}` : 'No owner'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">
                    {contacts[0] ? `${contacts[0].firstName} ${contacts[0].lastName}` : 'No contact'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{lineItems.length} items</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Type Tabs */}
        <Tabs defaultValue="quote" className="w-full">
          <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0 mb-4">
            {documentTypes.map((doc) => {
              const Icon = doc.icon;
              return (
                <TabsTrigger
                  key={doc.code}
                  value={doc.code}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-1.5 text-xs"
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {doc.name}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Quote Tab Content */}
          <TabsContent value="quote" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generate Quote
                </CardTitle>
                <CardDescription>
                  Review and customize quote details before generating
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <QuoteForm
                  deal={deal}
                  company={company}
                  contacts={contacts}
                  lineItems={lineItems}
                  dealOwner={dealOwner}
                  onFormChange={handleFormChange}
                  portalId={portalId || localStorage.getItem('hs_portal_id') || undefined}
                  savedConfig={savedConfig || undefined}
                />

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={handleGeneratePDF} disabled={generating}>
                    {generating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {generating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="outline" onClick={handlePreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Placeholder for other tabs */}
          {documentTypes.slice(1).map((doc) => (
            <TabsContent key={doc.code} value={doc.code} className="mt-0">
              <Card>
                <CardContent className="py-12 text-center">
                  <doc.icon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-foreground mb-2">{doc.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    This document type will be implemented next
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Hidden preview for PDF generation */}
      <div className="hidden">
        {formData && (
          <QuotePreview ref={previewRef} formData={formData} dealerInfo={dealerInfo || undefined} />
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Quote Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {formData && (
                <div className="shadow-lg border">
                  <QuotePreview formData={formData} dealerInfo={dealerInfo || undefined} />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DocumentHub() {
  return (
    <HubSpotProvider>
      <DocumentHubContent />
    </HubSpotProvider>
  );
}
