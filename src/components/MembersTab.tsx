import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n';
import { Avatar } from './Avatar';
import { Button } from '@/components/ui/button';
import { Crown, UserX, ArrowUp, ArrowDown, Copy, Check } from 'lucide-react';
import type { Team, TeamMember } from '@/types';

interface Props {
  members: TeamMember[];
  team: Team;
  isLeader: boolean;
  onChange: () => void;
}

export function MembersTab({ members, team, isLeader, onChange }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(team.team_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const removeMember = async (userId: string) => {
    if (!confirm('Remove this member?')) return;
    await supabase.from('team_members').delete().eq('team_id', team.id).eq('user_id', userId);
    onChange();
  };

  const changeRole = async (userId: string, newRole: string) => {
    await supabase.from('team_members').update({ role: newRole }).eq('team_id', team.id).eq('user_id', userId);
    onChange();
  };

  if (members.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        {t.members.noMembers}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">{t.members.title}</h2>
        <div className="flex items-center gap-2 bg-accent px-3 py-1.5 rounded-md">
          <span className="text-sm font-mono">{team.team_code}</span>
          <button onClick={copyCode} className="text-muted-foreground hover:text-primary">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {members.map(member => (
          <div key={member.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
            <div className="flex items-center gap-3">
              <Avatar user={member} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{member.full_name}</span>
                  <span className="text-xs text-muted-foreground">@{member.username}</span>
                  {member.role === 'leader' && <Crown className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {member.role === 'leader' ? t.members.promote : t.members.demote} • {new Date(member.joined_at).toLocaleDateString('az-AZ')}
                </div>
              </div>
            </div>
            {isLeader && member.role !== 'leader' && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => changeRole(member.id, 'leader')} title={t.members.promote}>
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeMember(member.id)} title={t.members.remove}>
                  <UserX className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            )}
            {isLeader && member.role === 'leader' && member.id !== team.created_by && (
              <Button size="sm" variant="ghost" onClick={() => changeRole(member.id, 'worker')} title={t.members.demote}>
                <ArrowDown className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
