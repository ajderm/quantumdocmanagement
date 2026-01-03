import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface HubSpotContextType { portalId: string | null; userId: string | null; deal: any; company: any; contacts: any[]; lineItems: any[]; dealOwner: any; loading: boolean; isEmbedded: boolean; error: string | null; refetch: () => Promise<void>; }

const HubSpotContext = createContext<HubSpotContextType | undefined>(undefined);

export function HubSpotProvider({ children }: { children: ReactNode }) {
  const [portalId, setPortalId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [deal, setDeal] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [dealOwner, setDealOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        console.log('Fetching HubSpot data for portal:', hubspotPortalId, 'deal:', hubspotDealId);
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hubspot-get-deal?portalId=${encodeURIComponent(hubspotPortalId)}&dealId=${encodeURIComponent(hubspotDealId)}`;
        const response = await fetch(functionUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || 'Failed to fetch deal data'); }
        const dealData = await response.json();
        console.log('Deal data received:', dealData);
        if (dealData.deal) setDeal(dealData.deal);
        if (dealData.company) setCompany(dealData.company);
        if (dealData.contacts) setContacts(dealData.contacts);
        if (dealData.lineItems) setLineItems(dealData.lineItems);
        if (dealData.dealOwner) setDealOwner(dealData.dealOwner);
        setError(null);
      } catch (err) { console.error('Error fetching HubSpot data:', err); setError(err instanceof Error ? err.message : 'Failed to load deal data'); }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return <HubSpotContext.Provider value={{ portalId, userId, deal, company, contacts, lineItems, dealOwner, loading, isEmbedded, error, refetch: fetchData }}>{children}</HubSpotContext.Provider>;
}

export function useHubSpot() { const context = useContext(HubSpotContext); if (context === undefined) throw new Error('useHubSpot must be used within a HubSpotProvider'); return context; }