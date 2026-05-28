import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, UserPlus } from 'lucide-react';

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface OnboardingProps {
  onDone: (teamId: string) => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const teamCode = generateCode();
      const { data, error } = await supabase.from('teams').insert({
        name, description: desc, team_code: teamCode, created_by: profile!.id
      }).select().single();
      if (error) throw error;
      // Small delay to let trigger run
      await new Promise(r => setTimeout(r, 300));
      onDone(data.id);
    } catch (e: any) {
      setErr(e.message || t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const joinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { data: team, error } = await supabase.from('teams').select('id, team_code').eq('team_code', code.toUpperCase().trim()).maybeSingle();
      if (error) throw error;
      if (!team) throw new Error(t.errors.teamNotFound);
      const { error: mErr } = await supabase.from('team_members').insert({
        team_id: teams.id, user_id: profiles.id, role: 'worker'
      });
      if (mErr) {
        if (mErr.code === '23505') throw new Error(t.errors.alreadyInTeam);
        throw mErr;
      }
      onDone(team.id);
    } catch (e: any) {
      setErr(e.message || t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || profile?.username || '';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif mb-3">
            {t.onboarding.hello}, <span className="text-primary">{firstName}</span>
          </h1>
          <p className="text-muted-foreground">{t.onboarding.startPrompt}</p>
        </div>

        {!mode && (
          <div className="grid md:grid-cols-2 gap-4">
            <button onClick={() => setMode('create')} className="group bg-card border border-border hover:border-primary/50 rounded-lg p-6 text-left transition-all">
              <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1.5">{t.onboarding.createTeam}</h3>
              <p className="text-sm text-muted-foreground">{t.onboarding.createLeader}</p>
            </button>
            <button onClick={() => setMode('join')} className="group bg-card border border-border hover:border-primary/50 rounded-lg p-6 text-left transition-all">
              <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1.5">{t.onboarding.joinTeam}</h3>
              <p className="text-sm text-muted-foreground">{t.onboarding.joinWithCode}</p>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={createTeam} className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold mb-2">{t.onboarding.createTeam}</h3>
            <div>
              <Label>{t.onboarding.teamName}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Marketing Team" required />
            </div>
            <div>
              <Label>{t.onboarding.teamDesc}</Label>
              <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Brief description..." />
            </div>
            {err && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{err}</div>}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setMode(null)}>{t.onboarding.back}</Button>
              <Button type="submit" disabled={loading} className="flex-1 justify-center">
                {loading && <span className="mr-2 inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                {t.onboarding.create}
              </Button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={joinTeam} className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold mb-2">{t.onboarding.joinTeam}</h3>
            <div>
              <Label>{t.onboarding.teamCode}</Label>
              <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ABC123" className="font-mono uppercase" maxLength={6} required />
              <p className="text-xs text-muted-foreground mt-1">{t.onboarding.codeHint}</p>
            </div>
            {err && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{err}</div>}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setMode(null)}>{t.onboarding.back}</Button>
              <Button type="submit" disabled={loading} className="flex-1 justify-center">
                {loading && <span className="mr-2 inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                {t.onboarding.join}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
