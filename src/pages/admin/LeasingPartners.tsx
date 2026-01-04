import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  CreditCard, 
  Plus, 
  Upload, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  FileSpreadsheet,
  Loader2,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LeasingPartner {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  dealer_account_id: string;
}

export default function LeasingPartners() {
  const [searchParams] = useSearchParams();
  const portalId = searchParams.get('portalId') || localStorage.getItem('hs_portal_id');
  
  const [partners, setPartners] = useState<LeasingPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dealerAccountId, setDealerAccountId] = useState<string | null>(null);
  
  // Dialog states
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [addingPartner, setAddingPartner] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<LeasingPartner | null>(null);
  const [uploadRatesOpen, setUploadRatesOpen] = useState(false);

  // Form state
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });

  // Fetch dealer account and partners on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!portalId) {
        setLoading(false);
        return;
      }

      try {
        // Get dealer account
        const { data: dealerData, error: dealerError } = await supabase.functions.invoke('dealer-account-get', {
          body: { portalId }
        });

        if (dealerError || !dealerData?.dealer?.id) {
          console.error('Failed to get dealer account:', dealerError);
          setLoading(false);
          return;
        }

        const accountId = dealerData.dealer.id;
        setDealerAccountId(accountId);

        // Fetch partners
        const { data: partnersData, error: partnersError } = await supabase
          .from('leasing_partners')
          .select('*')
          .eq('dealer_account_id', accountId)
          .eq('is_active', true)
          .order('name');

        if (partnersError) {
          console.error('Failed to fetch partners:', partnersError);
        } else {
          setPartners(partnersData || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [portalId]);

  const handleAddPartner = async () => {
    if (!partnerForm.name.trim() || !dealerAccountId) return;

    setAddingPartner(true);
    try {
      const { data, error } = await supabase
        .from('leasing_partners')
        .insert({
          name: partnerForm.name.trim(),
          contact_name: partnerForm.contact_name.trim() || null,
          contact_email: partnerForm.contact_email.trim() || null,
          contact_phone: partnerForm.contact_phone.trim() || null,
          dealer_account_id: dealerAccountId,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to add partner:', error);
        toast.error('Failed to add partner');
        return;
      }

      setPartners(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setAddPartnerOpen(false);
      setPartnerForm({ name: '', contact_name: '', contact_email: '', contact_phone: '' });
      toast.success('Partner added successfully');
    } catch (err) {
      console.error('Error adding partner:', err);
      toast.error('Failed to add partner');
    } finally {
      setAddingPartner(false);
    }
  };

  const handleDeletePartner = async (partner: LeasingPartner) => {
    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('leasing_partners')
        .update({ is_active: false })
        .eq('id', partner.id);

      if (error) {
        console.error('Failed to delete partner:', error);
        toast.error('Failed to delete partner');
        return;
      }

      setPartners(prev => prev.filter(p => p.id !== partner.id));
      toast.success('Partner deleted');
    } catch (err) {
      console.error('Error deleting partner:', err);
      toast.error('Failed to delete partner');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="flex items-center h-14 px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">DocGen Admin</h1>
              <span className="text-xs text-muted-foreground">Leasing Partners</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Back link */}
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link to={`/admin${portalId ? `?portalId=${portalId}` : ''}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Link>
        </Button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leasing Partners</h1>
            <p className="text-muted-foreground mt-1">
              Manage financing partners and their rate sheets
            </p>
          </div>
          <Dialog open={addPartnerOpen} onOpenChange={setAddPartnerOpen}>
            <DialogTrigger asChild>
              <Button disabled={!dealerAccountId}>
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Leasing Partner</DialogTitle>
                <DialogDescription>
                  Add a new financing company to use in your quotes
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="partner-name">Company Name *</Label>
                  <Input
                    id="partner-name"
                    value={partnerForm.name}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Wells Fargo Equipment Finance"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Contact Name</Label>
                  <Input
                    id="contact-name"
                    value={partnerForm.contact_name}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, contact_name: e.target.value }))}
                    placeholder="John Smith"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={partnerForm.contact_email}
                      onChange={(e) => setPartnerForm(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="john@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Phone</Label>
                    <Input
                      id="contact-phone"
                      value={partnerForm.contact_phone}
                      onChange={(e) => setPartnerForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="(555) 555-5555"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddPartnerOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPartner} disabled={!partnerForm.name.trim() || addingPartner}>
                  {addingPartner ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Partner'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Partners list */}
        {partners.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Leasing Partners</h3>
              <p className="text-muted-foreground mb-4">
                Add your first leasing partner to get started
              </p>
              <Button onClick={() => setAddPartnerOpen(true)} disabled={!dealerAccountId}>
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {partners.map((partner) => (
              <Card key={partner.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{partner.name}</CardTitle>
                        {partner.contact_name && (
                          <CardDescription>
                            {partner.contact_name}
                            {partner.contact_email && ` • ${partner.contact_email}`}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={partner.is_active ? 'default' : 'secondary'}>
                        {partner.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Partner
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeletePartner(partner)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Partner
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Separator className="mb-4" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>No rate sheets uploaded</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedPartner(partner);
                        setUploadRatesOpen(true);
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Rate Sheet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Rate Sheet Dialog */}
        <Dialog open={uploadRatesOpen} onOpenChange={setUploadRatesOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Rate Sheet</DialogTitle>
              <DialogDescription>
                Upload a CSV or Excel file with lease rates for {selectedPartner?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your rate sheet here, or click to browse
                </p>
                <Button variant="outline">
                  Choose File
                </Button>
              </div>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Expected columns:</h4>
                <code className="text-xs text-muted-foreground">
                  term_months, min_amount, max_amount, rate_factor, lease_type
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Example: 36, 0, 25000, 0.0325, FMV
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadRatesOpen(false)}>
                Cancel
              </Button>
              <Button disabled>
                Upload & Parse
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
