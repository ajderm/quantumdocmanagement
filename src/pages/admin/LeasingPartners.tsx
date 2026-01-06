import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileSpreadsheet,
  Loader2,
  ArrowLeft,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  ExternalLink,
  Cog
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RateSheet {
  id: string;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
}

interface RateFactorData {
  rateSheet: RateSheet | null;
  leasingCompanies: string[];
  availableTerms: number[];
}

export default function LeasingPartners() {
  const [searchParams] = useSearchParams();
  const portalId = searchParams.get('portalId') || localStorage.getItem('hs_portal_id');
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [rateData, setRateData] = useState<RateFactorData>({
    rateSheet: null,
    leasingCompanies: [],
    availableTerms: []
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch rate sheet data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!portalId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-rate-factors', {
          body: { portalId }
        });

        if (error) {
          console.error('Failed to fetch rate data:', error);
        } else if (data) {
          setRateData({
            rateSheet: data.rateSheet,
            leasingCompanies: data.leasingCompanies || [],
            availableTerms: data.availableTerms || []
          });
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [portalId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !portalId) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('portalId', portalId);

      const { data, error } = await supabase.functions.invoke('upload-rate-sheet', {
        body: formData
      });

      if (error) {
        console.error('Upload failed:', error);
        toast.error('Failed to upload rate sheet');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        if (data.details) {
          console.error('Upload details:', data.details);
        }
        return;
      }

      // Update state with new data
      setRateData({
        rateSheet: {
          id: data.rateSheetId,
          fileName: data.fileName,
          uploadedAt: new Date().toISOString(),
          rowCount: data.rowCount
        },
        leasingCompanies: data.leasingCompanies || [],
        availableTerms: data.availableTerms || []
      });

      toast.success(`Successfully imported ${data.rowCount} rates from ${data.leasingCompanies?.length || 0} companies`);
      
      if (data.warnings?.length > 0) {
        toast.warning(`${data.warnings.length} rows had warnings`);
      }
    } catch (err) {
      console.error('Error uploading:', err);
      toast.error('Failed to upload rate sheet');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
              <h1 className="text-sm font-semibold">Document Settings</h1>
              <span className="text-xs text-muted-foreground">Leasing Rate Sheet</span>
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Leasing Rate Sheet</h1>
          <p className="text-muted-foreground mt-1">
            Upload your rate sheet to configure leasing companies and rate factors
          </p>
        </div>

        {/* Document Processor Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog className="h-5 w-5" />
              Rate Sheet Processor
            </CardTitle>
            <CardDescription>
              Use Quantum's Document Processor to convert multiple leasing companies' rate files into a single CSV ready for upload
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => window.open('https://qbsdocumentprocessor.lovable.app/', '_blank')}
            >
              <span className="flex items-center gap-2">
                <Cog className="h-4 w-4" />
                Open Quantum Document Processor
              </span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Rate Sheet Upload
            </CardTitle>
            <CardDescription>
              Upload a CSV file with your leasing companies and rate factors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-10 w-10 mx-auto text-primary mb-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Processing your rate sheet...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Click to upload or drag and drop your CSV file
                  </p>
                  <Button variant="outline" disabled={uploading}>
                    Choose File
                  </Button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            
            {/* Expected format */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Expected CSV columns:</h4>
              <code className="text-xs text-muted-foreground block">
                leasing_company, lease_program, min_amount, max_amount, term_months, rate_factor
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Example: Canon Financial Services, FMV, 0, 24999, 36, 0.03391
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Rate Sheet Status */}
        {rateData.rateSheet ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Active Rate Sheet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{rateData.rateSheet.fileName}</p>
                    <p className="text-xs text-muted-foreground">File name</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{formatDate(rateData.rateSheet.uploadedAt)}</p>
                    <p className="text-xs text-muted-foreground">Uploaded</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{rateData.rateSheet.rowCount.toLocaleString()} rates</p>
                    <p className="text-xs text-muted-foreground">Imported</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No rate sheet uploaded yet. Upload a CSV file to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Detected Leasing Companies */}
        {rateData.leasingCompanies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Detected Leasing Companies
              </CardTitle>
              <CardDescription>
                These companies were found in your rate sheet and are now available for quotes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rateData.leasingCompanies.map((company) => (
                  <div key={company} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{company}</span>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                ))}
              </div>
              
              {rateData.availableTerms.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-medium mb-2">Available Terms</p>
                    <div className="flex flex-wrap gap-2">
                      {rateData.availableTerms.map((term) => (
                        <Badge key={term} variant="outline">
                          {term} months
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
