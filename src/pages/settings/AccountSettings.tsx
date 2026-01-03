import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Building2, Upload, Save, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface DealerAccount {
  id: string;
  company_name: string;
  logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  terms_and_conditions: string | null;
}

export default function AccountSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<DealerAccount | null>(null);
  
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

  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async () => {
    try {
      // First get the user's profile to find their dealer account
      const { data: profile } = await supabase
        .from('profiles')
        .select('dealer_account_id')
        .eq('id', user?.id)
        .single();

      if (profile?.dealer_account_id) {
        const { data: dealerAccount } = await supabase
          .from('dealer_accounts')
          .select('*')
          .eq('id', profile.dealer_account_id)
          .single();

        if (dealerAccount) {
          setAccount(dealerAccount);
          setFormData({
            company_name: dealerAccount.company_name || '',
            address_line1: dealerAccount.address_line1 || '',
            address_line2: dealerAccount.address_line2 || '',
            city: dealerAccount.city || '',
            state: dealerAccount.state || '',
            zip_code: dealerAccount.zip_code || '',
            phone: dealerAccount.phone || '',
            website: dealerAccount.website || '',
            email: dealerAccount.email || '',
            terms_and_conditions: dealerAccount.terms_and_conditions || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching account:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!account) {
      toast({
        variant: 'destructive',
        title: 'No account found',
        description: 'Please contact support to set up your dealer account.',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('dealer_accounts')
        .update(formData)
        .eq('id', account.id);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your account settings have been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error saving settings',
        description: 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Account Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your company branding and document defaults
          </p>
        </div>

        {!account ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-foreground mb-2">No Dealer Account</h3>
              <p className="text-muted-foreground text-sm">
                Your user account is not linked to a dealer account yet.
                <br />
                Contact your administrator to get set up.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
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
                    <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
                      {account.logo_url ? (
                        <img 
                          src={account.logo_url} 
                          alt="Company logo" 
                          className="h-full w-full object-contain rounded-lg"
                        />
                      ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 2MB. Recommended: 200x200px
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

            {/* Terms & Conditions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Default Terms & Conditions</CardTitle>
                <CardDescription>
                  Standard terms that appear on quotes and agreements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.terms_and_conditions}
                  onChange={(e) => handleInputChange('terms_and_conditions', e.target.value)}
                  placeholder="Enter your standard terms and conditions..."
                  className="min-h-[200px]"
                />
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
        )}
      </div>
    </AppLayout>
  );
}