import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Plus,
  ArrowRight
} from 'lucide-react';

const documentTypes = [
  { code: 'quote', name: 'Quote', description: 'Sales quotes with pricing & lease options', icon: FileText, color: 'bg-blue-500' },
  { code: 'installation', name: 'Installation Report', description: 'Delivery & acceptance documentation', icon: ClipboardList, color: 'bg-green-500' },
  { code: 'service_agreement', name: 'Service Agreement', description: 'Maintenance contracts', icon: FileCheck, color: 'bg-purple-500' },
  { code: 'fmv_lease', name: 'FMV Lease', description: 'Fair Market Value lease agreements', icon: FileSpreadsheet, color: 'bg-indigo-500' },
  { code: 'lease_funding', name: 'Lease Funding', description: 'Invoice/funding documents', icon: Receipt, color: 'bg-amber-500' },
  { code: 'lease_return', name: 'Lease Return Letter', description: 'Equipment return authorization', icon: MailOpen, color: 'bg-rose-500' },
  { code: 'interterritorial', name: 'Interterritorial Request', description: 'Cross-territory placements', icon: MapPin, color: 'bg-cyan-500' },
  { code: 'new_customer', name: 'New Customer App', description: 'Customer credit applications', icon: UserPlus, color: 'bg-emerald-500' },
  { code: 'relocation', name: 'Relocation Request', description: 'Equipment relocation forms', icon: Truck, color: 'bg-orange-500' },
  { code: 'equipment_removal', name: 'Equipment Removal', description: 'Pickup/removal forms', icon: Trash2, color: 'bg-red-500' },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Document Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a document type to generate from your HubSpot deal data
          </p>
        </div>

        {/* Info banner */}
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">HubSpot Integration</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When launched from a HubSpot deal, documents will auto-populate with deal, company, contact, and line item data. 
                  You can override any field before generating.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document type grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {documentTypes.map((doc) => {
            const Icon = doc.icon;
            return (
              <Card 
                key={doc.code} 
                className="group hover:shadow-medium transition-all duration-200 cursor-pointer hover:border-primary/30"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`h-10 w-10 rounded-lg ${doc.color} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Template
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
                    {doc.name}
                  </CardTitle>
                  <CardDescription>{doc.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button variant="ghost" className="w-full justify-between group-hover:bg-secondary">
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create New
                    </span>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent documents section placeholder */}
        <div className="mt-12">
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">
            Recent Documents
          </h2>
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No documents generated yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Documents you create will appear here
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}