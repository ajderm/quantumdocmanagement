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
import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  rateSheets: number;
}

// Demo data
const demoPartners: LeasingPartner[] = [
  { id: '1', name: 'GreatAmerica Financial Services', contact_name: 'Mike Johnson', contact_email: 'mike@greatamerica.com', contact_phone: '(800) 234-5678', is_active: true, rateSheets: 2 },
  { id: '2', name: 'Wells Fargo Equipment Finance', contact_name: 'Sarah Williams', contact_email: 'swilliams@wellsfargo.com', contact_phone: '(800) 345-6789', is_active: true, rateSheets: 1 },
  { id: '3', name: 'US Bank Equipment Finance', contact_name: null, contact_email: null, contact_phone: null, is_active: true, rateSheets: 0 },
];

export default function LeasingPartners() {
  const [partners, setPartners] = useState<LeasingPartner[]>(demoPartners);
  
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

  const handleAddPartner = async () => {
    if (!partnerForm.name.trim()) return;

    setAddingPartner(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const newPartner: LeasingPartner = {
      id: Date.now().toString(),
      name: partnerForm.name,
      contact_name: partnerForm.contact_name || null,
      contact_email: partnerForm.contact_email || null,
      contact_phone: partnerForm.contact_phone || null,
      is_active: true,
      rateSheets: 0,
    };

    setPartners(prev => [...prev, newPartner].sort((a, b) => a.name.localeCompare(b.name)));
    setAddPartnerOpen(false);
    setPartnerForm({ name: '', contact_name: '', contact_email: '', contact_phone: '' });
    setAddingPartner(false);
  };

  const handleDeletePartner = (partner: LeasingPartner) => {
    setPartners(prev => prev.filter(p => p.id !== partner.id));
  };

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
          <Link to="/admin">
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
              <Button>
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
                    <span>
                      {partner.rateSheets === 0 
                        ? 'No rate sheets uploaded' 
                        : `${partner.rateSheets} rate sheet${partner.rateSheets > 1 ? 's' : ''}`
                      }
                    </span>
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