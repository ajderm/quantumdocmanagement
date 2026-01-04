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
import { InstallationForm, InstallationFormData } from '@/components/installation/InstallationForm';
import { InstallationPreview } from '@/components/installation/InstallationPreview';
import { ServiceAgreementForm, ServiceAgreementFormData } from '@/components/service-agreement/ServiceAgreementForm';
import { ServiceAgreementPreview } from '@/components/service-agreement/ServiceAgreementPreview';

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

interface DealerSettings {
  meter_methods?: string[];
  cca_value?: string;
}

interface DocumentTerms {
  [key: string]: string;
}

// Auto-save debounce delay in milliseconds
const AUTO_SAVE_DELAY = 3000;

function DocumentHubContent() {
  const { deal, company, contacts, lineItems, dealOwner, labeledContacts, loading, error, portalId } = useHubSpot();
  
  // Quote state
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<QuoteFormData | null>(null);
  const [savedConfig, setSavedConfig] = useState<QuoteFormData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formDataRef = useRef<QuoteFormData | null>(null);

  // Installation state
  const [installationFormData, setInstallationFormData] = useState<InstallationFormData | null>(null);
  const [installationSavedConfig, setInstallationSavedConfig] = useState<Record<string, InstallationFormData>>({});
  const [installationGenerating, setInstallationGenerating] = useState(false);
  const [installationSaving, setInstallationSaving] = useState(false);
  const [showInstallationPreview, setShowInstallationPreview] = useState(false);
  const [installationHasUnsavedChanges, setInstallationHasUnsavedChanges] = useState(false);
  const [installationLastSavedData, setInstallationLastSavedData] = useState<string | null>(null);
  const installationPreviewRef = useRef<HTMLDivElement>(null);
  const installationAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const installationFormDataRef = useRef<InstallationFormData | null>(null);

  // Service Agreement state
  const [serviceAgreementFormData, setServiceAgreementFormData] = useState<ServiceAgreementFormData | null>(null);
  const [serviceAgreementSavedConfig, setServiceAgreementSavedConfig] = useState<ServiceAgreementFormData | null>(null);
  const [serviceAgreementGenerating, setServiceAgreementGenerating] = useState(false);
  const [serviceAgreementSaving, setServiceAgreementSaving] = useState(false);
  const [showServiceAgreementPreview, setShowServiceAgreementPreview] = useState(false);
  const [serviceAgreementHasUnsavedChanges, setServiceAgreementHasUnsavedChanges] = useState(false);
  const [serviceAgreementLastSavedData, setServiceAgreementLastSavedData] = useState<string | null>(null);
  const serviceAgreementPreviewRef = useRef<HTMLDivElement>(null);
  const serviceAgreementAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serviceAgreementFormDataRef = useRef<ServiceAgreementFormData | null>(null);

  // Dealer info and settings
  const [dealerInfo, setDealerInfo] = useState<DealerInfo | null>(null);
  const [dealerSettings, setDealerSettings] = useState<DealerSettings>({});
  const [documentTerms, setDocumentTerms] = useState<DocumentTerms>({});

  // Keep formDataRef in sync with formData
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Keep installationFormDataRef in sync
  useEffect(() => {
    installationFormDataRef.current = installationFormData;
  }, [installationFormData]);

  // Keep serviceAgreementFormDataRef in sync
  useEffect(() => {
    serviceAgreementFormDataRef.current = serviceAgreementFormData;
  }, [serviceAgreementFormData]);

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

        // Store document terms
        if (data?.documentTerms) {
          setDocumentTerms(data.documentTerms);
        }

        // Store dealer settings (meter methods, CCA)
        if (data?.dealerSettings) {
          setDealerSettings(data.dealerSettings);
        }
      } catch (err) {
        console.error('Failed to fetch dealer info:', err);
      }
    };

    fetchDealerInfo();
  }, [portalId]);

  // Load saved quote configuration on mount
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
          if (error.code !== 'PGRST116') {
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

  // Load saved installation configurations
  useEffect(() => {
    const loadInstallationConfigs = async () => {
      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      const dealId = deal?.hsObjectId;
      
      if (!currentPortalId || !dealId) return;

      try {
        const { data, error } = await supabase
          .from('installation_configurations')
          .select('line_item_id, configuration')
          .eq('portal_id', currentPortalId)
          .eq('deal_id', dealId);

        if (error) {
          console.error('Error loading installation configs:', error);
          return;
        }

        if (data) {
          const configs: Record<string, InstallationFormData> = {};
          data.forEach(row => {
            configs[row.line_item_id] = row.configuration as unknown as InstallationFormData;
          });
          setInstallationSavedConfig(configs);
        }
      } catch (err) {
        console.error('Failed to load installation configs:', err);
      }
    };

    if (deal?.hsObjectId) {
      loadInstallationConfigs();
    }
  }, [portalId, deal?.hsObjectId]);

  // Load saved service agreement configuration
  useEffect(() => {
    const loadServiceAgreementConfig = async () => {
      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      const dealId = deal?.hsObjectId;
      
      if (!currentPortalId || !dealId) return;

      try {
        const { data, error } = await supabase
          .from('service_agreement_configurations')
          .select('configuration')
          .eq('portal_id', currentPortalId)
          .eq('deal_id', dealId)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Error loading service agreement config:', error);
          }
          return;
        }

        if (data?.configuration) {
          console.log('Loaded saved service agreement configuration');
          setServiceAgreementSavedConfig(data.configuration as unknown as ServiceAgreementFormData);
        }
      } catch (err) {
        console.error('Failed to load service agreement config:', err);
      }
    };

    if (deal?.hsObjectId) {
      loadServiceAgreementConfig();
    }
  }, [portalId, deal?.hsObjectId]);

  // Silent auto-save function for Quote
  const performAutoSave = useCallback(async (dataToSave: QuoteFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId || !dataToSave) return;

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

  // Handle quote form change with auto-save debounce
  const handleFormChange = useCallback((data: QuoteFormData) => {
    setFormData(data);
    setHasUnsavedChanges(true);
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave(data);
    }, AUTO_SAVE_DELAY);
  }, [performAutoSave]);

  // Auto-save for installation
  const performInstallationAutoSave = useCallback(async (dataToSave: InstallationFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    const lineItemId = dataToSave.selectedLineItemId;

    if (!currentPortalId || !dealId || !lineItemId || !dataToSave) return;

    const dataString = JSON.stringify(dataToSave);
    if (dataString === installationLastSavedData) return;

    try {
      const { error: saveError } = await supabase
        .from('installation_configurations')
        .upsert({
          portal_id: currentPortalId,
          deal_id: dealId,
          line_item_id: lineItemId,
          configuration: dataToSave as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'portal_id,deal_id,line_item_id'
        });

      if (!saveError) {
        setInstallationLastSavedData(dataString);
        setInstallationHasUnsavedChanges(false);
        console.log('Auto-saved installation configuration');
      }
    } catch (err) {
      console.error('Installation auto-save error:', err);
    }
  }, [portalId, deal?.hsObjectId, installationLastSavedData]);

  // Handle installation form change
  const handleInstallationFormChange = useCallback((data: InstallationFormData) => {
    setInstallationFormData(data);
    setInstallationHasUnsavedChanges(true);
    
    if (installationAutoSaveTimeoutRef.current) {
      clearTimeout(installationAutoSaveTimeoutRef.current);
    }

    if (data.selectedLineItemId) {
      installationAutoSaveTimeoutRef.current = setTimeout(() => {
        performInstallationAutoSave(data);
      }, AUTO_SAVE_DELAY);
    }
  }, [performInstallationAutoSave]);

  // Auto-save for service agreement
  const performServiceAgreementAutoSave = useCallback(async (dataToSave: ServiceAgreementFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId || !dataToSave) return;

    const dataString = JSON.stringify(dataToSave);
    if (dataString === serviceAgreementLastSavedData) return;

    try {
      const { error: saveError } = await supabase
        .from('service_agreement_configurations')
        .upsert({
          portal_id: currentPortalId,
          deal_id: dealId,
          configuration: dataToSave as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'portal_id,deal_id'
        });

      if (!saveError) {
        setServiceAgreementLastSavedData(dataString);
        setServiceAgreementHasUnsavedChanges(false);
        console.log('Auto-saved service agreement configuration');
      }
    } catch (err) {
      console.error('Service agreement auto-save error:', err);
    }
  }, [portalId, deal?.hsObjectId, serviceAgreementLastSavedData]);

  // Handle service agreement form change
  const handleServiceAgreementFormChange = useCallback((data: ServiceAgreementFormData) => {
    setServiceAgreementFormData(data);
    setServiceAgreementHasUnsavedChanges(true);
    
    if (serviceAgreementAutoSaveTimeoutRef.current) {
      clearTimeout(serviceAgreementAutoSaveTimeoutRef.current);
    }

    serviceAgreementAutoSaveTimeoutRef.current = setTimeout(() => {
      performServiceAgreementAutoSave(data);
    }, AUTO_SAVE_DELAY);
  }, [performServiceAgreementAutoSave]);

  // Auto-save on tab/window close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((hasUnsavedChanges && formDataRef.current) || (installationHasUnsavedChanges && installationFormDataRef.current) || (serviceAgreementHasUnsavedChanges && serviceAgreementFormDataRef.current)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (hasUnsavedChanges && formDataRef.current) {
          performAutoSave(formDataRef.current);
        }
        if (installationHasUnsavedChanges && installationFormDataRef.current) {
          performInstallationAutoSave(installationFormDataRef.current);
        }
        if (serviceAgreementHasUnsavedChanges && serviceAgreementFormDataRef.current) {
          performServiceAgreementAutoSave(serviceAgreementFormDataRef.current);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (installationAutoSaveTimeoutRef.current) {
        clearTimeout(installationAutoSaveTimeoutRef.current);
      }
      if (serviceAgreementAutoSaveTimeoutRef.current) {
        clearTimeout(serviceAgreementAutoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, installationHasUnsavedChanges, serviceAgreementHasUnsavedChanges, performAutoSave, performInstallationAutoSave, performServiceAgreementAutoSave]);

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

      setLastSavedData(JSON.stringify(formData));
      setHasUnsavedChanges(false);
      localStorage.removeItem(`quote_backup_${dealId}`);

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

  const handleInstallationLineItemSwitch = async (newLineItemId: string, currentFormData: InstallationFormData) => {
    // Save the current line item's data before switching
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (currentPortalId && dealId && currentFormData.selectedLineItemId) {
      try {
        await supabase
          .from('installation_configurations')
          .upsert({
            portal_id: currentPortalId,
            deal_id: dealId,
            line_item_id: currentFormData.selectedLineItemId,
            configuration: currentFormData as any,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'portal_id,deal_id,line_item_id'
          });
        
        // Update saved config cache
        setInstallationSavedConfig(prev => ({
          ...prev,
          [currentFormData.selectedLineItemId]: currentFormData
        }));
      } catch (err) {
        console.error('Auto-save on switch error:', err);
      }
    }
  };

  const handleInstallationSave = async () => {
    if (!installationFormData || !installationFormData.selectedLineItemId) {
      toast.error('Please select a hardware item first');
      return;
    }

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId) {
      toast.error('Missing portal or deal information');
      return;
    }

    setInstallationSaving(true);
    try {
      const { error: saveError } = await supabase
        .from('installation_configurations')
        .upsert({
          portal_id: currentPortalId,
          deal_id: dealId,
          line_item_id: installationFormData.selectedLineItemId,
          configuration: installationFormData as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'portal_id,deal_id,line_item_id'
        });

      if (saveError) {
        console.error('Save error:', saveError);
        toast.error('Failed to save installation configuration');
        return;
      }

      setInstallationLastSavedData(JSON.stringify(installationFormData));
      setInstallationHasUnsavedChanges(false);
      toast.success('Installation configuration saved');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save installation configuration');
    } finally {
      setInstallationSaving(false);
    }
  };

  // Helper function for multi-page PDF generation
  const generateMultiPagePDF = async (element: HTMLElement): Promise<jsPDF> => {
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    document.body.appendChild(tempContainer);

    const clone = element.cloneNode(true) as HTMLElement;
    tempContainer.appendChild(clone);

    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    document.body.removeChild(tempContainer);

    // US Letter dimensions in points (jsPDF default unit)
    const pageWidthIn = 8.5;
    const pageHeightIn = 11;

    // Calculate image dimensions scaled to page width
    const imgWidth = pageWidthIn;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter',
    });

    // Check if content fits on one page
    if (imgHeight <= pageHeightIn) {
      // Single page
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      // Multi-page: split content across pages
      const totalPages = Math.ceil(imgHeight / pageHeightIn);
      const pixelsPerPage = canvas.height / totalPages;

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        // Create a temporary canvas for this page's portion
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = pixelsPerPage;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, page * pixelsPerPage,           // Source x, y
            canvas.width, pixelsPerPage,       // Source width, height
            0, 0,                              // Destination x, y
            canvas.width, pixelsPerPage        // Destination width, height
          );
        }

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.85);
        pdf.addImage(pageImgData, 'JPEG', 0, 0, pageWidthIn, pageHeightIn);
      }
    }

    return pdf;
  };

  const handleGeneratePDF = async () => {
    if (!previewRef.current || !formData) {
      toast.error('Please fill in the quote details first');
      return;
    }

    setGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(previewRef.current);
      
      const sanitizedCompanyName = (formData.companyName || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const fileName = `Quote_${sanitizedCompanyName}_${dateStr}_${timeStr}.pdf`;
      
      pdf.save(fileName);

      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      const currentDealId = deal?.hsObjectId;

      if (currentPortalId && currentDealId) {
        try {
          const pdfBase64 = pdf.output('datauristring').split(',')[1];
          
          const { data, error: attachError } = await supabase.functions.invoke('hubspot-attach-file', {
            body: {
              portalId: currentPortalId,
              dealId: currentDealId,
              fileName: fileName,
              fileBase64: pdfBase64
            }
          });

          if (attachError || data?.error) {
            toast.success('PDF downloaded! (Could not attach to deal)');
          } else {
            toast.success('PDF downloaded and attached to deal!');
          }
        } catch (attachErr) {
          console.error('Failed to attach to HubSpot:', attachErr);
          toast.success('PDF downloaded! (Could not attach to deal)');
        }
      } else {
        toast.success('Quote PDF downloaded successfully!');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleInstallationGeneratePDF = async () => {
    if (!installationPreviewRef.current || !installationFormData || !installationFormData.selectedLineItemId) {
      toast.error('Please select a hardware item and fill in the details first');
      return;
    }

    setInstallationGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(installationPreviewRef.current);
      
      const sanitizedCompanyName = (installationFormData.shipToCompany || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const fileName = `Installation_Report_${sanitizedCompanyName}_Hardware_${dateStr}_${timeStr}.pdf`;
      
      pdf.save(fileName);

      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      const currentDealId = deal?.hsObjectId;

      if (currentPortalId && currentDealId) {
        try {
          const pdfBase64 = pdf.output('datauristring').split(',')[1];
          
          const { data, error: attachError } = await supabase.functions.invoke('hubspot-attach-file', {
            body: {
              portalId: currentPortalId,
              dealId: currentDealId,
              fileName: fileName,
              fileBase64: pdfBase64
            }
          });

          if (attachError || data?.error) {
            toast.success('PDF downloaded! (Could not attach to deal)');
          } else {
            toast.success('PDF downloaded and attached to deal!');
          }
        } catch (attachErr) {
          console.error('Failed to attach to HubSpot:', attachErr);
          toast.success('PDF downloaded! (Could not attach to deal)');
        }
      } else {
        toast.success('Installation PDF downloaded successfully!');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setInstallationGenerating(false);
    }
  };

  const handlePreview = () => {
    if (!formData) {
      toast.error('Please fill in the quote details first');
      return;
    }
    setShowPreview(true);
  };

  const handleInstallationPreview = () => {
    if (!installationFormData || !installationFormData.selectedLineItemId) {
      toast.error('Please select a hardware item first');
      return;
    }
    setShowInstallationPreview(true);
  };

  // Service Agreement handlers
  const handleServiceAgreementSave = async () => {
    if (!serviceAgreementFormData) {
      toast.error('No data to save');
      return;
    }

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId) {
      toast.error('Missing portal or deal information');
      return;
    }

    setServiceAgreementSaving(true);
    try {
      const { error: saveError } = await supabase
        .from('service_agreement_configurations')
        .upsert({
          portal_id: currentPortalId,
          deal_id: dealId,
          configuration: serviceAgreementFormData as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'portal_id,deal_id'
        });

      if (saveError) {
        console.error('Save error:', saveError);
        toast.error('Failed to save service agreement configuration');
        return;
      }

      setServiceAgreementLastSavedData(JSON.stringify(serviceAgreementFormData));
      setServiceAgreementHasUnsavedChanges(false);
      toast.success('Service agreement configuration saved');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save service agreement configuration');
    } finally {
      setServiceAgreementSaving(false);
    }
  };

  const handleServiceAgreementGeneratePDF = async () => {
    if (!serviceAgreementPreviewRef.current || !serviceAgreementFormData) {
      toast.error('Please fill in the service agreement details first');
      return;
    }

    setServiceAgreementGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(serviceAgreementPreviewRef.current);
      
      const sanitizedCompanyName = (serviceAgreementFormData.shipToCompany || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const fileName = `Service_Agreement_${sanitizedCompanyName}_${dateStr}_${timeStr}.pdf`;
      
      pdf.save(fileName);

      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      const currentDealId = deal?.hsObjectId;

      if (currentPortalId && currentDealId) {
        try {
          const pdfBase64 = pdf.output('datauristring').split(',')[1];
          
          const { data, error: attachError } = await supabase.functions.invoke('hubspot-attach-file', {
            body: {
              portalId: currentPortalId,
              dealId: currentDealId,
              fileName: fileName,
              fileBase64: pdfBase64
            }
          });

          if (attachError || data?.error) {
            toast.success('PDF downloaded! (Could not attach to deal)');
          } else {
            toast.success('PDF downloaded and attached to deal!');
          }
        } catch (attachErr) {
          console.error('Failed to attach to HubSpot:', attachErr);
          toast.success('PDF downloaded! (Could not attach to deal)');
        }
      } else {
        toast.success('Service Agreement PDF downloaded successfully!');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setServiceAgreementGenerating(false);
    }
  };

  const handleServiceAgreementPreview = () => {
    if (!serviceAgreementFormData) {
      toast.error('Please fill in the service agreement details first');
      return;
    }
    setShowServiceAgreementPreview(true);
  };

  // Get the saved config for the currently selected line item
  const getCurrentInstallationSavedConfig = () => {
    if (!installationFormData?.selectedLineItemId) return undefined;
    return installationSavedConfig[installationFormData.selectedLineItemId];
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

  // Count hardware items for badge
  const hardwareLineItems = lineItems.filter(
    (item) => item.category?.toLowerCase() === 'hardware' || !item.category
  );

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
                  {doc.code === 'installation' && hardwareLineItems.length > 0 && (
                    <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">
                      {hardwareLineItems.length}
                    </Badge>
                  )}
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

          {/* Installation Tab Content */}
          <TabsContent value="installation" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Generate Installation Document
                  {hardwareLineItems.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {hardwareLineItems.length} hardware item{hardwareLineItems.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Create an installation document for each hardware item
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InstallationForm
                  deal={deal}
                  company={company}
                  contacts={contacts}
                  lineItems={lineItems}
                  dealOwner={dealOwner}
                  meterMethods={dealerSettings.meter_methods || []}
                  ccaValue={dealerSettings.cca_value || ''}
                  onFormChange={handleInstallationFormChange}
                  onLineItemSwitch={handleInstallationLineItemSwitch}
                  savedConfig={getCurrentInstallationSavedConfig()}
                  labeledContacts={labeledContacts || undefined}
                />

                {/* Actions */}
                {installationFormData?.selectedLineItemId && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleInstallationSave} disabled={installationSaving}>
                      {installationSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {installationSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button className="flex-1" onClick={handleInstallationGeneratePDF} disabled={installationGenerating}>
                      {installationGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {installationGenerating ? 'Generating...' : 'Generate PDF'}
                    </Button>
                    <Button variant="outline" onClick={handleInstallationPreview}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Agreement Tab Content */}
          <TabsContent value="service_agreement" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Generate Service Agreement
                </CardTitle>
                <CardDescription>
                  Create a service agreement with maintenance terms and rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ServiceAgreementForm
                  formData={serviceAgreementFormData || {
                    customerNumber: '',
                    customerNumberOverride: '',
                    meterMethod: '',
                    shipToCompany: '',
                    shipToAddress: '',
                    shipToCity: '',
                    shipToState: '',
                    shipToZip: '',
                    shipToAttn: '',
                    shipToPhone: '',
                    shipToEmail: '',
                    billToCompany: '',
                    billToAddress: '',
                    billToCity: '',
                    billToState: '',
                    billToZip: '',
                    billToAttn: '',
                    billToPhone: '',
                    billToEmail: '',
                    maintenanceType: '',
                    paperStaples: '',
                    drumToner: '',
                    effectiveDate: null,
                    contractLengthMonths: '',
                    rates: {},
                  }}
                  onChange={handleServiceAgreementFormChange}
                  company={company ? { 
                    name: company.name, 
                    customerNumber: company.customerNumber,
                    // Ship To (Delivery) Address
                    deliveryAddress: company.deliveryAddress,
                    deliveryAddress2: company.deliveryAddress2,
                    deliveryCity: company.deliveryCity,
                    deliveryState: company.deliveryState,
                    deliveryZip: company.deliveryZip,
                    // Bill To (AP) Address  
                    apAddress: company.apAddress,
                    apAddress2: company.apAddress2,
                    apCity: company.apCity,
                    apState: company.apState,
                    apZip: company.apZip,
                    // Fallback address
                    address: company.address,
                    address2: company.address2,
                    city: company.city,
                    state: company.state,
                    zip: company.zip,
                  } : null}
                  lineItems={lineItems}
                  dealerSettings={dealerSettings}
                  savedConfig={serviceAgreementSavedConfig}
                  labeledContacts={labeledContacts || { shippingContact: null, apContact: null, itContact: null }}
                  quoteFormData={formData ? {
                    includedBWCopies: String(formData.includedBWCopies),
                    includedColorCopies: String(formData.includedColorCopies),
                    overageBWRate: String(formData.overageBWRate),
                    overageColorRate: String(formData.overageColorRate),
                    serviceBaseRate: String(formData.serviceBaseRate),
                  } : null}
                />

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleServiceAgreementSave} disabled={serviceAgreementSaving}>
                    {serviceAgreementSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {serviceAgreementSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={handleServiceAgreementGeneratePDF} disabled={serviceAgreementGenerating}>
                    {serviceAgreementGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {serviceAgreementGenerating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="outline" onClick={handleServiceAgreementPreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Placeholder for other tabs */}
          {documentTypes.slice(3).map((doc) => (
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

      {/* Hidden preview for Quote PDF generation */}
      <div className="hidden">
        {formData && (
          <QuotePreview ref={previewRef} formData={formData} dealerInfo={dealerInfo || undefined} />
        )}
      </div>

      {/* Hidden preview for Installation PDF generation */}
      <div className="hidden">
        {installationFormData && (
          <InstallationPreview
            ref={installationPreviewRef}
            formData={installationFormData}
            dealerInfo={dealerInfo ? {
              companyName: dealerInfo.companyName,
              address: dealerInfo.address,
              phone: dealerInfo.phone,
              website: dealerInfo.website,
              logoUrl: dealerInfo.logoUrl,
            } : undefined}
            removalReceiptTerms={documentTerms.installation_removal_receipt}
            deliveryAcceptanceTerms={documentTerms.installation_delivery_acceptance}
          />
        )}
      </div>

      {/* Quote Preview Dialog */}
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

      {/* Installation Preview Dialog */}
      <Dialog open={showInstallationPreview} onOpenChange={setShowInstallationPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Installation Document Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {installationFormData && (
                <div className="shadow-lg border">
                  <InstallationPreview
                    formData={installationFormData}
                    dealerInfo={dealerInfo ? {
                      companyName: dealerInfo.companyName,
                      address: dealerInfo.address,
                      phone: dealerInfo.phone,
                      website: dealerInfo.website,
                      logoUrl: dealerInfo.logoUrl,
                    } : undefined}
                    removalReceiptTerms={documentTerms.installation_removal_receipt}
                    deliveryAcceptanceTerms={documentTerms.installation_delivery_acceptance}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden preview for Service Agreement PDF generation */}
      <div className="hidden">
        {serviceAgreementFormData && (
          <ServiceAgreementPreview
            ref={serviceAgreementPreviewRef}
            formData={serviceAgreementFormData}
            dealerInfo={dealerInfo ? {
              company_name: dealerInfo.companyName,
              address_line1: dealerInfo.address,
              phone: dealerInfo.phone,
              website: dealerInfo.website,
              logo_url: dealerInfo.logoUrl,
            } : undefined}
            lineItems={lineItems}
            termsAndConditions={documentTerms.service_agreement}
          />
        )}
      </div>

      {/* Service Agreement Preview Dialog */}
      <Dialog open={showServiceAgreementPreview} onOpenChange={setShowServiceAgreementPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Service Agreement Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {serviceAgreementFormData && (
                <div className="shadow-lg border">
                  <ServiceAgreementPreview
                    formData={serviceAgreementFormData}
                    dealerInfo={dealerInfo ? {
                      company_name: dealerInfo.companyName,
                      address_line1: dealerInfo.address,
                      phone: dealerInfo.phone,
                      website: dealerInfo.website,
                      logo_url: dealerInfo.logoUrl,
                    } : undefined}
                    lineItems={lineItems}
                    termsAndConditions={documentTerms.service_agreement}
                  />
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
