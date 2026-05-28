import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface Props {
  onClose: () => void;
  onDone: (teamId: string) => void;
}

export function NewTeamForm({ onClose, onDone }: Props) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (mode === 'create') {
        const { data, error } = await supabase.from('teams').insert({
          name, description: desc, team_code: generateCode(), created_by: profile!.id
        }).select().single();
        if (error) throw error;
        await new Promise(r => setTimeout(r, 300));
        onDone(data.id);
      } else {
        const { data: team, error } = await supabase.from('teams').select('id').eq('team_code', code.toUpperCase()).maybeSingle();
        if (error) throw error;
        if (!team) throw new Error(t.errors.teamNotFound);
        const { error: mErr } = await supabase.from('team_members').insert({
          team_id: team.id, user_id: profile!.id, role: 'worker'
        });
        if (mErr) {
          if (mErr.code === '23505') throw new Error(t.errors.alreadyInTeam);
          throw mErr;
        }
        onDone(team.id);
      }
    } catch (e: any) {
      setErr(e.message || t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl mt-16 fade-up p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">{t.sidebar.teams}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-1 p-1 bg-accent rounded-md mb-5">
          {(['create', 'join'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${mode === m ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}>
              {m === 'create' ? t.onboarding.createTeam : t.onboarding.joinTeam}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'create' ? (
            <>
              <div>
                <Label>{t.onboarding.teamName}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <Label>{t.onboarding.teamDesc}</Label>
                <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
              </div>
            </>
          ) : (
            <div>
              <Label>{t.onboarding.teamCode}</Label>
              <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="font-mono uppercase" maxLength={6} required />
            </div>
          )}
          {err && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{err}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>{t.task.cancel}</Button>
            <Button type="submit" disabled={loading}>
              {loading && <span className="mr-2 inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              {mode === 'create' ? t.onboarding.create : t.onboarding.join}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
