import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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

interface Pipeline {
  id: string;
  label: string;
  stages: { id: string; label: string; displayOrder: number; }[];
}

interface UserRolesManagerProps {
  portalId: string;
  dealerAccountId: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', desc: 'Full access at any stage, can manage settings' },
  { value: 'manager', label: 'Manager', desc: 'Full access at any stage' },
  { value: 'user', label: 'User', desc: 'Can edit and generate, subject to stage restrictions' },
  { value: 'viewer', label: 'Viewer', desc: 'View-only, no editing or downloads until cutoff' },
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

export function UserRolesManager({ portalId, dealerAccountId }: UserRolesManagerProps) {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [accessRules, setAccessRules] = useState<AccessRule[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pipelineRules, setPipelineRules] = useState<Record<string, AccessRule>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: roles } = await supabase.from('app_user_roles').select('*').eq('dealer_account_id', dealerAccountId).order('hubspot_user_name');
      if (roles) setUserRoles(roles);
      const { data: rules } = await supabase.from('access_rules').select('*').eq('dealer_account_id', dealerAccountId);
      if (rules) {
        setAccessRules(rules);
        const ruleMap: Record<string, AccessRule> = {};
        rules.forEach(r => { ruleMap[r.pipeline_id] = r; });
        setPipelineRules(ruleMap);
      }
    } catch (err) { console.error('Error loading roles:', err); }
    finally { setLoading(false); }
  }, [dealerAccountId]);

  useEffect(() => { loadData(); }, [loadData]);

  const syncHubSpotUsers = async () => {
    setSyncing(true);
    try {
      // Use the hubspot-get-owners edge function which handles token lookup server-side
      const { data, error: invokeError } = await supabase.functions.invoke('hubspot-get-owners', {
        body: { portalId },
      });

      if (invokeError || !data?.owners) {
        toast.error(data?.error || 'Failed to fetch HubSpot users');
        setSyncing(false);
        return;
      }

      const owners = (data.owners || []).map((o: any) => ({
        userId: String(o.userId || o.id),
        email: o.email || '',
        name: `${o.firstName || ''} ${o.lastName || ''}`.trim(),
      }));

      // Upsert new users that don't have roles yet
      const existingIds = new Set(userRoles.map(r => r.hubspot_user_id));
      for (const user of owners) {
        if (!existingIds.has(user.userId)) {
          await supabase.from('app_user_roles').upsert({
            dealer_account_id: dealerAccountId, hubspot_user_id: user.userId,
            hubspot_user_name: user.name, hubspot_user_email: user.email,
            role: 'user', updated_at: new Date().toISOString(),
          }, { onConflict: 'dealer_account_id,hubspot_user_id' });
        }
      }

      // Set pipelines from the same edge function response
      if (data.pipelines) {
        setPipelines(data.pipelines);
      }

      await loadData();
      toast.success(`Synced ${owners.length} users from HubSpot`);
    } catch (err) { console.error('Sync error:', err); toast.error('Failed to sync HubSpot users'); }
    finally { setSyncing(false); }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const user = userRoles.find(u => u.hubspot_user_id === userId);
    if (!user) return;
    const { error } = await supabase.from('app_user_roles').upsert({
      dealer_account_id: dealerAccountId, hubspot_user_id: userId,
      hubspot_user_name: user.hubspot_user_name, hubspot_user_email: user.hubspot_user_email,
      role: newRole, updated_at: new Date().toISOString(),
    }, { onConflict: 'dealer_account_id,hubspot_user_id' });
    if (error) toast.error('Failed to update role');
    else setUserRoles(prev => prev.map(u => u.hubspot_user_id === userId ? { ...u, role: newRole } : u));
  };

  const saveAccessRule = async (rule: AccessRule) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('access_rules').upsert({
        dealer_account_id: dealerAccountId, pipeline_id: rule.pipeline_id,
        pipeline_label: rule.pipeline_label, cutoff_stage: rule.cutoff_stage,
        cutoff_stage_label: rule.cutoff_stage_label, pre_cutoff_min_role: rule.pre_cutoff_min_role,
        post_cutoff_min_role: rule.post_cutoff_min_role, updated_at: new Date().toISOString(),
      }, { onConflict: 'dealer_account_id,pipeline_id' });
      if (error) throw error;
      await loadData();
      toast.success(`Access rule saved for ${rule.pipeline_label}`);
    } catch { toast.error('Failed to save access rule'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" />User Roles</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Manage who can view, edit, and download documents at each stage.</p>
        </div>
        <Button variant="outline" size="sm" onClick={syncHubSpotUsers} disabled={syncing}>
          {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Sync HubSpot Users
        </Button>
      </div>

      {userRoles.length === 0 ? (
        <Card><CardContent className="pt-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No users synced yet. Click "Sync HubSpot Users" to import your team.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">{userRoles.length} Users</CardTitle></CardHeader>
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
                  <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${roleBadgeColor(opt.value)}`}>{opt.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Role Definitions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {ROLE_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 w-20 justify-center ${roleBadgeColor(opt.value)}`}>{opt.label}</Badge>
              <span className="text-muted-foreground">{opt.desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3"><Shield className="h-5 w-5" />Pipeline Access Rules</h3>
        <p className="text-sm text-muted-foreground mb-4">Set the deal stage at which regular users and viewers gain access. Before the cutoff, only admins and managers can interact.</p>
        {pipelines.length === 0 && (
          <Card><CardContent className="pt-6 text-center"><p className="text-sm text-muted-foreground">Sync HubSpot Users first to load pipelines.</p></CardContent></Card>
        )}
        {pipelines.map((pipeline) => {
          const existing = pipelineRules[pipeline.id];
          const defaultRule: AccessRule = { pipeline_id: pipeline.id, pipeline_label: pipeline.label, cutoff_stage: pipeline.stages[pipeline.stages.length - 1]?.id || '', cutoff_stage_label: pipeline.stages[pipeline.stages.length - 1]?.label || '', pre_cutoff_min_role: 'manager', post_cutoff_min_role: 'viewer' };
          const rule = existing || defaultRule;

          return (
            <Card key={pipeline.id} className="mb-3">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">{pipeline.label}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cutoff Stage (access opens at)</Label>
                    <Select value={rule.cutoff_stage} onValueChange={(val) => {
                      const stage = pipeline.stages.find(s => s.id === val);
                      setPipelineRules(prev => ({ ...prev, [pipeline.id]: { ...rule, cutoff_stage: val, cutoff_stage_label: stage?.label || '' } }));
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{pipeline.stages.map((stage) => (<SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Before cutoff, min role</Label>
                    <Select value={rule.pre_cutoff_min_role} onValueChange={(val) => setPipelineRules(prev => ({ ...prev, [pipeline.id]: { ...rule, pre_cutoff_min_role: val } }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLE_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">After cutoff, min role</Label>
                    <Select value={rule.post_cutoff_min_role} onValueChange={(val) => setPipelineRules(prev => ({ ...prev, [pipeline.id]: { ...rule, post_cutoff_min_role: val } }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLE_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => saveAccessRule(pipelineRules[pipeline.id] || rule)} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : null}Save Rule
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
