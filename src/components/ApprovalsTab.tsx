import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n';
import { Avatar } from './Avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Inbox } from 'lucide-react';
import type { ApprovalRequest, Team, TeamMember } from '@/types';

interface Props {
  approvals: ApprovalRequest[];
  team: Team;
  isLeader: boolean;
  onChange: () => void;
  members: TeamMember[];
}

export function ApprovalsTab({ approvals, isLeader, onChange, members }: Props) {
  const { t } = useI18n();

  const review = async (req: ApprovalRequest, status: 'approved' | 'rejected') => {
    await supabase.from('task_approval_requests').update({ status, reviewed_at: new Date().toISOString() }).eq('id', req.id);
    if (status === 'approved') {
      await supabase.from('tasks').update({ status: req.to_status }).eq('id', req.task_id);
    }
    onChange();
  };

  const pending = approvals.filter(a => a.status === 'pending');
  const resolved = approvals.filter(a => a.status !== 'pending');

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  const statusBadge = (status: string) => {
    if (status === 'pending') return <Badge variant="outline" className="text-amber-400 border-amber-400/30">{t.approvals.pending}</Badge>;
    if (status === 'approved') return <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">{t.approvals.approved}</Badge>;
    return <Badge variant="outline" className="text-red-400 border-red-400/30">{t.approvals.rejected}</Badge>;
  };

  return (
    <div className="p-6">
      {pending.length === 0 && resolved.length === 0 && (
        <div className="text-center py-12">
          <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No approval requests</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t.approvals.pending}</h3>
          <div className="space-y-3">
            {pending.map(req => {
              const requester = members.find(m => m.id === req.requested_by);
              return (
                <div key={req.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar user={requester || { id: req.requested_by, full_name: '?' }} size="sm" />
                      <span className="font-medium">{requester?.full_name}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(req.created_at)}</span>
                    </div>
                    {statusBadge(req.status)}
                  </div>
                  <div className="text-sm mb-2">
                    <strong>{req.tasks?.title}</strong> — {(t.statuses as any)[req.from_status]} {t.approvals.from} → {(t.statuses as any)[req.to_status]} {t.approvals.to}
                  </div>
                  {req.message && <p className="text-xs text-muted-foreground mb-3 bg-accent p-2 rounded">{req.message}</p>}
                  {isLeader && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => review(req, 'approved')}><Check className="w-4 h-4 mr-1" />{t.approvals.approve}</Button>
                      <Button size="sm" variant="destructive" onClick={() => review(req, 'rejected')}><X className="w-4 h-4 mr-1" />{t.approvals.reject}</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t.approvals.approved} / {t.approvals.rejected}</h3>
          <div className="space-y-2">
            {resolved.map(req => {
              const requester = members.find(m => m.id === req.requested_by);
              return (
                <div key={req.id} className="bg-card/50 border border-border rounded-md p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar user={requester || { id: req.requested_by, full_name: '?' }} size="xs" />
                    <span>{req.tasks?.title}</span>
                    <span className="text-muted-foreground">— {(t.statuses as any)[req.from_status]} → {(t.statuses as any)[req.to_status]}</span>
                  </div>
                  {statusBadge(req.status)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
