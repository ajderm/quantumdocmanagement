import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LabeledContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface LabeledContacts {
  shippingContact: LabeledContact | null;
  apContact: LabeledContact | null;
  itContact: LabeledContact | null;
}

// Company contacts keyed by association label
type CompanyContacts = Record<string, LabeledContact>;

interface RawProperties {
  company: Record<string, any>;
  deal: Record<string, any>;
  owner: Record<string, any>;
}

type HubSpotContextType = {
  portalId: string | null;
  userId: string | null;
  deal: any;
  company: any;
  contacts: any[];
  lineItems: any[];
  dealOwner: any;
  labeledContacts: LabeledContacts | null;
  companyContacts: CompanyContacts | null;
  properties: RawProperties | null;
  loading: boolean;
  isEmbedded: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const STORAGE_KEYS = {
  portalId: "hs_portal_id",
  userId: "hs_user_id",
};

function readHubSpotParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const portalId = urlParams.get("portalId") || urlParams.get("portal_id");
  const userId = urlParams.get("userId") || urlParams.get("user_id");
  const dealId = urlParams.get("dealId") || urlParams.get("recordId") || urlParams.get("objectId");

  return { portalId, userId, dealId };
}

const HubSpotContext = createContext<HubSpotContextType | undefined>(undefined);

export function HubSpotProvider({ children }: { children: ReactNode }) {
  const [portalId, setPortalId] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEYS.portalId) : null
  );
  const [userId, setUserId] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEYS.userId) : null
  );

  const [deal, setDeal] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [dealOwner, setDealOwner] = useState<any>(null);
  const [labeledContacts, setLabeledContacts] = useState<LabeledContacts | null>(null);
  const [companyContacts, setCompanyContacts] = useState<CompanyContacts | null>(null);
  const [properties, setProperties] = useState<RawProperties | null>(null);

  const [loading, setLoading] = useState(true);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    const { portalId: portalIdFromUrl, userId: userIdFromUrl, dealId } = readHubSpotParams();

    // Persist portal/user for later (e.g. settings tab opened without params)
    if (portalIdFromUrl) {
      // If portal changed, clear stale data from previous portal
      const previousPortalId = window.localStorage.getItem(STORAGE_KEYS.portalId);
      if (previousPortalId && previousPortalId !== portalIdFromUrl) {
        // Clear all portal-scoped backup keys from the old portal
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.includes(`_${previousPortalId}_`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => window.localStorage.removeItem(key));
        console.log(`Portal changed from ${previousPortalId} to ${portalIdFromUrl}, cleared ${keysToRemove.length} stale backup keys`);

        // Reset all React state to prevent cross-portal data leakage
        setDeal(null);
        setCompany(null);
        setContacts([]);
        setLineItems([]);
        setDealOwner(null);
        setLabeledContacts(null);
        setCompanyContacts(null);
        setProperties(null);
        setError(null);
      }
      window.localStorage.setItem(STORAGE_KEYS.portalId, portalIdFromUrl);
    }
    if (userIdFromUrl) window.localStorage.setItem(STORAGE_KEYS.userId, userIdFromUrl);

    const effectivePortalId = portalIdFromUrl || window.localStorage.getItem(STORAGE_KEYS.portalId);
    const effectiveUserId = userIdFromUrl || window.localStorage.getItem(STORAGE_KEYS.userId);

    setPortalId(effectivePortalId);
    setUserId(effectiveUserId);

    console.log(
      "useHubSpot: URL params - portalId:",
      portalIdFromUrl,
      "dealId:",
      dealId,
      "full search:",
      window.location.search
    );

    // Only fetch deal data when we have a dealId (portalId can come from URL or storage)
    if (effectivePortalId && dealId) {
      setIsEmbedded(true);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke("hubspot-get-deal", {
          body: { portalId: effectivePortalId, dealId },
        });

        if (invokeError) throw invokeError;

        if (data?.deal) setDeal(data.deal);
        if (data?.company) setCompany(data.company);
        if (data?.contacts) setContacts(data.contacts);
        if (data?.lineItems) setLineItems(data.lineItems);
        if (data?.dealOwner) setDealOwner(data.dealOwner);
        if (data?.labeledContacts) setLabeledContacts(data.labeledContacts);
        if (data?.companyContacts) setCompanyContacts(data.companyContacts);
        if (data?.properties) setProperties(data.properties);

        setError(null);
      } catch (err: unknown) {
        console.error("Error fetching HubSpot data:", err);
        setError(err instanceof Error ? err.message : "Failed to load deal data");
      }
    } else {
      setIsEmbedded(Boolean(dealId));
      console.log("useHubSpot: Missing portalId or dealId, not fetching data");
      if (!effectivePortalId) console.log("Missing portalId - add ?portalId=YOUR_PORTAL_ID to URL");
      if (!dealId) console.log("Missing dealId - add &dealId=DEAL_ID or &recordId=DEAL_ID to URL");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        labeledContacts,
        companyContacts,
        properties,
        loading,
        isEmbedded,
        error,
        refetch: fetchData,
      }}
    >
      {children}
    </HubSpotContext.Provider>
  );
}

export function useHubSpot() {
  const context = useContext(HubSpotContext);
  if (context === undefined) throw new Error("useHubSpot must be used within a HubSpotProvider");
  return context;
}
