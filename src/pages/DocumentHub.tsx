import { useState, useRef, useCallback, useEffect } from 'react';

type TimerId = ReturnType<typeof setTimeout>;
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
import { PDFDocument } from 'pdf-lib';
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
  Save,
  FileSignature,
  Calculator
} from 'lucide-react';
import { QuoteForm, QuoteFormData } from '@/components/quote/QuoteForm';
import { QuotePreview } from '@/components/quote/QuotePreview';
import { InstallationForm, InstallationFormData } from '@/components/installation/InstallationForm';
import { InstallationPreview } from '@/components/installation/InstallationPreview';
import { ServiceAgreementForm, ServiceAgreementFormData } from '@/components/service-agreement/ServiceAgreementForm';
import { ServiceAgreementPreview } from '@/components/service-agreement/ServiceAgreementPreview';
import { FMVLeaseForm, FMVLeaseFormData } from '@/components/fmv-lease/FMVLeaseForm';
import { FMVLeasePreview } from '@/components/fmv-lease/FMVLeasePreview';
import { LeaseFundingForm, LeaseFundingFormData } from '@/components/lease-funding/LeaseFundingForm';
import { LeaseFundingPreview } from '@/components/lease-funding/LeaseFundingPreview';
import { LeaseReturnForm, LeaseReturnFormData } from '@/components/lease-return/LeaseReturnForm';
import { LeaseReturnPreview } from '@/components/lease-return/LeaseReturnPreview';
import { LoiForm, LoiFormData } from '@/components/loi/LoiForm';
import { LoiPreview } from '@/components/loi/LoiPreview';
import { InterterritorialForm, InterterritorialFormData } from '@/components/interterritorial/InterterritorialForm';
import { InterterritorialPreview } from '@/components/interterritorial/InterterritorialPreview';
import { NewCustomerForm, NewCustomerFormData } from '@/components/new-customer/NewCustomerForm';
import { NewCustomerPreview } from '@/components/new-customer/NewCustomerPreview';
import RelocationForm, { RelocationFormData, getDefaultRelocationFormData } from '@/components/relocation/RelocationForm';
import RelocationPreview from '@/components/relocation/RelocationPreview';
import { RemovalForm, RemovalFormData, getDefaultRemovalFormData } from '@/components/removal/RemovalForm';
import { RemovalPreview } from '@/components/removal/RemovalPreview';
import { CommissionForm, CommissionFormData, getDefaultCommissionFormData } from '@/components/commission/CommissionForm';
import { CommissionPreview } from '@/components/commission/CommissionPreview';
import { CustomDocumentForm, CustomDocumentPreview, DynamicIcon } from '@/components/custom-document';
import type { CustomDocument } from '@/components/admin/types';
import type { FormCustomizationConfig, FormCustomizationMap } from '@/lib/formCustomization';

const documentTypes = [
  { code: 'quote', name: 'Quote', icon: FileText },
  { code: 'installation', name: 'Installation', icon: ClipboardList },
  { code: 'service_agreement', name: 'Service Agreement', icon: FileCheck },
  { code: 'fmv_lease', name: 'FMV Lease', icon: FileSpreadsheet },
  { code: 'lease_funding', name: 'Lease Funding', icon: Receipt },
  { code: 'loi', name: 'Letter of Intent', icon: FileSignature },
  { code: 'lease_return', name: 'Lease Return', icon: MailOpen },
  { code: 'interterritorial', name: 'Interterritorial', icon: MapPin },
  { code: 'new_customer', name: 'New Customer', icon: UserPlus },
  { code: 'relocation', name: 'Relocation', icon: Truck },
  { code: 'equipment_removal', name: 'Removal', icon: Trash2 },
  { code: 'commission', name: 'Commission', icon: Calculator },
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
  enabled_forms?: string[];
  document_styles?: {
    fontFamily?: string;
    fontColor?: string;
    tableBorderColor?: string;
    tableLineColor?: string;
  };
  proposal_template_url?: string;
  proposal_template_name?: string;
  form_customization?: FormCustomizationMap;
}

interface DocumentTerms {
  [key: string]: string;
}

// Auto-save debounce delay in milliseconds
const AUTO_SAVE_DELAY = 3000;

function DocumentHubContent() {
  const { deal, company, contacts, lineItems, dealOwner, labeledContacts, companyContacts, properties, loading, error, portalId } = useHubSpot();
  
  // Quote state
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<QuoteFormData | null>(null);
  const [savedConfig, setSavedConfig] = useState<QuoteFormData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<TimerId | null>(null);
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
  const installationAutoSaveTimeoutRef = useRef<TimerId | null>(null);
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
  const serviceAgreementAutoSaveTimeoutRef = useRef<TimerId | null>(null);
  const serviceAgreementFormDataRef = useRef<ServiceAgreementFormData | null>(null);

  // FMV Lease state
  const [fmvLeaseFormData, setFmvLeaseFormData] = useState<FMVLeaseFormData | null>(null);
  const [fmvLeaseSavedConfig, setFmvLeaseSavedConfig] = useState<FMVLeaseFormData | null>(null);
  const [fmvLeaseGenerating, setFmvLeaseGenerating] = useState(false);
  const [fmvLeaseSaving, setFmvLeaseSaving] = useState(false);
  const [showFMVLeasePreview, setShowFMVLeasePreview] = useState(false);
  const [fmvLeaseHasUnsavedChanges, setFmvLeaseHasUnsavedChanges] = useState(false);
  const [fmvLeaseLastSavedData, setFmvLeaseLastSavedData] = useState<string | null>(null);
  const fmvLeasePreviewRef = useRef<HTMLDivElement>(null);
  const fmvLeaseAutoSaveTimeoutRef = useRef<TimerId | null>(null);
  const fmvLeaseFormDataRef = useRef<FMVLeaseFormData | null>(null);

  // Lease Funding state (per-line-item like Installation)
  const [leaseFundingFormData, setLeaseFundingFormData] = useState<LeaseFundingFormData | null>(null);
  const [leaseFundingSavedConfig, setLeaseFundingSavedConfig] = useState<Record<string, LeaseFundingFormData>>({});
  const [leaseFundingGenerating, setLeaseFundingGenerating] = useState(false);
  const [leaseFundingSaving, setLeaseFundingSaving] = useState(false);
  const [showLeaseFundingPreview, setShowLeaseFundingPreview] = useState(false);
  const [leaseFundingHasUnsavedChanges, setLeaseFundingHasUnsavedChanges] = useState(false);
  const [leaseFundingLastSavedData, setLeaseFundingLastSavedData] = useState<string | null>(null);
  const leaseFundingPreviewRef = useRef<HTMLDivElement>(null);
  const leaseFundingAutoSaveTimeoutRef = useRef<TimerId | null>(null);
  const leaseFundingFormDataRef = useRef<LeaseFundingFormData | null>(null);

  // LOI state
  const [loiFormData, setLoiFormData] = useState<LoiFormData | null>(null);
  const [loiSavedConfig, setLoiSavedConfig] = useState<LoiFormData | null>(null);
  const [loiGenerating, setLoiGenerating] = useState(false);
  const [loiSaving, setLoiSaving] = useState(false);
  const [showLoiPreview, setShowLoiPreview] = useState(false);
  const [loiHasUnsavedChanges, setLoiHasUnsavedChanges] = useState(false);
  const [loiLastSavedData, setLoiLastSavedData] = useState<string | null>(null);
  const loiPreviewRef = useRef<HTMLDivElement>(null);
  const loiAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loiFormDataRef = useRef<LoiFormData | null>(null);

  // Lease Return state
  const [leaseReturnFormData, setLeaseReturnFormData] = useState<LeaseReturnFormData | null>(null);
  const [leaseReturnSavedConfig, setLeaseReturnSavedConfig] = useState<LeaseReturnFormData | null>(null);
  const [leaseReturnGenerating, setLeaseReturnGenerating] = useState(false);
  const [leaseReturnSaving, setLeaseReturnSaving] = useState(false);
  const [showLeaseReturnPreview, setShowLeaseReturnPreview] = useState(false);
  const [leaseReturnHasUnsavedChanges, setLeaseReturnHasUnsavedChanges] = useState(false);
  const [leaseReturnLastSavedData, setLeaseReturnLastSavedData] = useState<string | null>(null);
  const leaseReturnPreviewRef = useRef<HTMLDivElement>(null);
  const leaseReturnAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaseReturnFormDataRef = useRef<LeaseReturnFormData | null>(null);

  // Interterritorial state
  const [interterritorialFormData, setInterterritorialFormData] = useState<InterterritorialFormData | null>(null);
  const [interterritorialSavedConfig, setInterterritorialSavedConfig] = useState<InterterritorialFormData | null>(null);
  const [interterritorialGenerating, setInterterritorialGenerating] = useState(false);
  const [interterritorialSaving, setInterterritorialSaving] = useState(false);
  const [showInterterritorialPreview, setShowInterterritorialPreview] = useState(false);
  const [interterritorialHasUnsavedChanges, setInterterritorialHasUnsavedChanges] = useState(false);
  const [interterritorialLastSavedData, setInterterritorialLastSavedData] = useState<string | null>(null);
  const interterritorialPreviewRef = useRef<HTMLDivElement>(null);
  const interterritorialAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const interterritorialFormDataRef = useRef<InterterritorialFormData | null>(null);

  // New Customer state
  const [newCustomerFormData, setNewCustomerFormData] = useState<NewCustomerFormData | null>(null);
  const [newCustomerSavedConfig, setNewCustomerSavedConfig] = useState<NewCustomerFormData | null>(null);
  const [newCustomerGenerating, setNewCustomerGenerating] = useState(false);
  const [newCustomerSaving, setNewCustomerSaving] = useState(false);
  const [showNewCustomerPreview, setShowNewCustomerPreview] = useState(false);
  const [newCustomerHasUnsavedChanges, setNewCustomerHasUnsavedChanges] = useState(false);
  const [newCustomerLastSavedData, setNewCustomerLastSavedData] = useState<string | null>(null);
  const newCustomerPreviewRef = useRef<HTMLDivElement>(null);
  const newCustomerAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const newCustomerFormDataRef = useRef<NewCustomerFormData | null>(null);

  // Relocation state
  const [relocationFormData, setRelocationFormData] = useState<RelocationFormData | null>(null);
  const [relocationSavedConfig, setRelocationSavedConfig] = useState<RelocationFormData | null>(null);
  const [relocationGenerating, setRelocationGenerating] = useState(false);
  const [relocationSaving, setRelocationSaving] = useState(false);
  const [showRelocationPreview, setShowRelocationPreview] = useState(false);
  const [relocationHasUnsavedChanges, setRelocationHasUnsavedChanges] = useState(false);
  const [relocationLastSavedData, setRelocationLastSavedData] = useState<string | null>(null);
  const relocationPreviewRef = useRef<HTMLDivElement>(null);
  const relocationAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const relocationFormDataRef = useRef<RelocationFormData | null>(null);

  // Removal state
  const [removalFormData, setRemovalFormData] = useState<RemovalFormData | null>(null);
  const [removalSavedConfig, setRemovalSavedConfig] = useState<RemovalFormData | null>(null);
  const [removalGenerating, setRemovalGenerating] = useState(false);
  const [removalSaving, setRemovalSaving] = useState(false);
  const [showRemovalPreview, setShowRemovalPreview] = useState(false);
  const [removalHasUnsavedChanges, setRemovalHasUnsavedChanges] = useState(false);
  const [removalLastSavedData, setRemovalLastSavedData] = useState<string | null>(null);
  const removalPreviewRef = useRef<HTMLDivElement>(null);
  const removalAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const removalFormDataRef = useRef<RemovalFormData | null>(null);

  // Commission state
  const [commissionFormData, setCommissionFormData] = useState<CommissionFormData | null>(null);
  const [commissionSavedConfig, setCommissionSavedConfig] = useState<CommissionFormData | null>(null);
  const [commissionGenerating, setCommissionGenerating] = useState(false);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [showCommissionPreview, setShowCommissionPreview] = useState(false);
  const [commissionHasUnsavedChanges, setCommissionHasUnsavedChanges] = useState(false);
  const [commissionLastSavedData, setCommissionLastSavedData] = useState<string | null>(null);
  const commissionPreviewRef = useRef<HTMLDivElement>(null);
  const commissionAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const commissionFormDataRef = useRef<CommissionFormData | null>(null);

  // Dealer info and settings
  const [dealerInfo, setDealerInfo] = useState<DealerInfo | null>(null);
  const [dealerSettings, setDealerSettings] = useState<DealerSettings>({});
  const [documentTerms, setDocumentTerms] = useState<DocumentTerms>({});
  const [commissionUsers, setCommissionUsers] = useState<Array<{ hubspot_user_name: string; hubspot_user_id?: string; commission_percentage: number }>>([]);

  // configsLoaded gate: prevents forms from rendering before saved configs are fetched
  const [configsLoaded, setConfigsLoaded] = useState(false);

  // Custom Documents state
  const [customDocuments, setCustomDocuments] = useState<CustomDocument[]>([]);
  const [customDocFormData, setCustomDocFormData] = useState<Record<string, Record<string, any>>>({});
  const [customDocSavedConfig, setCustomDocSavedConfig] = useState<Record<string, Record<string, any>>>({});
  const [customDocGenerating, setCustomDocGenerating] = useState<Record<string, boolean>>({});
  const [customDocSaving, setCustomDocSaving] = useState<Record<string, boolean>>({});
  const [showCustomDocPreview, setShowCustomDocPreview] = useState<Record<string, boolean>>({});
  const customDocPreviewRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // Keep fmvLeaseFormDataRef in sync
  useEffect(() => {
    fmvLeaseFormDataRef.current = fmvLeaseFormData;
  }, [fmvLeaseFormData]);

  // Keep leaseFundingFormDataRef in sync
  useEffect(() => {
    leaseFundingFormDataRef.current = leaseFundingFormData;
  }, [leaseFundingFormData]);

  // Keep leaseReturnFormDataRef in sync
  useEffect(() => {
    leaseReturnFormDataRef.current = leaseReturnFormData;
  }, [leaseReturnFormData]);

  // Keep interterritorialFormDataRef in sync
  useEffect(() => {
    interterritorialFormDataRef.current = interterritorialFormData;
  }, [interterritorialFormData]);

  // Keep newCustomerFormDataRef in sync
  useEffect(() => {
    newCustomerFormDataRef.current = newCustomerFormData;
  }, [newCustomerFormData]);

  // Keep relocationFormDataRef in sync
  useEffect(() => {
    relocationFormDataRef.current = relocationFormData;
  }, [relocationFormData]);

  // Keep removalFormDataRef in sync
  useEffect(() => {
    removalFormDataRef.current = removalFormData;
  }, [removalFormData]);

  // Keep commissionFormDataRef in sync
  useEffect(() => {
    commissionFormDataRef.current = commissionFormData;
  }, [commissionFormData]);

  // Keep loiFormDataRef in sync
  useEffect(() => {
    loiFormDataRef.current = loiFormData;
  }, [loiFormData]);

  // Initialize relocation form data when HubSpot data loads
  useEffect(() => {
    if (loading) return;
    // Don't reinitialize if we already have data or if we have a saved config
    if (relocationFormData || relocationSavedConfig) return;

    const defaultData = getDefaultRelocationFormData();
    
    // Pre-populate company name
    if (company?.name) {
      defaultData.companyName = company.name;
    }
    
    // Pre-populate submitted by from deal owner
    if (dealOwner) {
      defaultData.submittedBy = `${dealOwner.firstName || ''} ${dealOwner.lastName || ''}`.trim();
    }
    
    // Pre-populate Bill To from HubSpot company AP address (same as Service Agreement)
    if (company) {
      defaultData.billToAddress = company.apAddress || '';
      const cityStZipParts = [
        company.apCity,
        company.apState,
        company.apZip
      ].filter(Boolean);
      // Format as "City, ST Zip"
      if (cityStZipParts.length > 0) {
        const city = company.apCity || '';
        const state = company.apState || '';
        const zip = company.apZip || '';
        defaultData.billToCityStZip = `${city}${city && state ? ', ' : ''}${state}${(city || state) && zip ? ' ' : ''}${zip}`.trim();
      }
    }
    
    // Pre-populate Bill To contact from labeled AP contact
    if (labeledContacts?.apContact) {
      const ap = labeledContacts.apContact;
      defaultData.billToPhone = ap.phone || '';
      defaultData.billToEmail = ap.email || '';
    }
    
    // Pre-populate Current Location from HubSpot company delivery address (Ship To)
    if (company) {
      defaultData.currentCompanyName = company.name || '';
      defaultData.currentAddress = company.deliveryAddress || '';
      defaultData.currentCity = company.deliveryCity || '';
      defaultData.currentState = company.deliveryState || '';
      defaultData.currentZip = company.deliveryZip || '';
    }
    
    // Pre-populate Current Location contact from labeled shipping contact
    if (labeledContacts?.shippingContact) {
      const sc = labeledContacts.shippingContact;
      defaultData.currentContact = `${sc.firstName || ''} ${sc.lastName || ''}`.trim();
      defaultData.currentPhone = sc.phone || '';
      defaultData.currentEmail = sc.email || '';
    }
    
    // Pre-populate equipment from line items
    if (lineItems && lineItems.length > 0) {
      defaultData.equipmentItems = lineItems.slice(0, 20).map(item => ({
        id: item.hsObjectId || crypto.randomUUID(),
        makeModel: item.name || '',
        serialNumber: item.properties?.serial_number || '',
        equipmentId: item.properties?.equipment_id || '',
        networkPrint: false,
        scan: false,
        notes: '',
      }));
    }
    
    setRelocationFormData(defaultData);
  }, [loading, company, dealOwner, labeledContacts, lineItems, relocationFormData, relocationSavedConfig]);
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

        // Store custom documents
        if (data?.customDocuments) {
          setCustomDocuments(data.customDocuments.filter((doc: CustomDocument) => doc.is_active));
        }

        // Store commission user settings
        if (data?.commissionUsers) {
          setCommissionUsers(data.commissionUsers);
        }
      } catch (err) {
        console.error('Failed to fetch dealer info:', err);
      }
    };

    fetchDealerInfo();
  }, [portalId]);

  // Load ALL saved configurations in bulk via edge function
  useEffect(() => {
    const loadAllConfigs = async () => {
      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      const dealId = deal?.hsObjectId;
      
      if (!currentPortalId || !dealId) {
        setConfigsLoaded(true);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-configurations-bulk', {
          body: { portalId: currentPortalId, dealId }
        });

        if (error) {
          console.error('Error loading configurations:', error);
          return;
        }

        if (data?.data) {
          const configs = data.data;
          
          // Set quote config
          if (configs.quote) {
            console.log('Loaded saved quote configuration');
            setSavedConfig(configs.quote as QuoteFormData);
          }
          
          // Set installation configs (keyed by line_item_id)
          if (configs.installation && Object.keys(configs.installation).length > 0) {
            console.log('Loaded saved installation configurations');
            setInstallationSavedConfig(configs.installation as Record<string, InstallationFormData>);
          }
          
          // Set service agreement config
          if (configs.serviceAgreement) {
            console.log('Loaded saved service agreement configuration');
            setServiceAgreementSavedConfig(configs.serviceAgreement as ServiceAgreementFormData);
          }
          
          // Set FMV lease config
          if (configs.fmvLease) {
            console.log('Loaded saved FMV lease configuration');
            setFmvLeaseSavedConfig(configs.fmvLease as FMVLeaseFormData);
          }
          
          // Set lease funding configs (keyed by line_item_id)
          if (configs.leaseFunding && Object.keys(configs.leaseFunding).length > 0) {
            console.log('Loaded saved lease funding configurations');
            setLeaseFundingSavedConfig(configs.leaseFunding as Record<string, LeaseFundingFormData>);
          }
          
          // Set lease return config
          if (configs.leaseReturn) {
            console.log('Loaded saved lease return configuration');
            setLeaseReturnSavedConfig(configs.leaseReturn as LeaseReturnFormData);
          }
          
          // Set interterritorial config
          if (configs.interterritorial) {
            console.log('Loaded saved interterritorial configuration');
            setInterterritorialSavedConfig(configs.interterritorial as InterterritorialFormData);
          }
          
          // Set new customer config
          if (configs.newCustomer) {
            console.log('Loaded saved new customer configuration');
            setNewCustomerSavedConfig(configs.newCustomer as NewCustomerFormData);
          }
          
          // Set relocation config
          if (configs.relocation) {
            console.log('Loaded saved relocation configuration');
            const savedRelocation = configs.relocation as RelocationFormData;
            setRelocationSavedConfig(savedRelocation);
            setRelocationFormData(savedRelocation);
          }
          
          // Set removal config
          if (configs.removal) {
            console.log('Loaded saved removal configuration');
            const savedRemoval = configs.removal as RemovalFormData;
            setRemovalSavedConfig(savedRemoval);
            setRemovalFormData(savedRemoval);
          }

          // Set commission config
          if (configs.commission) {
            console.log('Loaded saved commission configuration');
            const savedCommission = configs.commission as CommissionFormData;
            setCommissionSavedConfig(savedCommission);
            setCommissionFormData(savedCommission);
          }

          // Set custom document configs (keyed by custom_document_id)
          if (configs.customDocuments && Object.keys(configs.customDocuments).length > 0) {
            console.log('Loaded saved custom document configurations');
            setCustomDocSavedConfig(configs.customDocuments as Record<string, Record<string, any>>);
            setCustomDocFormData(configs.customDocuments as Record<string, Record<string, any>>);
          }
        }
      } catch (err) {
        console.error('Failed to load configurations:', err);
      } finally {
        setConfigsLoaded(true);
      }
    };

    if (deal?.hsObjectId) {
      loadAllConfigs();
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
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'quote',
          configuration: dataToSave
        }
      });

      if (!saveError) {
        setLastSavedData(dataString);
        setHasUnsavedChanges(false);
        setSavedConfig(dataToSave);
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

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (currentPortalId && dealId) {
      try {
        localStorage.setItem(
          `quote_backup_${currentPortalId}_${dealId}`,
          JSON.stringify({ configuration: data, updatedAt: new Date().toISOString() })
        );
      } catch {
        // ignore localStorage write errors
      }
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave(data);
    }, AUTO_SAVE_DELAY);
  }, [performAutoSave, portalId, deal?.hsObjectId]);

  // Auto-save for installation
  const performInstallationAutoSave = useCallback(async (dataToSave: InstallationFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    const lineItemId = dataToSave.selectedLineItemId;

    if (!currentPortalId || !dealId || !lineItemId || !dataToSave) return;

    const dataString = JSON.stringify(dataToSave);
    if (dataString === installationLastSavedData) return;

    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'installation',
          lineItemId,
          configuration: dataToSave
        }
      });

      if (!saveError) {
        setInstallationLastSavedData(dataString);
        setInstallationHasUnsavedChanges(false);
        setInstallationSavedConfig(prev => ({ ...prev, [dataToSave.selectedLineItemId]: dataToSave }));
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
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'service_agreement',
          configuration: dataToSave
        }
      });

      if (!saveError) {
        setServiceAgreementLastSavedData(dataString);
        setServiceAgreementHasUnsavedChanges(false);
        setServiceAgreementSavedConfig(dataToSave);
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

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (currentPortalId && dealId) {
      try {
        localStorage.setItem(
          `service_agreement_backup_${currentPortalId}_${dealId}`,
          JSON.stringify({ configuration: data, updatedAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
    }

    if (serviceAgreementAutoSaveTimeoutRef.current) {
      clearTimeout(serviceAgreementAutoSaveTimeoutRef.current);
    }

    serviceAgreementAutoSaveTimeoutRef.current = setTimeout(() => {
      performServiceAgreementAutoSave(data);
    }, AUTO_SAVE_DELAY);
  }, [performServiceAgreementAutoSave, portalId, deal?.hsObjectId]);

  // Auto-save for FMV Lease
  const performFMVLeaseAutoSave = useCallback(async (dataToSave: FMVLeaseFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId || !dataToSave) return;

    const dataString = JSON.stringify(dataToSave);
    if (dataString === fmvLeaseLastSavedData) return;

    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'fmv_lease',
          configuration: dataToSave
        }
      });

      if (!saveError) {
        setFmvLeaseLastSavedData(dataString);
        setFmvLeaseHasUnsavedChanges(false);
        setFmvLeaseSavedConfig(dataToSave);
        console.log('Auto-saved FMV lease configuration');
      }
    } catch (err) {
      console.error('FMV lease auto-save error:', err);
    }
  }, [portalId, deal?.hsObjectId, fmvLeaseLastSavedData]);

  // Handle FMV Lease form change
  const handleFMVLeaseFormChange = useCallback((data: FMVLeaseFormData) => {
    setFmvLeaseFormData(data);
    setFmvLeaseHasUnsavedChanges(true);

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (currentPortalId && dealId) {
      try {
        localStorage.setItem(
          `fmv_lease_backup_${currentPortalId}_${dealId}`,
          JSON.stringify({ configuration: data, updatedAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
    }

    if (fmvLeaseAutoSaveTimeoutRef.current) {
      clearTimeout(fmvLeaseAutoSaveTimeoutRef.current);
    }

    fmvLeaseAutoSaveTimeoutRef.current = setTimeout(() => {
      performFMVLeaseAutoSave(data);
    }, AUTO_SAVE_DELAY);
  }, [performFMVLeaseAutoSave, portalId, deal?.hsObjectId]);

  // Auto-save for Lease Funding (per-line-item like Installation)
  const performLeaseFundingAutoSave = useCallback(async (dataToSave: LeaseFundingFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    const lineItemId = dataToSave.selectedLineItemId;

    if (!currentPortalId || !dealId || !lineItemId || !dataToSave) return;

    const dataString = JSON.stringify(dataToSave);
    if (dataString === leaseFundingLastSavedData) return;

    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'lease_funding',
          lineItemId,
          configuration: dataToSave
        }
      });

      if (!saveError) {
        setLeaseFundingLastSavedData(dataString);
        setLeaseFundingHasUnsavedChanges(false);
        if (lineItemId) setLeaseFundingSavedConfig(prev => ({ ...prev, [lineItemId]: dataToSave }));
        console.log('Auto-saved lease funding configuration');
      }
    } catch (err) {
      console.error('Lease funding auto-save error:', err);
    }
  }, [portalId, deal?.hsObjectId, leaseFundingLastSavedData]);

  // Handle lease funding form change
  const handleLeaseFundingFormChange = useCallback((data: LeaseFundingFormData) => {
    setLeaseFundingFormData(data);
    setLeaseFundingHasUnsavedChanges(true);
    
    if (leaseFundingAutoSaveTimeoutRef.current) {
      clearTimeout(leaseFundingAutoSaveTimeoutRef.current);
    }

    if (data.selectedLineItemId) {
      leaseFundingAutoSaveTimeoutRef.current = setTimeout(() => {
        performLeaseFundingAutoSave(data);
      }, AUTO_SAVE_DELAY);
    }
  }, [performLeaseFundingAutoSave]);

  // Auto-save for LOI
  const performLoiAutoSave = useCallback(async (dataToSave: LoiFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId || !dataToSave) return;

    const dataString = JSON.stringify(dataToSave);
    if (dataString === loiLastSavedData) return;

    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'loi',
          configuration: dataToSave
        }
      });

      if (!saveError) {
        setLoiLastSavedData(dataString);
        setLoiHasUnsavedChanges(false);
        setLoiSavedConfig(dataToSave);
        console.log('Auto-saved LOI configuration');
      }
    } catch (err) {
      console.error('LOI auto-save error:', err);
    }
  }, [portalId, deal?.hsObjectId, loiLastSavedData]);

  // Handle LOI form change
  const handleLoiFormChange = useCallback((data: LoiFormData) => {
    setLoiFormData(data);
    setLoiHasUnsavedChanges(true);

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (currentPortalId && dealId) {
      try {
        localStorage.setItem(
          `loi_backup_${currentPortalId}_${dealId}`,
          JSON.stringify({ configuration: data, updatedAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
    }

    if (loiAutoSaveTimeoutRef.current) {
      clearTimeout(loiAutoSaveTimeoutRef.current);
    }

    loiAutoSaveTimeoutRef.current = setTimeout(() => {
      performLoiAutoSave(data);
    }, AUTO_SAVE_DELAY);
  }, [performLoiAutoSave, portalId, deal?.hsObjectId]);

  // Auto-save for Lease Return
  const performLeaseReturnAutoSave = useCallback(async (dataToSave: LeaseReturnFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId || !dataToSave) return;

    const dataString = JSON.stringify(dataToSave);
    if (dataString === leaseReturnLastSavedData) return;

    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'lease_return',
          configuration: dataToSave
        }
      });

      if (!saveError) {
        setLeaseReturnLastSavedData(dataString);
        setLeaseReturnHasUnsavedChanges(false);
        setLeaseReturnSavedConfig(dataToSave);
        console.log('Auto-saved lease return configuration');
      }
    } catch (err) {
      console.error('Lease return auto-save error:', err);
    }
  }, [portalId, deal?.hsObjectId, leaseReturnLastSavedData]);

  // Handle lease return form change
  const handleLeaseReturnFormChange = useCallback((data: LeaseReturnFormData) => {
    setLeaseReturnFormData(data);
    setLeaseReturnHasUnsavedChanges(true);

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (currentPortalId && dealId) {
      try {
        localStorage.setItem(
          `lease_return_backup_${currentPortalId}_${dealId}`,
          JSON.stringify({ configuration: data, updatedAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
    }

    if (leaseReturnAutoSaveTimeoutRef.current) {
      clearTimeout(leaseReturnAutoSaveTimeoutRef.current);
    }

    leaseReturnAutoSaveTimeoutRef.current = setTimeout(() => {
      performLeaseReturnAutoSave(data);
    }, AUTO_SAVE_DELAY);
  }, [performLeaseReturnAutoSave, portalId, deal?.hsObjectId]);

  // Auto-save for Interterritorial
  const performInterterritorialAutoSave = useCallback(async (dataToSave: InterterritorialFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId || !dataToSave) return;

    const dataString = JSON.stringify(dataToSave);
    if (dataString === interterritorialLastSavedData) return;

    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'interterritorial',
          configuration: dataToSave
        }
      });

      if (!saveError) {
        setInterterritorialLastSavedData(dataString);
        setInterterritorialHasUnsavedChanges(false);
        setInterterritorialSavedConfig(dataToSave);
        console.log('Auto-saved interterritorial configuration');
      }
    } catch (err) {
      console.error('Interterritorial auto-save error:', err);
    }
  }, [portalId, deal?.hsObjectId, interterritorialLastSavedData]);

  // Handle interterritorial form change
  const handleInterterritorialFormChange = useCallback((data: InterterritorialFormData) => {
    setInterterritorialFormData(data);
    setInterterritorialHasUnsavedChanges(true);

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (currentPortalId && dealId) {
      try {
        localStorage.setItem(
          `interterritorial_backup_${currentPortalId}_${dealId}`,
          JSON.stringify({ configuration: data, updatedAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
    }

    if (interterritorialAutoSaveTimeoutRef.current) {
      clearTimeout(interterritorialAutoSaveTimeoutRef.current);
    }

    interterritorialAutoSaveTimeoutRef.current = setTimeout(() => {
      performInterterritorialAutoSave(data);
    }, AUTO_SAVE_DELAY);
  }, [performInterterritorialAutoSave, portalId, deal?.hsObjectId]);

  // Auto-save for New Customer
  const performNewCustomerAutoSave = useCallback(async (dataToSave: NewCustomerFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (!currentPortalId || !dealId || !dataToSave) return;
    const dataString = JSON.stringify(dataToSave);
    if (dataString === newCustomerLastSavedData) return;
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: { portalId: currentPortalId, dealId, configType: 'new_customer', configuration: dataToSave }
      });
      if (!saveError) {
        setNewCustomerLastSavedData(dataString);
        setNewCustomerHasUnsavedChanges(false);
        setNewCustomerSavedConfig(dataToSave);
        console.log('Auto-saved new customer configuration');
      }
    } catch (err) { console.error('New customer auto-save error:', err); }
  }, [portalId, deal?.hsObjectId, newCustomerLastSavedData]);

  const handleNewCustomerFormChange = useCallback((data: NewCustomerFormData) => {
    setNewCustomerFormData(data);
    setNewCustomerHasUnsavedChanges(true);

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (currentPortalId && dealId) {
      try {
        localStorage.setItem(
          `new_customer_backup_${currentPortalId}_${dealId}`,
          JSON.stringify({ configuration: data, updatedAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
    }

    if (newCustomerAutoSaveTimeoutRef.current) clearTimeout(newCustomerAutoSaveTimeoutRef.current);
    newCustomerAutoSaveTimeoutRef.current = setTimeout(() => performNewCustomerAutoSave(data), AUTO_SAVE_DELAY);
  }, [performNewCustomerAutoSave, portalId, deal?.hsObjectId]);

  const handleNewCustomerClearAll = useCallback(() => {
    const emptyForm: NewCustomerFormData = {
      companyName: '', tradeName: '', businessDescription: '', taxId: '', taxIdState: '', yearEstablished: '', yearsOwned: '', creditRequested: '', businessType: '',
      hqAddress: '', hqAddress2: '', hqCity: '', hqState: '', hqZip: '', hqPhone: '', hqFax: '', hqEmail: '',
      branchSameAsHq: false, branchAddress: '', branchAddress2: '', branchCity: '', branchState: '', branchZip: '', branchPhone: '', branchFax: '', branchEmail: '',
      billingSameAsHq: false, billingSameAsBranch: false, billingAddress: '', billingAddress2: '', billingCity: '', billingState: '', billingZip: '', billingPhone: '', billingFax: '', billingEmail: '',
      principalName: '', principalTitle: '', principalPhone: '', principalEmail: '',
      equipmentContactName: '', equipmentContactTitle: '', equipmentContactPhone: '', equipmentContactEmail: '',
      apContactName: '', apContactTitle: '', apContactPhone: '', apContactEmail: '',
      interestOfficeMachines: false, interestFurniture: false, interestSupplies: false, interestOther: '',
      bankReferences: [{ id: 'bank-1', bankName: '', address: '', cityStZip: '', contact: '', phone: '', accountNumber: '' }, { id: 'bank-2', bankName: '', address: '', cityStZip: '', contact: '', phone: '', accountNumber: '' }],
      businessReferences: [{ id: 'biz-1', company: '', contact: '', title: '', phone: '', email: '' }, { id: 'biz-2', company: '', contact: '', title: '', phone: '', email: '' }],
      invoiceDelivery: 'email', invoiceEmail: '', invoiceSecondaryEmail: '', paymentMethod: '',
    };
    setNewCustomerFormData(emptyForm);
  }, []);

  const handleNewCustomerSave = async () => {
    if (!newCustomerFormData) { toast.error('No data to save'); return; }
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (!currentPortalId || !dealId) { toast.error('Missing portal or deal information'); return; }
    setNewCustomerSaving(true);
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: { portalId: currentPortalId, dealId, configType: 'new_customer', configuration: newCustomerFormData }
      });
      if (saveError) { console.error('Save error:', saveError); toast.error('Failed to save'); return; }
      setNewCustomerSavedConfig(newCustomerFormData);
      setNewCustomerLastSavedData(JSON.stringify(newCustomerFormData));
      setNewCustomerHasUnsavedChanges(false);
      toast.success('New customer application saved');
    } catch (err) { console.error('Save error:', err); toast.error('Failed to save'); }
    finally { setNewCustomerSaving(false); }
  };

  const handleNewCustomerGeneratePDF = async () => {
    if (!newCustomerPreviewRef.current || !newCustomerFormData) { toast.error('Please fill in the form first'); return; }
    setNewCustomerGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(newCustomerPreviewRef.current);
      const sanitizedCompanyName = (newCustomerFormData.companyName || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      pdf.save(`NewCustomer_${sanitizedCompanyName}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generated');
    } catch (err) { console.error('PDF error:', err); toast.error('Failed to generate PDF'); }
    finally { setNewCustomerGenerating(false); }
  };

  const handleNewCustomerPreview = () => setShowNewCustomerPreview(true);

  // Relocation auto-save
  const performRelocationAutoSave = useCallback(async (dataToSave: RelocationFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (!currentPortalId || !dealId || !dataToSave) return;
    const dataString = JSON.stringify(dataToSave);
    if (dataString === relocationLastSavedData) return;
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: { portalId: currentPortalId, dealId, configType: 'relocation', configuration: dataToSave }
      });
      if (!saveError) {
        setRelocationLastSavedData(dataString);
        setRelocationHasUnsavedChanges(false);
        setRelocationSavedConfig(dataToSave);
        console.log('Auto-saved relocation configuration');
      }
    } catch (err) { console.error('Relocation auto-save error:', err); }
  }, [portalId, deal?.hsObjectId, relocationLastSavedData]);

  const handleRelocationFormChange = useCallback((data: RelocationFormData) => {
    setRelocationFormData(data);
    setRelocationHasUnsavedChanges(true);

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (currentPortalId && dealId) {
      try {
        localStorage.setItem(
          `relocation_backup_${currentPortalId}_${dealId}`,
          JSON.stringify({ configuration: data, updatedAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
    }

    if (relocationAutoSaveTimeoutRef.current) clearTimeout(relocationAutoSaveTimeoutRef.current);
    relocationAutoSaveTimeoutRef.current = setTimeout(() => performRelocationAutoSave(data), AUTO_SAVE_DELAY);
  }, [performRelocationAutoSave, portalId, deal?.hsObjectId]);

  const handleRelocationSave = async () => {
    if (!relocationFormData) { toast.error('No data to save'); return; }
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (!currentPortalId || !dealId) { toast.error('Missing portal or deal information'); return; }
    setRelocationSaving(true);
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: { portalId: currentPortalId, dealId, configType: 'relocation', configuration: relocationFormData }
      });
      if (saveError) { console.error('Save error:', saveError); toast.error('Failed to save'); return; }
      setRelocationSavedConfig(relocationFormData);
      setRelocationLastSavedData(JSON.stringify(relocationFormData));
      setRelocationHasUnsavedChanges(false);
      toast.success('Relocation request saved');
    } catch (err) { console.error('Save error:', err); toast.error('Failed to save'); }
    finally { setRelocationSaving(false); }
  };

  const handleRelocationGeneratePDF = async () => {
    if (!relocationPreviewRef.current || !relocationFormData) { toast.error('Please fill in the form first'); return; }
    setRelocationGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(relocationPreviewRef.current);
      const sanitizedCompanyName = (relocationFormData.companyName || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      pdf.save(`Relocation_${sanitizedCompanyName}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generated');
    } catch (err) { console.error('PDF error:', err); toast.error('Failed to generate PDF'); }
    finally { setRelocationGenerating(false); }
  };

  const handleRelocationPreview = () => setShowRelocationPreview(true);

  // Removal auto-save
  const performRemovalAutoSave = useCallback(async (dataToSave: RemovalFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (!currentPortalId || !dealId || !dataToSave) return;
    const dataString = JSON.stringify(dataToSave);
    if (dataString === removalLastSavedData) return;
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: { portalId: currentPortalId, dealId, configType: 'removal', configuration: dataToSave }
      });
      if (!saveError) {
        setRemovalLastSavedData(dataString);
        setRemovalHasUnsavedChanges(false);
        setRemovalSavedConfig(dataToSave);
        console.log('Auto-saved removal configuration');
      }
    } catch (err) { console.error('Removal auto-save error:', err); }
  }, [portalId, deal?.hsObjectId, removalLastSavedData]);

  const handleRemovalFormChange = useCallback((data: RemovalFormData) => {
    setRemovalFormData(data);
    setRemovalHasUnsavedChanges(true);

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (currentPortalId && dealId) {
      try {
        localStorage.setItem(
          `removal_backup_${currentPortalId}_${dealId}`,
          JSON.stringify({ configuration: data, updatedAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
    }

    if (removalAutoSaveTimeoutRef.current) clearTimeout(removalAutoSaveTimeoutRef.current);
    removalAutoSaveTimeoutRef.current = setTimeout(() => performRemovalAutoSave(data), AUTO_SAVE_DELAY);
  }, [performRemovalAutoSave, portalId, deal?.hsObjectId]);

  const handleRemovalSave = async () => {
    if (!removalFormData) { toast.error('No data to save'); return; }
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (!currentPortalId || !dealId) { toast.error('Missing portal or deal information'); return; }
    setRemovalSaving(true);
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: { portalId: currentPortalId, dealId, configType: 'removal', configuration: removalFormData }
      });
      if (saveError) { console.error('Save error:', saveError); toast.error('Failed to save'); return; }
      setRemovalSavedConfig(removalFormData);
      setRemovalLastSavedData(JSON.stringify(removalFormData));
      setRemovalHasUnsavedChanges(false);
      toast.success('Removal form saved');
    } catch (err) { console.error('Save error:', err); toast.error('Failed to save'); }
    finally { setRemovalSaving(false); }
  };

  const handleRemovalGeneratePDF = async () => {
    if (!removalPreviewRef.current || !removalFormData) { toast.error('Please fill in the form first'); return; }
    setRemovalGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(removalPreviewRef.current);
      const sanitizedCompanyName = (removalFormData.shipToCustomer || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      pdf.save(`Removal_${sanitizedCompanyName}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generated');
    } catch (err) { console.error('PDF error:', err); toast.error('Failed to generate PDF'); }
    finally { setRemovalGenerating(false); }
  };

  const handleRemovalPreview = () => setShowRemovalPreview(true);

  // Commission auto-save
  const performCommissionAutoSave = useCallback(async (dataToSave: CommissionFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (!currentPortalId || !dealId || !dataToSave) return;
    const dataString = JSON.stringify(dataToSave);
    if (dataString === commissionLastSavedData) return;
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: { portalId: currentPortalId, dealId, configType: 'commission', configuration: dataToSave }
      });
      if (!saveError) {
        setCommissionLastSavedData(dataString);
        setCommissionHasUnsavedChanges(false);
        setCommissionSavedConfig(dataToSave);
        console.log('Auto-saved commission configuration');
      }
    } catch (err) { console.error('Commission auto-save error:', err); }
  }, [portalId, deal?.hsObjectId, commissionLastSavedData]);

  const handleCommissionFormChange = useCallback((data: CommissionFormData) => {
    setCommissionFormData(data);
    setCommissionHasUnsavedChanges(true);
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (currentPortalId && dealId) {
      try {
        localStorage.setItem(
          `commission_backup_${currentPortalId}_${dealId}`,
          JSON.stringify({ configuration: data, updatedAt: new Date().toISOString() })
        );
      } catch { /* ignore */ }
    }
    if (commissionAutoSaveTimeoutRef.current) clearTimeout(commissionAutoSaveTimeoutRef.current);
    commissionAutoSaveTimeoutRef.current = setTimeout(() => performCommissionAutoSave(data), AUTO_SAVE_DELAY);
  }, [performCommissionAutoSave, portalId, deal?.hsObjectId]);

  const handleCommissionSave = async () => {
    if (!commissionFormData) { toast.error('No data to save'); return; }
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (!currentPortalId || !dealId) { toast.error('Missing portal or deal information'); return; }
    setCommissionSaving(true);
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: { portalId: currentPortalId, dealId, configType: 'commission', configuration: commissionFormData }
      });
      if (saveError) { console.error('Save error:', saveError); toast.error('Failed to save'); return; }
      setCommissionSavedConfig(commissionFormData);
      setCommissionLastSavedData(JSON.stringify(commissionFormData));
      setCommissionHasUnsavedChanges(false);
      toast.success('Commission worksheet saved');
    } catch (err) { console.error('Save error:', err); toast.error('Failed to save'); }
    finally { setCommissionSaving(false); }
  };

  const handleCommissionGeneratePDF = async () => {
    if (!commissionPreviewRef.current || !commissionFormData) { toast.error('Please fill in the form first'); return; }
    setCommissionGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(commissionPreviewRef.current);
      const sanitizedName = (commissionFormData.customer || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      pdf.save(`Commission_${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generated');
    } catch (err) { console.error('PDF error:', err); toast.error('Failed to generate PDF'); }
    finally { setCommissionGenerating(false); }
  };

  const handleCommissionPreview = () => setShowCommissionPreview(true);

  // LOI handlers
  const handleLoiSave = async () => {
    if (!loiFormData) { toast.error('No data to save'); return; }
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (!currentPortalId || !dealId) { toast.error('Missing portal or deal information'); return; }
    setLoiSaving(true);
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: { portalId: currentPortalId, dealId, configType: 'loi', configuration: loiFormData }
      });
      if (saveError) { console.error('Save error:', saveError); toast.error('Failed to save'); return; }
      setLoiSavedConfig(loiFormData);
      setLoiLastSavedData(JSON.stringify(loiFormData));
      setLoiHasUnsavedChanges(false);
      toast.success('Letter of Intent saved');
    } catch (err) { console.error('Save error:', err); toast.error('Failed to save'); }
    finally { setLoiSaving(false); }
  };

  const handleLoiGeneratePDF = async () => {
    if (!loiPreviewRef.current || !loiFormData) { toast.error('Please fill in the form first'); return; }
    setLoiGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(loiPreviewRef.current);
      const sanitizedCompanyName = (loiFormData.businessName || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const fileName = `LOI_${sanitizedCompanyName}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      const currentDealId = deal?.hsObjectId;

      if (currentPortalId && currentDealId) {
        try {
          const pdfBase64 = pdf.output('datauristring').split(',')[1];
          const { data, error: attachError } = await supabase.functions.invoke('hubspot-attach-file', {
            body: { portalId: currentPortalId, dealId: currentDealId, fileName, fileBase64: pdfBase64 }
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
        toast.success('LOI PDF downloaded successfully!');
      }
    } catch (err) { console.error('PDF error:', err); toast.error('Failed to generate PDF'); }
    finally { setLoiGenerating(false); }
  };

  const handleLoiPreview = () => setShowLoiPreview(true);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((hasUnsavedChanges && formDataRef.current) || (installationHasUnsavedChanges && installationFormDataRef.current) || (serviceAgreementHasUnsavedChanges && serviceAgreementFormDataRef.current) || (fmvLeaseHasUnsavedChanges && fmvLeaseFormDataRef.current) || (leaseFundingHasUnsavedChanges && leaseFundingFormDataRef.current) || (loiHasUnsavedChanges && loiFormDataRef.current) || (leaseReturnHasUnsavedChanges && leaseReturnFormDataRef.current) || (interterritorialHasUnsavedChanges && interterritorialFormDataRef.current) || (relocationHasUnsavedChanges && relocationFormDataRef.current) || (removalHasUnsavedChanges && removalFormDataRef.current) || (commissionHasUnsavedChanges && commissionFormDataRef.current)) {
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
        if (fmvLeaseHasUnsavedChanges && fmvLeaseFormDataRef.current) {
          performFMVLeaseAutoSave(fmvLeaseFormDataRef.current);
        }
        if (leaseFundingHasUnsavedChanges && leaseFundingFormDataRef.current) {
          performLeaseFundingAutoSave(leaseFundingFormDataRef.current);
        }
        if (loiHasUnsavedChanges && loiFormDataRef.current) {
          performLoiAutoSave(loiFormDataRef.current);
        }
        if (leaseReturnHasUnsavedChanges && leaseReturnFormDataRef.current) {
          performLeaseReturnAutoSave(leaseReturnFormDataRef.current);
        }
        if (interterritorialHasUnsavedChanges && interterritorialFormDataRef.current) {
          performInterterritorialAutoSave(interterritorialFormDataRef.current);
        }
        if (relocationHasUnsavedChanges && relocationFormDataRef.current) {
          performRelocationAutoSave(relocationFormDataRef.current);
        }
        if (removalHasUnsavedChanges && removalFormDataRef.current) {
          performRemovalAutoSave(removalFormDataRef.current);
        }
        if (commissionHasUnsavedChanges && commissionFormDataRef.current) {
          performCommissionAutoSave(commissionFormDataRef.current);
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
      if (fmvLeaseAutoSaveTimeoutRef.current) {
        clearTimeout(fmvLeaseAutoSaveTimeoutRef.current);
      }
      if (leaseFundingAutoSaveTimeoutRef.current) {
        clearTimeout(leaseFundingAutoSaveTimeoutRef.current);
      }
      if (loiAutoSaveTimeoutRef.current) {
        clearTimeout(loiAutoSaveTimeoutRef.current);
      }
      if (leaseReturnAutoSaveTimeoutRef.current) {
        clearTimeout(leaseReturnAutoSaveTimeoutRef.current);
      }
      if (interterritorialAutoSaveTimeoutRef.current) {
        clearTimeout(interterritorialAutoSaveTimeoutRef.current);
      }
      if (relocationAutoSaveTimeoutRef.current) {
        clearTimeout(relocationAutoSaveTimeoutRef.current);
      }
      if (removalAutoSaveTimeoutRef.current) {
        clearTimeout(removalAutoSaveTimeoutRef.current);
      }
      if (commissionAutoSaveTimeoutRef.current) {
        clearTimeout(commissionAutoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, installationHasUnsavedChanges, serviceAgreementHasUnsavedChanges, fmvLeaseHasUnsavedChanges, leaseFundingHasUnsavedChanges, loiHasUnsavedChanges, leaseReturnHasUnsavedChanges, interterritorialHasUnsavedChanges, relocationHasUnsavedChanges, removalHasUnsavedChanges, commissionHasUnsavedChanges, performAutoSave, performInstallationAutoSave, performServiceAgreementAutoSave, performFMVLeaseAutoSave, performLeaseFundingAutoSave, performLoiAutoSave, performLeaseReturnAutoSave, performInterterritorialAutoSave, performRelocationAutoSave, performRemovalAutoSave, performCommissionAutoSave]);

  // Recover from localStorage backups (portal+deal scoped; prevents cross-tenant leakage)
  useEffect(() => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    if (!currentPortalId || !dealId) return;

    const readBackup = <T,>(key: string): T | null => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return (parsed?.configuration ?? null) as T | null;
      } catch {
        return null;
      }
    };

    const quoteBackup = readBackup<QuoteFormData>(`quote_backup_${currentPortalId}_${dealId}`);
    if (quoteBackup && !savedConfig) {
      setSavedConfig(quoteBackup);
      if (!formDataRef.current) setFormData(quoteBackup);
      setHasUnsavedChanges(true);
      localStorage.removeItem(`quote_backup_${currentPortalId}_${dealId}`);
      localStorage.removeItem(`quote_backup_${dealId}`); // legacy cleanup
    }

    const serviceAgreementBackup = readBackup<ServiceAgreementFormData>(`service_agreement_backup_${currentPortalId}_${dealId}`);
    if (serviceAgreementBackup && !serviceAgreementSavedConfig) {
      setServiceAgreementSavedConfig(serviceAgreementBackup);
      if (!serviceAgreementFormDataRef.current) setServiceAgreementFormData(serviceAgreementBackup);
      setServiceAgreementHasUnsavedChanges(true);
      localStorage.removeItem(`service_agreement_backup_${currentPortalId}_${dealId}`);
    }

    const fmvLeaseBackup = readBackup<FMVLeaseFormData>(`fmv_lease_backup_${currentPortalId}_${dealId}`);
    if (fmvLeaseBackup && !fmvLeaseSavedConfig) {
      setFmvLeaseSavedConfig(fmvLeaseBackup);
      if (!fmvLeaseFormDataRef.current) setFmvLeaseFormData(fmvLeaseBackup);
      setFmvLeaseHasUnsavedChanges(true);
      localStorage.removeItem(`fmv_lease_backup_${currentPortalId}_${dealId}`);
    }

    const loiBackup = readBackup<LoiFormData>(`loi_backup_${currentPortalId}_${dealId}`);
    if (loiBackup && !loiSavedConfig) {
      setLoiSavedConfig(loiBackup);
      if (!loiFormDataRef.current) setLoiFormData(loiBackup);
      setLoiHasUnsavedChanges(true);
      localStorage.removeItem(`loi_backup_${currentPortalId}_${dealId}`);
    }

    const leaseReturnBackup = readBackup<LeaseReturnFormData>(`lease_return_backup_${currentPortalId}_${dealId}`);
    if (leaseReturnBackup && !leaseReturnSavedConfig) {
      setLeaseReturnSavedConfig(leaseReturnBackup);
      if (!leaseReturnFormDataRef.current) setLeaseReturnFormData(leaseReturnBackup);
      setLeaseReturnHasUnsavedChanges(true);
      localStorage.removeItem(`lease_return_backup_${currentPortalId}_${dealId}`);
    }

    const interterritorialBackup = readBackup<InterterritorialFormData>(`interterritorial_backup_${currentPortalId}_${dealId}`);
    if (interterritorialBackup && !interterritorialSavedConfig) {
      setInterterritorialSavedConfig(interterritorialBackup);
      if (!interterritorialFormDataRef.current) setInterterritorialFormData(interterritorialBackup);
      setInterterritorialHasUnsavedChanges(true);
      localStorage.removeItem(`interterritorial_backup_${currentPortalId}_${dealId}`);
    }

    const newCustomerBackup = readBackup<NewCustomerFormData>(`new_customer_backup_${currentPortalId}_${dealId}`);
    if (newCustomerBackup && !newCustomerSavedConfig) {
      setNewCustomerSavedConfig(newCustomerBackup);
      if (!newCustomerFormDataRef.current) setNewCustomerFormData(newCustomerBackup);
      setNewCustomerHasUnsavedChanges(true);
      localStorage.removeItem(`new_customer_backup_${currentPortalId}_${dealId}`);
    }

    const relocationBackup = readBackup<RelocationFormData>(`relocation_backup_${currentPortalId}_${dealId}`);
    if (relocationBackup && !relocationSavedConfig) {
      setRelocationSavedConfig(relocationBackup);
      if (!relocationFormDataRef.current) setRelocationFormData(relocationBackup);
      setRelocationHasUnsavedChanges(true);
      localStorage.removeItem(`relocation_backup_${currentPortalId}_${dealId}`);
    }

    const removalBackup = readBackup<RemovalFormData>(`removal_backup_${currentPortalId}_${dealId}`);
    if (removalBackup && !removalSavedConfig) {
      setRemovalSavedConfig(removalBackup);
      if (!removalFormDataRef.current) setRemovalFormData(removalBackup);
      setRemovalHasUnsavedChanges(true);
      localStorage.removeItem(`removal_backup_${currentPortalId}_${dealId}`);
    }

    const commissionBackup = readBackup<CommissionFormData>(`commission_backup_${currentPortalId}_${dealId}`);
    if (commissionBackup && !commissionSavedConfig) {
      setCommissionSavedConfig(commissionBackup);
      if (!commissionFormDataRef.current) setCommissionFormData(commissionBackup);
      setCommissionHasUnsavedChanges(true);
      localStorage.removeItem(`commission_backup_${currentPortalId}_${dealId}`);
    }
  }, [portalId, deal?.hsObjectId, savedConfig, serviceAgreementSavedConfig, fmvLeaseSavedConfig, loiSavedConfig, leaseReturnSavedConfig, interterritorialSavedConfig, newCustomerSavedConfig, relocationSavedConfig, removalSavedConfig, commissionSavedConfig]);

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
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'quote',
          configuration: formData
        }
      });

      if (saveError) {
        console.error('Save error:', saveError);
        toast.error('Failed to save configuration');
        return;
      }

      // Update savedConfig so tab switches preserve data
      setSavedConfig(formData);
      setLastSavedData(JSON.stringify(formData));
      setHasUnsavedChanges(false);
      // Clear both portal-scoped and legacy backup keys
      localStorage.removeItem(`quote_backup_${currentPortalId}_${dealId}`);
      localStorage.removeItem(`quote_backup_${dealId}`);

      // Sync line items to HubSpot (replace all)
      if (formData.lineItems && formData.lineItems.length > 0) {
        try {
          const { error: syncError } = await supabase.functions.invoke('hubspot-sync-line-items', {
            body: {
              portalId: currentPortalId,
              dealId: dealId,
              lineItems: formData.lineItems.map(item => ({
                hs_product_id: (item as any).hs_product_id || undefined,
                model: item.model,
                description: item.description,
                quantity: item.quantity,
                price: item.price,
                cost: item.cost,
                dealer: item.dealerSource || '',
                productType: item.productType || '',
                msrp: item.msrp || 0,
              })),
            }
          });

          if (syncError) {
            console.error('Line item sync error:', syncError);
          }
        } catch (syncErr) {
          console.error('Line item sync error:', syncErr);
        }
      }

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
            toast.success('Configuration saved (HubSpot sync partial)');
          } else {
            toast.success('Configuration saved & synced to HubSpot');
          }
        } catch (hsErr) {
          console.error('HubSpot sync error:', hsErr);
          toast.success('Configuration saved (HubSpot sync partial)');
        }
      } else {
        toast.success('Configuration saved & line items synced');
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
        await supabase.functions.invoke('save-configuration', {
          body: {
            portalId: currentPortalId,
            dealId,
            configType: 'installation',
            lineItemId: currentFormData.selectedLineItemId,
            configuration: currentFormData
          }
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
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'installation',
          lineItemId: installationFormData.selectedLineItemId,
          configuration: installationFormData
        }
      });

      if (saveError) {
        console.error('Save error:', saveError);
        toast.error('Failed to save installation configuration');
        return;
      }

      // Update saved config cache so tab switches preserve data
      setInstallationSavedConfig(prev => ({
        ...prev,
        [installationFormData.selectedLineItemId]: installationFormData
      }));
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
      const quotePdf = await generateMultiPagePDF(previewRef.current);
      
      const sanitizedCompanyName = (formData.companyName || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const fileName = `Quote_${sanitizedCompanyName}_${dateStr}_${timeStr}.pdf`;

      let finalPdfBytes: ArrayBuffer;
      const proposalUrl = dealerSettings.proposal_template_url;

      if (proposalUrl) {
        try {
          // Fetch proposal PDF and merge with quote
          const proposalResponse = await fetch(proposalUrl);
          if (!proposalResponse.ok) throw new Error('Failed to fetch proposal template');
          const proposalBytes = await proposalResponse.arrayBuffer();
          const proposalPdfDoc = await PDFDocument.load(proposalBytes);
          const quotePdfBytes = quotePdf.output('arraybuffer');
          const quotePdfDoc = await PDFDocument.load(quotePdfBytes);
          
          const mergedPdf = await PDFDocument.create();
          // Copy proposal pages first
          const proposalPages = await mergedPdf.copyPages(proposalPdfDoc, proposalPdfDoc.getPageIndices());
          proposalPages.forEach(p => mergedPdf.addPage(p));
          // Then quote pages
          const quotePages = await mergedPdf.copyPages(quotePdfDoc, quotePdfDoc.getPageIndices());
          quotePages.forEach(p => mergedPdf.addPage(p));
          
          finalPdfBytes = await mergedPdf.save() as unknown as ArrayBuffer;
        } catch (mergeErr) {
          console.error('Failed to merge proposal PDF, using quote only:', mergeErr);
          toast.error('Could not merge proposal template, generating quote only');
          finalPdfBytes = quotePdf.output('arraybuffer');
        }
      } else {
        finalPdfBytes = quotePdf.output('arraybuffer');
      }

      // Download the final PDF
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      const currentDealId = deal?.hsObjectId;

      if (currentPortalId && currentDealId) {
        try {
          // Convert to base64 for HubSpot attachment
          const uint8Array = new Uint8Array(finalPdfBytes);
          let binary = '';
          uint8Array.forEach(byte => binary += String.fromCharCode(byte));
          const pdfBase64 = btoa(binary);
          
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
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'service_agreement',
          configuration: serviceAgreementFormData
        }
      });

      if (saveError) {
        console.error('Save error:', saveError);
        toast.error('Failed to save service agreement configuration');
        return;
      }

      setServiceAgreementLastSavedData(JSON.stringify(serviceAgreementFormData));
      setServiceAgreementHasUnsavedChanges(false);
      setServiceAgreementSavedConfig(serviceAgreementFormData);
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

  // FMV Lease handlers
  const handleFMVLeaseSave = async () => {
    if (!fmvLeaseFormData) {
      toast.error('No data to save');
      return;
    }

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId) {
      toast.error('Missing portal or deal information');
      return;
    }

    setFmvLeaseSaving(true);
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'fmv_lease',
          configuration: fmvLeaseFormData
        }
      });

      if (saveError) {
        console.error('Save error:', saveError);
        toast.error('Failed to save FMV lease configuration');
        return;
      }

      setFmvLeaseLastSavedData(JSON.stringify(fmvLeaseFormData));
      setFmvLeaseHasUnsavedChanges(false);
      setFmvLeaseSavedConfig(fmvLeaseFormData);
      toast.success('FMV lease configuration saved');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save FMV lease configuration');
    } finally {
      setFmvLeaseSaving(false);
    }
  };

  const handleFMVLeaseGeneratePDF = async () => {
    if (!fmvLeasePreviewRef.current || !fmvLeaseFormData) {
      toast.error('Please fill in the FMV lease details first');
      return;
    }

    setFmvLeaseGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(fmvLeasePreviewRef.current);
      
      const sanitizedCompanyName = (fmvLeaseFormData.companyLegalName || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const fileName = `FMV_Lease_${sanitizedCompanyName}_${dateStr}_${timeStr}.pdf`;
      
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
        toast.success('FMV Lease PDF downloaded successfully!');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setFmvLeaseGenerating(false);
    }
  };

  const handleFMVLeasePreview = () => {
    if (!fmvLeaseFormData) {
      toast.error('Please fill in the FMV lease details first');
      return;
    }
    setShowFMVLeasePreview(true);
  };

  // Lease Funding handlers
  const handleLeaseFundingLineItemSwitch = async (newLineItemId: string, currentFormData: LeaseFundingFormData) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (currentPortalId && dealId && currentFormData.selectedLineItemId) {
      try {
        await supabase.functions.invoke('save-configuration', {
          body: {
            portalId: currentPortalId,
            dealId,
            configType: 'lease_funding',
            lineItemId: currentFormData.selectedLineItemId,
            configuration: currentFormData
          }
        });
        
        // Update saved config cache
        setLeaseFundingSavedConfig(prev => ({
          ...prev,
          [currentFormData.selectedLineItemId]: currentFormData
        }));
      } catch (err) {
        console.error('Auto-save on switch error:', err);
      }
    }
  };

  const handleLeaseFundingSave = async () => {
    if (!leaseFundingFormData || !leaseFundingFormData.selectedLineItemId) {
      toast.error('Please select a hardware item first');
      return;
    }

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId) {
      toast.error('Missing portal or deal information');
      return;
    }

    setLeaseFundingSaving(true);
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'lease_funding',
          lineItemId: leaseFundingFormData.selectedLineItemId,
          configuration: leaseFundingFormData
        }
      });

      if (saveError) {
        console.error('Save error:', saveError);
        toast.error('Failed to save lease funding configuration');
        return;
      }

      // Update saved config cache
      setLeaseFundingSavedConfig(prev => ({
        ...prev,
        [leaseFundingFormData.selectedLineItemId]: leaseFundingFormData
      }));
      setLeaseFundingLastSavedData(JSON.stringify(leaseFundingFormData));
      setLeaseFundingHasUnsavedChanges(false);
      toast.success('Lease funding configuration saved');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save lease funding configuration');
    } finally {
      setLeaseFundingSaving(false);
    }
  };

  const handleLeaseFundingGeneratePDF = async () => {
    if (!leaseFundingPreviewRef.current || !leaseFundingFormData || !leaseFundingFormData.selectedLineItemId) {
      toast.error('Please select a hardware item and fill in the details first');
      return;
    }

    setLeaseFundingGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(leaseFundingPreviewRef.current);
      
      const sanitizedCompanyName = (leaseFundingFormData.customerName || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const fileName = `Lease_Funding_${sanitizedCompanyName}_${dateStr}_${timeStr}.pdf`;
      
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
        toast.success('Lease Funding PDF downloaded successfully!');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setLeaseFundingGenerating(false);
    }
  };

  const handleLeaseFundingPreview = () => {
    if (!leaseFundingFormData || !leaseFundingFormData.selectedLineItemId) {
      toast.error('Please select a hardware item first');
      return;
    }
    setShowLeaseFundingPreview(true);
  };

  // Lease Return handlers
  const handleLeaseReturnSave = async () => {
    if (!leaseReturnFormData) {
      toast.error('No data to save');
      return;
    }

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId) {
      toast.error('Missing portal or deal information');
      return;
    }

    setLeaseReturnSaving(true);
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'lease_return',
          configuration: leaseReturnFormData
        }
      });

      if (saveError) {
        console.error('Save error:', saveError);
        toast.error('Failed to save lease return configuration');
        return;
      }

      setLeaseReturnSavedConfig(leaseReturnFormData);
      setLeaseReturnLastSavedData(JSON.stringify(leaseReturnFormData));
      setLeaseReturnHasUnsavedChanges(false);
      toast.success('Lease return configuration saved');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save lease return configuration');
    } finally {
      setLeaseReturnSaving(false);
    }
  };

  const handleLeaseReturnGeneratePDF = async () => {
    if (!leaseReturnPreviewRef.current || !leaseReturnFormData) {
      toast.error('Please fill in the lease return details first');
      return;
    }

    setLeaseReturnGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(leaseReturnPreviewRef.current);
      
      const sanitizedCompanyName = (leaseReturnFormData.customerName || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const fileName = `Lease_Return_${sanitizedCompanyName}_${dateStr}_${timeStr}.pdf`;
      
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
        toast.success('Lease Return PDF downloaded successfully!');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setLeaseReturnGenerating(false);
    }
  };

  const handleLeaseReturnPreview = () => {
    if (!leaseReturnFormData) {
      toast.error('Please fill in the lease return details first');
      return;
    }
    setShowLeaseReturnPreview(true);
  };

  // Interterritorial handlers
  const handleInterterritorialSave = async () => {
    if (!interterritorialFormData) {
      toast.error('No data to save');
      return;
    }

    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;

    if (!currentPortalId || !dealId) {
      toast.error('Missing portal or deal information');
      return;
    }

    setInterterritorialSaving(true);
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'interterritorial',
          configuration: interterritorialFormData
        }
      });

      if (saveError) {
        console.error('Save error:', saveError);
        toast.error('Failed to save interterritorial configuration');
        return;
      }

      setInterterritorialSavedConfig(interterritorialFormData);
      setInterterritorialLastSavedData(JSON.stringify(interterritorialFormData));
      setInterterritorialHasUnsavedChanges(false);
      toast.success('Interterritorial configuration saved');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save interterritorial configuration');
    } finally {
      setInterterritorialSaving(false);
    }
  };

  const handleInterterritorialGeneratePDF = async () => {
    if (!interterritorialPreviewRef.current || !interterritorialFormData) {
      toast.error('Please fill in the interterritorial details first');
      return;
    }

    setInterterritorialGenerating(true);
    try {
      const pdf = await generateMultiPagePDF(interterritorialPreviewRef.current);
      
      const sanitizedCompanyName = (interterritorialFormData.customerName || 'Draft').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const fileName = `Interterritorial_Request_${sanitizedCompanyName}_${dateStr}_${timeStr}.pdf`;
      
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
        toast.success('Interterritorial PDF downloaded successfully!');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setInterterritorialGenerating(false);
    }
  };

  const handleInterterritorialPreview = () => {
    if (!interterritorialFormData) {
      toast.error('Please fill in the interterritorial details first');
      return;
    }
    setShowInterterritorialPreview(true);
  };

  // Get the saved config for the currently selected line item
  const getCurrentInstallationSavedConfig = () => {
    if (!installationFormData?.selectedLineItemId) return undefined;
    return installationSavedConfig[installationFormData.selectedLineItemId];
  };

  // Get the saved config for the currently selected lease funding line item
  const getCurrentLeaseFundingSavedConfig = () => {
    if (!leaseFundingFormData?.selectedLineItemId) return undefined;
    return leaseFundingSavedConfig[leaseFundingFormData.selectedLineItemId];
  };

  // Custom Document handlers
  const handleCustomDocFormChange = useCallback((docId: string, data: Record<string, any>) => {
    setCustomDocFormData(prev => ({ ...prev, [docId]: data }));
  }, []);

  const handleCustomDocSave = useCallback(async (docId: string) => {
    const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
    const dealId = deal?.hsObjectId;
    const formDataToSave = customDocFormData[docId];

    if (!currentPortalId || !dealId || !formDataToSave) {
      toast.error('Missing required data for save');
      return;
    }

    setCustomDocSaving(prev => ({ ...prev, [docId]: true }));
    try {
      const { error: saveError } = await supabase.functions.invoke('save-configuration', {
        body: {
          portalId: currentPortalId,
          dealId,
          configType: 'custom_document',
          customDocumentId: docId,
          configuration: formDataToSave
        }
      });

      if (saveError) {
        console.error('Save error:', saveError);
        toast.error('Failed to save custom document');
        return;
      }

      setCustomDocSavedConfig(prev => ({ ...prev, [docId]: formDataToSave }));
      toast.success('Custom document saved');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save custom document');
    } finally {
      setCustomDocSaving(prev => ({ ...prev, [docId]: false }));
    }
  }, [portalId, deal?.hsObjectId, customDocFormData]);

  const handleCustomDocGeneratePDF = useCallback(async (docId: string) => {
    const previewRef = customDocPreviewRefs.current[docId];
    const doc = customDocuments.find(d => d.id === docId);
    
    if (!previewRef || !doc) {
      toast.error('Please configure the document first');
      return;
    }

    setCustomDocGenerating(prev => ({ ...prev, [docId]: true }));
    try {
      const canvas = await html2canvas(previewRef, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      const pageWidthIn = 8.5;
      const pageHeightIn = 11;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const aspectRatio = imgWidth / imgHeight;
      const pdfWidth = pageWidthIn;
      const pdfHeight = pdfWidth / aspectRatio;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [pageWidthIn, pageHeightIn],
      });

      if (pdfHeight <= pageHeightIn) {
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } else {
        const totalPages = Math.ceil(pdfHeight / pageHeightIn);
        const pixelsPerPage = canvas.height / totalPages;

        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = pixelsPerPage;

          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, page * pixelsPerPage, canvas.width, pixelsPerPage, 0, 0, canvas.width, pixelsPerPage);
          }

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.85);
          pdf.addImage(pageImgData, 'JPEG', 0, 0, pageWidthIn, pageHeightIn);
        }
      }

      const sanitizedName = doc.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const fileName = `${sanitizedName}_${dateStr}.pdf`;
      
      pdf.save(fileName);

      const currentPortalId = portalId || localStorage.getItem('hs_portal_id');
      const currentDealId = deal?.hsObjectId;

      if (currentPortalId && currentDealId) {
        try {
          const pdfBase64 = pdf.output('datauristring').split(',')[1];
          const { error: attachError } = await supabase.functions.invoke('hubspot-attach-file', {
            body: {
              portalId: currentPortalId,
              dealId: currentDealId,
              fileName,
              fileBase64: pdfBase64
            }
          });

          if (attachError) {
            toast.success('PDF downloaded! (Could not attach to deal)');
          } else {
            toast.success('PDF downloaded and attached to deal!');
          }
        } catch (attachErr) {
          console.error('Failed to attach to HubSpot:', attachErr);
          toast.success('PDF downloaded! (Could not attach to deal)');
        }
      } else {
        toast.success('PDF downloaded successfully!');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setCustomDocGenerating(prev => ({ ...prev, [docId]: false }));
    }
  }, [customDocuments, portalId, deal?.hsObjectId]);

  const handleCustomDocPreview = useCallback((docId: string) => {
    setShowCustomDocPreview(prev => ({ ...prev, [docId]: true }));
  }, []);

  if (loading || !configsLoaded) {
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
            {documentTypes
              .filter(doc => !dealerSettings.enabled_forms || dealerSettings.enabled_forms.length === 0 || dealerSettings.enabled_forms.includes(doc.code))
              .map((doc) => {
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
            {/* Custom Document Tabs */}
            {customDocuments.map((customDoc) => (
              <TabsTrigger
                key={customDoc.code}
                value={customDoc.code}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-1.5 text-xs"
              >
                <DynamicIcon name={customDoc.icon} className="h-3.5 w-3.5 mr-1.5" />
                {customDoc.name}
              </TabsTrigger>
            ))}
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
                  formCustomization={dealerSettings.form_customization?.quote}
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
                  quoteLineItems={formData?.lineItems?.map(li => ({
                    id: li.id,
                    model: li.model,
                    description: li.description,
                    quantity: li.quantity,
                    productType: li.productType,
                    parentLineItemId: li.parentLineItemId,
                  }))}
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

          {/* FMV Lease Tab Content */}
          <TabsContent value="fmv_lease" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Generate FMV Lease Agreement
                </CardTitle>
                <CardDescription>
                  Create an FMV lease agreement with customer, equipment, and payment details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FMVLeaseForm
                  formData={fmvLeaseFormData || {
                    companyLegalName: '',
                    phone: '',
                    billingAddress: '',
                    billingCity: '',
                    billingState: '',
                    billingZip: '',
                    equipmentAddress: '',
                    equipmentCity: '',
                    equipmentState: '',
                    equipmentZip: '',
                    equipmentItems: [],
                    termInMonths: '',
                    paymentFrequency: 'monthly',
                    firstPaymentDate: null,
                    paymentAmount: '',
                  }}
                  onChange={handleFMVLeaseFormChange}
                  company={company ? {
                    name: company.name,
                    phone: company.phone,
                    deliveryAddress: company.deliveryAddress,
                    deliveryAddress2: company.deliveryAddress2,
                    deliveryCity: company.deliveryCity,
                    deliveryState: company.deliveryState,
                    deliveryZip: company.deliveryZip,
                    apAddress: company.apAddress,
                    apAddress2: company.apAddress2,
                    apCity: company.apCity,
                    apState: company.apState,
                    apZip: company.apZip,
                    address: company.address,
                    address2: company.address2,
                    city: company.city,
                    state: company.state,
                    zip: company.zip,
                  } : null}
                  lineItems={lineItems}
                  savedConfig={fmvLeaseSavedConfig}
                  serviceAgreementFormData={serviceAgreementFormData ? {
                    contractLengthMonths: serviceAgreementFormData.contractLengthMonths,
                    effectiveDate: serviceAgreementFormData.effectiveDate,
                  } : null}
                  quoteFormData={formData ? {
                    serviceBaseRate: formData.serviceBaseRate,
                  } : null}
                />

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleFMVLeaseSave} disabled={fmvLeaseSaving}>
                    {fmvLeaseSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {fmvLeaseSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={handleFMVLeaseGeneratePDF} disabled={fmvLeaseGenerating}>
                    {fmvLeaseGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {fmvLeaseGenerating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="outline" onClick={handleFMVLeasePreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lease Funding Tab Content */}
          <TabsContent value="lease_funding" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Generate Lease Funding Document
                  {hardwareLineItems.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {hardwareLineItems.length} hardware item{hardwareLineItems.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Create a lease funding document for each hardware item
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <LeaseFundingForm
                  deal={deal}
                  company={company ? {
                    name: company.name,
                    deliveryAddress: company.deliveryAddress,
                    deliveryAddress2: company.deliveryAddress2,
                    deliveryCity: company.deliveryCity,
                    deliveryState: company.deliveryState,
                    deliveryZip: company.deliveryZip,
                    address: company.address,
                    address2: company.address2,
                    city: company.city,
                    state: company.state,
                    zip: company.zip,
                  } : null}
                  lineItems={lineItems}
                  dealOwner={dealOwner}
                  fmvLeaseFormData={fmvLeaseFormData ? {
                    companyLegalName: fmvLeaseFormData.companyLegalName,
                    equipmentAddress: fmvLeaseFormData.equipmentAddress,
                    equipmentCity: fmvLeaseFormData.equipmentCity,
                    equipmentState: fmvLeaseFormData.equipmentState,
                    equipmentZip: fmvLeaseFormData.equipmentZip,
                    termInMonths: fmvLeaseFormData.termInMonths,
                    paymentAmount: fmvLeaseFormData.paymentAmount,
                  } : null}
                  portalId={portalId || localStorage.getItem('hs_portal_id') || undefined}
                  onFormChange={handleLeaseFundingFormChange}
                  onLineItemSwitch={handleLeaseFundingLineItemSwitch}
                  savedConfig={getCurrentLeaseFundingSavedConfig()}
                />

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleLeaseFundingSave} disabled={leaseFundingSaving}>
                    {leaseFundingSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {leaseFundingSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={handleLeaseFundingGeneratePDF} disabled={leaseFundingGenerating}>
                    {leaseFundingGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {leaseFundingGenerating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="outline" onClick={handleLeaseFundingPreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Letter of Intent Tab Content */}
          <TabsContent value="loi" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  Letter of Intent
                </CardTitle>
                <CardDescription>
                  Create a non-binding letter of intent for lease terms with a leasing company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <LoiForm
                  company={company}
                  lineItems={lineItems || []}
                  dealOwner={dealOwner}
                  fmvLeaseFormData={fmvLeaseFormData ? {
                    companyLegalName: fmvLeaseFormData.companyLegalName,
                    billingAddress: fmvLeaseFormData.billingAddress,
                    billingCity: fmvLeaseFormData.billingCity,
                    billingState: fmvLeaseFormData.billingState,
                    billingZip: fmvLeaseFormData.billingZip,
                    phone: fmvLeaseFormData.phone,
                    termInMonths: fmvLeaseFormData.termInMonths,
                    paymentAmount: fmvLeaseFormData.paymentAmount,
                  } : null}
                  labeledContacts={labeledContacts || null}
                  portalId={portalId || localStorage.getItem('hs_portal_id') || undefined}
                  onFormChange={handleLoiFormChange}
                  savedConfig={loiSavedConfig || undefined}
                />

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleLoiSave} disabled={loiSaving}>
                    {loiSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {loiSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={handleLoiGeneratePDF} disabled={loiGenerating}>
                    {loiGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {loiGenerating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="outline" onClick={handleLoiPreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lease Return Tab Content */}
          <TabsContent value="lease_return" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MailOpen className="h-5 w-5" />
                  Generate Lease Return Letter
                </CardTitle>
                <CardDescription>
                  Create a lease return letter for equipment being returned to the leasing company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <LeaseReturnForm
                  deal={deal}
                  company={company}
                  dealOwner={dealOwner}
                  quoteFormData={formData ? {
                    paymentAmount: formData.paymentAmount,
                    paymentsRemaining: formData.paymentsRemaining,
                    earlyTerminationFee: formData.earlyTerminationFee,
                    returnShipping: formData.returnShipping,
                  } : null}
                  fmvLeaseFormData={fmvLeaseFormData ? {
                    companyLegalName: fmvLeaseFormData.companyLegalName,
                  } : null}
                  portalId={portalId || localStorage.getItem('hs_portal_id') || undefined}
                  onFormChange={handleLeaseReturnFormChange}
                  savedConfig={leaseReturnSavedConfig}
                />

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleLeaseReturnSave} disabled={leaseReturnSaving}>
                    {leaseReturnSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {leaseReturnSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={handleLeaseReturnGeneratePDF} disabled={leaseReturnGenerating}>
                    {leaseReturnGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {leaseReturnGenerating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="outline" onClick={handleLeaseReturnPreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interterritorial Tab Content */}
          <TabsContent value="interterritorial" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Interterritorial Equipment Placement Request
                </CardTitle>
                <CardDescription>
                  Create an interterritorial request for equipment placement by another dealer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InterterritorialForm
                  formData={interterritorialFormData || {
                    requestedInstallDate: null,
                    originatingName: '',
                    originatingBillTo: '',
                    originatingPhone: '',
                    originatingAttn: '',
                    originatingEmail: '',
                    originatingCca: '',
                    installingName: '',
                    installingAddress: '',
                    installingPhone: '',
                    installingAttn: '',
                    installingEmail: '',
                    installingCca: '',
                    installingDealerNumber: '',
                    customerName: '',
                    customerAddress: '',
                    customerPhone: '',
                    customerAttn: '',
                    customerEmail: '',
                    customerFax: '',
                    equipmentItems: [],
                    serviceBaseCharge: '',
                    serviceIncludes: '',
                    serviceOverageBW: '',
                    serviceOverageColor: '',
                    serviceFrequency: 'Monthly',
                    serviceBillTo: 'Originating Dealer',
                    removalEquipment: [],
                  }}
                  onChange={handleInterterritorialFormChange}
                  dealerInfo={dealerInfo}
                  dealerSettings={dealerSettings}
                  dealOwner={dealOwner}
                  lineItems={lineItems}
                  fmvLeaseFormData={fmvLeaseFormData ? {
                    companyLegalName: fmvLeaseFormData.companyLegalName,
                    equipmentAddress: fmvLeaseFormData.equipmentAddress,
                    equipmentCity: fmvLeaseFormData.equipmentCity,
                    equipmentState: fmvLeaseFormData.equipmentState,
                    equipmentZip: fmvLeaseFormData.equipmentZip,
                    phone: fmvLeaseFormData.phone,
                  } : null}
                  serviceAgreementFormData={serviceAgreementFormData ? {
                    rates: serviceAgreementFormData.rates,
                    contractLengthMonths: serviceAgreementFormData.contractLengthMonths,
                    shipToCompany: serviceAgreementFormData.shipToCompany,
                    shipToAddress: serviceAgreementFormData.shipToAddress,
                    shipToCity: serviceAgreementFormData.shipToCity,
                    shipToState: serviceAgreementFormData.shipToState,
                    shipToZip: serviceAgreementFormData.shipToZip,
                    shipToAttn: serviceAgreementFormData.shipToAttn,
                    shipToPhone: serviceAgreementFormData.shipToPhone,
                    shipToEmail: serviceAgreementFormData.shipToEmail,
                  } : null}
                  quoteFormData={formData ? { phone: formData.phone } : null}
                  savedConfig={interterritorialSavedConfig}
                />

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleInterterritorialSave} disabled={interterritorialSaving}>
                    {interterritorialSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {interterritorialSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={handleInterterritorialGeneratePDF} disabled={interterritorialGenerating}>
                    {interterritorialGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {interterritorialGenerating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="outline" onClick={handleInterterritorialPreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* New Customer Tab Content */}
          <TabsContent value="new_customer" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  New Customer Application
                </CardTitle>
                <CardDescription>Create a new customer application form for credit/account setup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <NewCustomerForm
                  formData={newCustomerFormData || { companyName: '', tradeName: '', businessDescription: '', taxId: '', taxIdState: '', yearEstablished: '', yearsOwned: '', creditRequested: '', businessType: '', hqAddress: '', hqAddress2: '', hqCity: '', hqState: '', hqZip: '', hqPhone: '', hqFax: '', hqEmail: '', branchSameAsHq: false, branchAddress: '', branchAddress2: '', branchCity: '', branchState: '', branchZip: '', branchPhone: '', branchFax: '', branchEmail: '', billingSameAsHq: false, billingSameAsBranch: false, billingAddress: '', billingAddress2: '', billingCity: '', billingState: '', billingZip: '', billingPhone: '', billingFax: '', billingEmail: '', principalName: '', principalTitle: '', principalPhone: '', principalEmail: '', equipmentContactName: '', equipmentContactTitle: '', equipmentContactPhone: '', equipmentContactEmail: '', apContactName: '', apContactTitle: '', apContactPhone: '', apContactEmail: '', interestOfficeMachines: false, interestFurniture: false, interestSupplies: false, interestOther: '', bankReferences: [], businessReferences: [], invoiceDelivery: 'email', invoiceEmail: '', invoiceSecondaryEmail: '', paymentMethod: '' }}
                  onChange={handleNewCustomerFormChange}
                  company={company}
                  dealOwner={dealOwner}
                  labeledContacts={labeledContacts || undefined}
                  savedConfig={newCustomerSavedConfig}
                  onClearAll={handleNewCustomerClearAll}
                />
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleNewCustomerSave} disabled={newCustomerSaving}>
                    {newCustomerSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {newCustomerSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={handleNewCustomerGeneratePDF} disabled={newCustomerGenerating}>
                    {newCustomerGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {newCustomerGenerating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="outline" onClick={handleNewCustomerPreview}><Eye className="h-4 w-4 mr-2" />Preview</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relocation Tab Content */}
          <TabsContent value="relocation" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Relocation Request
                </CardTitle>
                <CardDescription>Request equipment relocation to a new location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {relocationFormData && (
                  <RelocationForm
                    formData={relocationFormData}
                    onChange={handleRelocationFormChange}
                  />
                )}
                {!relocationFormData && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleRelocationSave} disabled={relocationSaving}>
                    {relocationSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {relocationSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={handleRelocationGeneratePDF} disabled={relocationGenerating}>
                    {relocationGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {relocationGenerating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="outline" onClick={handleRelocationPreview}><Eye className="h-4 w-4 mr-2" />Preview</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Removal Tab Content */}
          <TabsContent value="equipment_removal" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Equipment Removal
                </CardTitle>
                <CardDescription>Create an equipment removal receipt for equipment being picked up</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RemovalForm
                  company={company}
                  labeledContacts={labeledContacts}
                  dealOwner={dealOwner}
                  lineItems={lineItems}
                  onFormChange={handleRemovalFormChange}
                  savedConfig={removalSavedConfig}
                />
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleRemovalSave} disabled={removalSaving}>
                    {removalSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {removalSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={handleRemovalGeneratePDF} disabled={removalGenerating}>
                    {removalGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {removalGenerating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="outline" onClick={handleRemovalPreview}><Eye className="h-4 w-4 mr-2" />Preview</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commission Tab Content */}
          <TabsContent value="commission" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Commission Worksheet
                </CardTitle>
                <CardDescription>Calculate sales commissions for this deal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CommissionForm
                  deal={deal}
                  company={company}
                  contacts={contacts}
                  lineItems={lineItems}
                  dealOwner={dealOwner}
                  portalId={portalId}
                  onFormChange={handleCommissionFormChange}
                  savedConfig={commissionSavedConfig}
                  quoteConfig={savedConfig}
                  commissionUsers={commissionUsers}
                />
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleCommissionSave} disabled={commissionSaving}>
                    {commissionSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {commissionSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button className="flex-1" onClick={handleCommissionGeneratePDF} disabled={commissionGenerating}>
                    {commissionGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {commissionGenerating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="outline" onClick={handleCommissionPreview}><Eye className="h-4 w-4 mr-2" />Preview</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Document Tabs Content */}
          {customDocuments.map((customDoc) => (
            <TabsContent key={customDoc.code} value={customDoc.code} className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DynamicIcon name={customDoc.icon} className="h-5 w-5" />
                    {customDoc.name}
                  </CardTitle>
                  {customDoc.description && (
                    <CardDescription>{customDoc.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <CustomDocumentForm
                    document={customDoc}
                    formData={customDocFormData[customDoc.id] || {}}
                    onChange={(data) => handleCustomDocFormChange(customDoc.id, data)}
                    company={company}
                    deal={deal}
                    dealOwner={dealOwner}
                    lineItems={lineItems}
                    labeledContacts={labeledContacts}
                    companyContacts={companyContacts || undefined}
                    properties={properties || undefined}
                  />
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => handleCustomDocSave(customDoc.id)} disabled={customDocSaving[customDoc.id]}>
                      {customDocSaving[customDoc.id] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      {customDocSaving[customDoc.id] ? 'Saving...' : 'Save'}
                    </Button>
                    <Button className="flex-1" onClick={() => handleCustomDocGeneratePDF(customDoc.id)} disabled={customDocGenerating[customDoc.id]}>
                      {customDocGenerating[customDoc.id] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                      {customDocGenerating[customDoc.id] ? 'Generating...' : 'Generate PDF'}
                    </Button>
                    <Button variant="outline" onClick={() => handleCustomDocPreview(customDoc.id)}>
                      <Eye className="h-4 w-4 mr-2" />Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Hidden preview for Quote PDF generation */}
      <div className="hidden">
        {formData && (
          <QuotePreview ref={previewRef} formData={formData} dealerInfo={dealerInfo || undefined} documentStyles={dealerSettings.document_styles} formCustomization={dealerSettings.form_customization?.quote} />
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
            documentStyles={dealerSettings.document_styles}
          />
        )}
      </div>

      {/* Quote Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              Quote Preview
              {dealerSettings.proposal_template_url && (
                <Badge variant="secondary" className="text-xs">Proposal will be prepended in PDF</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {formData && (
                <div className="shadow-lg border">
                  <QuotePreview formData={formData} dealerInfo={dealerInfo || undefined} documentStyles={dealerSettings.document_styles} formCustomization={dealerSettings.form_customization?.quote} />
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
                    documentStyles={dealerSettings.document_styles}
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
            documentStyles={dealerSettings.document_styles}
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
                    documentStyles={dealerSettings.document_styles}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden preview for FMV Lease PDF generation */}
      <div className="hidden">
        {fmvLeaseFormData && (
          <FMVLeasePreview
            ref={fmvLeasePreviewRef}
            formData={fmvLeaseFormData}
            dealerInfo={dealerInfo ? {
              company_name: dealerInfo.companyName,
              address_line1: dealerInfo.address,
              phone: dealerInfo.phone,
              website: dealerInfo.website,
              logo_url: dealerInfo.logoUrl,
            } : undefined}
            termsAndConditions={documentTerms.fmv_lease}
          />
        )}
      </div>

      {/* FMV Lease Preview Dialog */}
      <Dialog open={showFMVLeasePreview} onOpenChange={setShowFMVLeasePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>FMV Lease Agreement Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {fmvLeaseFormData && (
                <div className="shadow-lg border">
                  <FMVLeasePreview
                    formData={fmvLeaseFormData}
                    dealerInfo={dealerInfo ? {
                      company_name: dealerInfo.companyName,
                      address_line1: dealerInfo.address,
                      phone: dealerInfo.phone,
                      website: dealerInfo.website,
                      logo_url: dealerInfo.logoUrl,
                    } : undefined}
                    termsAndConditions={documentTerms.fmv_lease}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden preview for Lease Funding PDF generation */}
      <div className="hidden">
        {leaseFundingFormData && (
          <LeaseFundingPreview
            ref={leaseFundingPreviewRef}
            formData={leaseFundingFormData}
            dealerInfo={dealerInfo ? {
              company_name: dealerInfo.companyName,
              address_line1: dealerInfo.address,
              phone: dealerInfo.phone,
              website: dealerInfo.website,
              logo_url: dealerInfo.logoUrl,
            } : undefined}
          />
        )}
      </div>

      {/* Lease Funding Preview Dialog */}
      <Dialog open={showLeaseFundingPreview} onOpenChange={setShowLeaseFundingPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Lease Funding Document Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {leaseFundingFormData && (
                <div className="shadow-lg border">
                  <LeaseFundingPreview
                    formData={leaseFundingFormData}
                    dealerInfo={dealerInfo ? {
                      company_name: dealerInfo.companyName,
                      address_line1: dealerInfo.address,
                      phone: dealerInfo.phone,
                      website: dealerInfo.website,
                      logo_url: dealerInfo.logoUrl,
                    } : undefined}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden preview for LOI PDF generation */}
      <div className="hidden">
        {loiFormData && (
          <LoiPreview
            ref={loiPreviewRef}
            formData={loiFormData}
          />
        )}
      </div>

      {/* LOI Preview Dialog */}
      <Dialog open={showLoiPreview} onOpenChange={setShowLoiPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Letter of Intent Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {loiFormData && (
                <div className="shadow-lg border">
                  <LoiPreview
                    formData={loiFormData}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden preview for Lease Return PDF generation */}
      <div className="hidden">
        {leaseReturnFormData && (
          <LeaseReturnPreview
            ref={leaseReturnPreviewRef}
            formData={leaseReturnFormData}
            dealerInfo={dealerInfo ? {
              company_name: dealerInfo.companyName,
              address_line1: dealerInfo.address,
              phone: dealerInfo.phone,
              website: dealerInfo.website,
              logo_url: dealerInfo.logoUrl,
            } : undefined}
          />
        )}
      </div>

      {/* Lease Return Preview Dialog */}
      <Dialog open={showLeaseReturnPreview} onOpenChange={setShowLeaseReturnPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Lease Return Letter Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {leaseReturnFormData && (
                <div className="shadow-lg border">
                  <LeaseReturnPreview
                    formData={leaseReturnFormData}
                    dealerInfo={dealerInfo ? {
                      company_name: dealerInfo.companyName,
                      address_line1: dealerInfo.address,
                      phone: dealerInfo.phone,
                      website: dealerInfo.website,
                      logo_url: dealerInfo.logoUrl,
                    } : undefined}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden preview for Interterritorial PDF generation */}
      <div className="hidden">
        {interterritorialFormData && (
          <InterterritorialPreview
            ref={interterritorialPreviewRef}
            formData={interterritorialFormData}
            dealerInfo={dealerInfo ? {
              companyName: dealerInfo.companyName,
              address: dealerInfo.address,
              phone: dealerInfo.phone,
              website: dealerInfo.website,
              logoUrl: dealerInfo.logoUrl,
            } : undefined}
            termsAndConditions={documentTerms.interterritorial}
          />
        )}
      </div>

      {/* Interterritorial Preview Dialog */}
      <Dialog open={showInterterritorialPreview} onOpenChange={setShowInterterritorialPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Interterritorial Request Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {interterritorialFormData && (
                <div className="shadow-lg border">
                  <InterterritorialPreview
                    formData={interterritorialFormData}
                    dealerInfo={dealerInfo ? {
                      companyName: dealerInfo.companyName,
                      address: dealerInfo.address,
                      phone: dealerInfo.phone,
                      website: dealerInfo.website,
                      logoUrl: dealerInfo.logoUrl,
                    } : undefined}
                    termsAndConditions={documentTerms.interterritorial}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden preview for New Customer PDF generation */}
      <div className="hidden">
        {newCustomerFormData && (
          <NewCustomerPreview
            ref={newCustomerPreviewRef}
            formData={newCustomerFormData}
            dealerInfo={dealerInfo ? {
              companyName: dealerInfo.companyName,
              address: dealerInfo.address,
              phone: dealerInfo.phone,
              logoUrl: dealerInfo.logoUrl,
            } : undefined}
            termsAndConditions={documentTerms.new_customer}
          />
        )}
      </div>

      {/* New Customer Preview Dialog */}
      <Dialog open={showNewCustomerPreview} onOpenChange={setShowNewCustomerPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>New Customer Application Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {newCustomerFormData && (
                <div className="shadow-lg border">
                  <NewCustomerPreview
                    formData={newCustomerFormData}
                    dealerInfo={dealerInfo ? {
                      companyName: dealerInfo.companyName,
                      address: dealerInfo.address,
                      phone: dealerInfo.phone,
                      logoUrl: dealerInfo.logoUrl,
                    } : undefined}
                    termsAndConditions={documentTerms.new_customer}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden preview for Relocation PDF generation */}
      <div className="hidden">
        {relocationFormData && (
          <RelocationPreview
            ref={relocationPreviewRef}
            formData={relocationFormData}
            dealerInfo={dealerInfo ? {
              name: dealerInfo.companyName,
              address: dealerInfo.address.split(',')[0] || '',
              city: '',
              state: '',
              zip: '',
              phone: dealerInfo.phone,
              website: dealerInfo.website,
              logoUrl: dealerInfo.logoUrl,
            } : undefined}
          />
        )}
      </div>

      {/* Relocation Preview Dialog */}
      <Dialog open={showRelocationPreview} onOpenChange={setShowRelocationPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Relocation Request Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {relocationFormData && (
                <div className="shadow-lg border">
                  <RelocationPreview
                    formData={relocationFormData}
                    dealerInfo={dealerInfo ? {
                      name: dealerInfo.companyName,
                      address: dealerInfo.address.split(',')[0] || '',
                      city: '',
                      state: '',
                      zip: '',
                      phone: dealerInfo.phone,
                      website: dealerInfo.website,
                      logoUrl: dealerInfo.logoUrl,
                    } : undefined}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden preview for Removal PDF generation */}
      <div className="hidden">
        {removalFormData && (
          <RemovalPreview
            ref={removalPreviewRef}
            formData={removalFormData}
            dealerInfo={dealerInfo ? {
              company_name: dealerInfo.companyName,
              address_line1: dealerInfo.address,
              phone: dealerInfo.phone,
              website: dealerInfo.website,
              logo_url: dealerInfo.logoUrl,
            } : undefined}
          />
        )}
      </div>

      {/* Removal Preview Dialog */}
      <Dialog open={showRemovalPreview} onOpenChange={setShowRemovalPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Equipment Removal Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {removalFormData && (
                <div className="shadow-lg border">
                  <RemovalPreview
                    formData={removalFormData}
                    dealerInfo={dealerInfo ? {
                      company_name: dealerInfo.companyName,
                      address_line1: dealerInfo.address,
                      phone: dealerInfo.phone,
                      website: dealerInfo.website,
                      logo_url: dealerInfo.logoUrl,
                    } : undefined}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden preview for Commission PDF generation */}
      <div className="hidden">
        {commissionFormData && (
          <CommissionPreview
            ref={commissionPreviewRef}
            formData={commissionFormData}
            dealerInfo={dealerInfo ? {
              companyName: dealerInfo.companyName,
              address: dealerInfo.address,
              phone: dealerInfo.phone,
              website: dealerInfo.website,
              logoUrl: dealerInfo.logoUrl,
            } : undefined}
          />
        )}
      </div>

      {/* Commission Preview Dialog */}
      <Dialog open={showCommissionPreview} onOpenChange={setShowCommissionPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Commission Worksheet Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 flex justify-center">
              {commissionFormData && (
                <div className="shadow-lg border">
                  <CommissionPreview
                    formData={commissionFormData}
                    dealerInfo={dealerInfo ? {
                      companyName: dealerInfo.companyName,
                      address: dealerInfo.address,
                      phone: dealerInfo.phone,
                      website: dealerInfo.website,
                      logoUrl: dealerInfo.logoUrl,
                    } : undefined}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Custom Document TabsContent, Previews and Dialogs */}
      {customDocuments.map((customDoc) => (
        <div key={customDoc.id}>
          {/* Hidden preview for PDF generation */}
          <div className="hidden">
            <CustomDocumentPreview
              ref={(el) => { customDocPreviewRefs.current[customDoc.id] = el; }}
              document={customDoc}
              formData={customDocFormData[customDoc.id] || {}}
              dealerInfo={dealerInfo ? {
                companyName: dealerInfo.companyName,
                address: dealerInfo.address,
                phone: dealerInfo.phone,
                website: dealerInfo.website,
                logoUrl: dealerInfo.logoUrl,
              } : undefined}
            />
          </div>

          {/* Preview Dialog */}
          <Dialog 
            open={showCustomDocPreview[customDoc.id] || false} 
            onOpenChange={(open) => setShowCustomDocPreview(prev => ({ ...prev, [customDoc.id]: open }))}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] p-0">
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>{customDoc.name} Preview</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-80px)]">
                <div className="p-4 flex justify-center">
                  <div className="shadow-lg border">
                    <CustomDocumentPreview
                      document={customDoc}
                      formData={customDocFormData[customDoc.id] || {}}
                      dealerInfo={dealerInfo ? {
                        companyName: dealerInfo.companyName,
                        address: dealerInfo.address,
                        phone: dealerInfo.phone,
                        website: dealerInfo.website,
                        logoUrl: dealerInfo.logoUrl,
                      } : undefined}
                    />
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      ))}
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
