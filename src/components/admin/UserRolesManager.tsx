import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Shield, RefreshCw, AlertCircle, ShieldCheck, Eye, Edit, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserRole {
  id?: string;
  hubspot_user_id: string;
  hubspot_user_name: string;
  hubspot_user_email: string;
  role: string;
}

interface AccessRule {
  id?: string;
  pipeline_id: string;
  pipeline_label: string;
  cutoff_stage: string;
  cutoff_stage_label: string;
  pre_cutoff_min_role: string;
  post_cutoff_min_role: string;
}

interface HubSpotOwner {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Pipeline {
  id: string;
  label: string;
  stages: { id: string; label: string; displayOrder: number; }[];
}

interface UserRolesManagerProps {
  portalId: string;
  dealerAccountId: string;
  hubspotToken?: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', icon: ShieldCheck, desc: 'Full access at any stage, can manage settings' },
  { value: 'manager', label: 'Manager', icon: Shield, desc: 'Full access at any stage' },
  { value: 'user', label: 'User', icon: Edit, desc: 'Can edit and generate, subject to stage restrictions' },
  { value: 'viewer', label: 'Viewer', icon: Eye, desc: 'View-only, no editing or downloads until cutoff' },
];

const roleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'user': return 'bg-green-100 text-green-700 border-green-200';
    case 'viewer': return 'bg-gray-100 text-gray-600 border-gray-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

export function UserRolesManager({ portalId, dealerAccountId, hubspotToken }: UserRolesManagerProps) {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [accessRules, setAccessRules] = useState<AccessRule[]>([]);
  const [hubspotOwners, setHubspotOwners] = useState<HubSpotOwner[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing roles and rules from Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load user roles
      const { data: roles } = await supabase
        .from('app_user_roles')
        .select('*')
        .eq('dealer_account_id', dealerAccountId)
        .order('hubspot_user_name');
      if (roles) setUserRoles(roles);

      // Load access rules
      const { data: rules } = await supabase
        .from('access_rules')
        .select('*')
        .eq('dealer_account_id', dealerAccountId);
      if (rules) setAccessRules(rules);
    } catch (err) {
      console.error('Error loading roles:', err);
    } finally {
      setLoading(false);
    }
  }, [dealerAccountId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Sync HubSpot users into the roles table
  const syncHubSpotUsers = async () => {
    if (!hubspotToken) { toast.error('No HubSpot token available'); return; }
    setSyncing(true);
    try {
      // Fetch owners from HubSpot
      const response = await fetch('https://api.hubapi.com/crm/v3/owners?limit=500', {
        headers: { 'Authorization': `Bearer ${hubspotToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch HubSpot users');
      const data = await response.json();
      const owners: HubSpotOwner[] = (data.results || []).map((o: any) => ({
        id: o.id,
        userId: String(o.userId || o.id),
        email: o.email || '',
        firstName: o.firstName || '',
        lastName: o.lastName || '',
      }));
      setHubspotOwners(owners);

      // Upsert any new users that don't already have roles
      const existingIds = new Set(userRoles.map(r => r.hubspot_user_id));
      const newUsers = owners.filter(o => !existingIds.has(o.userId));

      for (const user of newUsers) {
        await supabase.from('app_user_roles').upsert({
          dealer_account_id: dealerAccountId,
          hubspot_user_id: user.userId,
          hubspot_user_name: `${user.firstName} ${user.lastName}`.trim(),
          hubspot_user_email: user.email,
          role: 'user', // Default new users to 'user'
          updated_at: new Date().toISOString(),
        }, { onConflict: 'dealer_account_id,hubspot_user_id' });
      }

      // Also fetch pipelines
      const pipelineResponse = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
        headers: { 'Authorization': `Bearer ${hubspotToken}` },
      });
      if (pipelineResponse.ok) {
        const pipelineData = await pipelineResponse.json();
        const pipes: Pipeline[] = (pipelineData.results || []).map((p: any) => ({
          id: p.id,
          label: p.label,
          stages: (p.stages || []).map((s: any) => ({
            id: s.id,
            label: s.label,
            displayOrder: s.displayOrder || 0,
          })).sort((a: any, b: any) => a.displayOrder - b.displayOrder),
        }));
        setPipelines(pipes);
      }

      await loadData();
      toast.success(`Synced ${owners.length} users and ${pipelines.length} pipelines from HubSpot`);
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Failed to sync HubSpot users');
    } finally {
      setSyncing(false);
    }
  };

  // Update a user's role
  const updateUserRole = async (userId: string, newRole: string) => {
    const user = userRoles.find(u => u.hubspot_user_id === userId);
    if (!user) return;

    const { error } = await supabase
      .from('app_user_roles')
      .upsert({
        dealer_account_id: dealerAccountId,
        hubspot_user_id: userId,
        hubspot_user_name: user.hubspot_user_name,
        hubspot_user_email: user.hubspot_user_email,
        role: newRole,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'dealer_account_id,hubspot_user_id' });

    if (error) {
      toast.error('Failed to update role');
    } else {
      setUserRoles(prev => prev.map(u => u.hubspot_user_id === userId ? { ...u, role: newRole } : u));
    }
  };

  // Save an access rule
  const saveAccessRule = async (rule: AccessRule) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('access_rules')
        .upsert({
          dealer_account_id: dealerAccountId,
          pipeline_id: rule.pipeline_id,
          pipeline_label: rule.pipeline_label,
          cutoff_stage: rule.cutoff_stage,
          cutoff_stage_label: rule.cutoff_stage_label,
          pre_cutoff_min_role: rule.pre_cutoff_min_role,
          post_cutoff_min_role: rule.post_cutoff_min_role,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'dealer_account_id,pipeline_id' });

      if (error) throw error;
      await loadData();
      toast.success(`Access rule saved for ${rule.pipeline_label}`);
    } catch {
      toast.error('Failed to save access rule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Roles
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage who can view, edit, and download documents at each stage.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={syncHubSpotUsers} disabled={syncing}>
          {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Sync HubSpot Users
        </Button>
      </div>

      {/* User Roles Table */}
      {userRoles.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No users synced yet. Click "Sync HubSpot Users" to import your team.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{userRoles.length} Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {userRoles.map((user) => (
              <div key={user.hubspot_user_id} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <UserCog className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.hubspot_user_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.hubspot_user_email}</p>
                  </div>
                </div>
                <Select value={user.role} onValueChange={(val) => updateUserRole(user.hubspot_user_id, val)}>
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${roleBadgeColor(opt.value)}`}>
                            {opt.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Role Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Role Definitions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ROLE_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 w-20 justify-center ${roleBadgeColor(opt.value)}`}>
                {opt.label}
              </Badge>
              <span className="text-muted-foreground">{opt.desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pipeline Access Rules */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5" />
          Pipeline Access Rules
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Set the deal stage at which regular users and viewers gain access. Before the cutoff, only admins and managers can interact with the app.
        </p>

        {pipelines.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Sync HubSpot Users first to load pipelines and stages.</p>
            </CardContent>
          </Card>
        )}

        {pipelines.map((pipeline) => {
          const existingRule = accessRules.find(r => r.pipeline_id === pipeline.id);
          const [localRule, setLocalRule] = useState<AccessRule>(existingRule || {
            pipeline_id: pipeline.id,
            pipeline_label: pipeline.label,
            cutoff_stage: pipeline.stages[pipeline.stages.length - 1]?.id || '',
            cutoff_stage_label: pipeline.stages[pipeline.stages.length - 1]?.label || '',
            pre_cutoff_min_role: 'manager',
            post_cutoff_min_role: 'viewer',
          });

          return (
            <Card key={pipeline.id} className="mb-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{pipeline.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cutoff Stage (access opens at)</Label>
                    <Select
                      value={localRule.cutoff_stage}
                      onValueChange={(val) => {
                        const stage = pipeline.stages.find(s => s.id === val);
                        setLocalRule(prev => ({ ...prev, cutoff_stage: val, cutoff_stage_label: stage?.label || '' }));
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {pipeline.stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Before cutoff, min role</Label>
                    <Select value={localRule.pre_cutoff_min_role} onValueChange={(val) => setLocalRule(prev => ({ ...prev, pre_cutoff_min_role: val }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">After cutoff, min role</Label>
                    <Select value={localRule.post_cutoff_min_role} onValueChange={(val) => setLocalRule(prev => ({ ...prev, post_cutoff_min_role: val }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => saveAccessRule(localRule)} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : null}
                  Save Rule
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
