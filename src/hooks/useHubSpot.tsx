import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface HubSpotDeal {
  dealId: string;
  dealName: string;
  amount: number | null;
  stage: string | null;
  closeDate: string | null;
}

interface HubSpotCompany {
  companyId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
}

interface HubSpotContact {
  contactId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
}

interface HubSpotLineItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  sku: string | null;
  category: string | null;
}

interface HubSpotContextType {
  portalId: string | null;
  userId: string | null;
  deal: HubSpotDeal | null;
  company: HubSpotCompany | null;
  contacts: HubSpotContact[];
  lineItems: HubSpotLineItem[];
  loading: boolean;
  isEmbedded: boolean;
  // For demo/development mode
  setDemoData: (data: Partial<HubSpotContextType>) => void;
}

const HubSpotContext = createContext<HubSpotContextType | undefined>(undefined);

export function HubSpotProvider({ children }: { children: ReactNode }) {
  const [portalId, setPortalId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [deal, setDeal] = useState<HubSpotDeal | null>(null);
  const [company, setCompany] = useState<HubSpotCompany | null>(null);
  const [contacts, setContacts] = useState<HubSpotContact[]>([]);
  const [lineItems, setLineItems] = useState<HubSpotLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // Check if running inside HubSpot iframe
    const urlParams = new URLSearchParams(window.location.search);
    const hubspotPortalId = urlParams.get('portalId');
    const hubspotUserId = urlParams.get('userId');
    const hubspotDealId = urlParams.get('dealId');

    if (hubspotPortalId) {
      setIsEmbedded(true);
      setPortalId(hubspotPortalId);
      setUserId(hubspotUserId);

      // In production, we'd fetch deal data from HubSpot API via edge function
      // For now, we'll use demo data or wait for HubSpot SDK integration
      if (hubspotDealId) {
        // Placeholder: would call edge function to fetch deal data
        console.log('Would fetch deal:', hubspotDealId);
      }
    } else {
      // Development mode - load demo data
      loadDemoData();
    }

    setLoading(false);
  }, []);

  const loadDemoData = () => {
    // Demo data for development/preview
    setDeal({
      dealId: 'demo-123',
      dealName: 'West Texas Medical Center - Canon C5850i',
      amount: 15000,
      stage: 'Contract Sent',
      closeDate: '2025-02-15',
    });

    setCompany({
      companyId: 'company-456',
      name: 'West Texas Medical Center',
      address: '415 N Avenue F',
      city: 'Denver City',
      state: 'TX',
      zip: '79323',
      phone: '(806) 592-1234',
    });

    setContacts([
      {
        contactId: 'contact-1',
        firstName: 'Collin',
        lastName: 'McLarty',
        email: 'collin@wtmc.org',
        phone: '(806) 592-1234',
        title: 'Business Office Manager',
      },
      {
        contactId: 'contact-2',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@wtmc.org',
        phone: '(806) 592-1235',
        title: 'IT Director',
      },
    ]);

    setLineItems([
      {
        id: 'item-1',
        name: 'Canon imageRUNNER ADVANCE DX C5850i',
        description: 'Main Unit - Color MFP',
        quantity: 1,
        price: 12500,
        sku: 'CAN-C5850I',
        category: 'Hardware',
      },
      {
        id: 'item-2',
        name: 'Cassette Feeding Unit-AM1',
        description: '550-sheet Paper Cassette',
        quantity: 2,
        price: 450,
        sku: 'CAN-CFU-AM1',
        category: 'Hardware',
      },
      {
        id: 'item-3',
        name: 'Staple Finisher-AC1',
        description: '50-sheet Stapler',
        quantity: 1,
        price: 850,
        sku: 'CAN-SF-AC1',
        category: 'Hardware',
      },
      {
        id: 'item-4',
        name: '2/3 Hole Puncher Unit',
        description: 'Hole Punch Accessory',
        quantity: 1,
        price: 350,
        sku: 'CAN-HP-23',
        category: 'Hardware',
      },
      {
        id: 'item-5',
        name: 'Super G3 Fax Board-AT1',
        description: 'Fax Capability',
        quantity: 1,
        price: 400,
        sku: 'CAN-FAX-AT1',
        category: 'Hardware',
      },
    ]);
  };

  const setDemoData = (data: Partial<HubSpotContextType>) => {
    if (data.deal !== undefined) setDeal(data.deal);
    if (data.company !== undefined) setCompany(data.company);
    if (data.contacts !== undefined) setContacts(data.contacts);
    if (data.lineItems !== undefined) setLineItems(data.lineItems);
  };

  return (
    <HubSpotContext.Provider
      value={{
        portalId,
        userId,
        deal,
        company,
        contacts,
        lineItems,
        loading,
        isEmbedded,
        setDemoData,
      }}
    >
      {children}
    </HubSpotContext.Provider>
  );
}

export function useHubSpot() {
  const context = useContext(HubSpotContext);
  if (context === undefined) {
    throw new Error('useHubSpot must be used within a HubSpotProvider');
  }
  return context;
}