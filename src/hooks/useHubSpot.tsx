import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

interface HubSpotDealOwner {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface HubSpotContextType {
  portalId: string | null;
  userId: string | null;
  deal: HubSpotDeal | null;
  company: HubSpotCompany | null;
  contacts: HubSpotContact[];
  lineItems: HubSpotLineItem[];
  dealOwner: HubSpotDealOwner | null;
  loading: boolean;
  isEmbedded: boolean;
  error: string | null;
}

const HubSpotContext = createContext<HubSpotContextType | undefined>(undefined);

export function HubSpotProvider({ children }: { children: ReactNode }) {
  const [portalId, setPortalId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [deal, setDeal] = useState<HubSpotDeal | null>(null);
  const [company, setCompany] = useState<HubSpotCompany | null>(null);
  const [contacts, setContacts] = useState<HubSpotContact[]>([]);
  const [lineItems, setLineItems] = useState<HubSpotLineItem[]>([]);
  const [dealOwner, setDealOwner] = useState<HubSpotDealOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hubspotPortalId = urlParams.get('portalId');
      const hubspotUserId = urlParams.get('userId');
      const hubspotDealId = urlParams.get('dealId');

      if (hubspotPortalId && hubspotDealId) {
        setIsEmbedded(true);
        setPortalId(hubspotPortalId);
        setUserId(hubspotUserId);

        try {
          const { data, error: fnError } = await supabase.functions.invoke('hubspot-get-deal', {
            body: null,
            headers: {},
          });

          // Use query params approach by calling the function URL directly
          const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hubspot-get-deal?portalId=${hubspotPortalId}&dealId=${hubspotDealId}`;
          
          const response = await fetch(functionUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch deal data');
          }

          const dealData = await response.json();

          if (dealData.deal) {
            setDeal(dealData.deal);
          }
          if (dealData.company) {
            setCompany(dealData.company);
          }
          if (dealData.contacts) {
            setContacts(dealData.contacts);
          }
          if (dealData.lineItems) {
            setLineItems(dealData.lineItems);
          }
          if (dealData.dealOwner) {
            setDealOwner(dealData.dealOwner);
          }
        } catch (err) {
          console.error('Error fetching HubSpot data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load deal data');
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <HubSpotContext.Provider
      value={{
        portalId,
        userId,
        deal,
        company,
        contacts,
        lineItems,
        dealOwner,
        loading,
        isEmbedded,
        error,
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
