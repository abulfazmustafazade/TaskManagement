import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import type { Team } from '@/types';

interface Props {
  team: Team;
  onChange: () => void;
}

export function SettingsTab({ team, onChange }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState(team.name);
  const [desc, setDesc] = useState(team.description || '');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    await supabase.from('teams').update({ name, description: desc }).eq('id', team.id);
    setLoading(false);
    onChange();
  };

  const deleteTeam = async () => {
    if (!confirm(t.settings.deleteConfirm)) return;
    await supabase.from('teams').delete().eq('id', team.id);
    onChange();
  };

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-lg font-semibold mb-4">{t.settings.title}</h2>
      <div className="space-y-4">
        <div>
          <Label>{t.onboarding.teamName}</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <Label>{t.onboarding.teamDesc}</Label>
          <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
        </div>
        <Button onClick={save} disabled={loading}>
          {loading && <span className="mr-2 inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          {t.settings.rename}
        </Button>
      </div>

      <div className="mt-8 border border-destructive/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4" />{t.settings.dangerZone}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">{t.settings.deleteConfirm}</p>
        <Button variant="destructive" size="sm" onClick={deleteTeam}>{t.settings.delete}</Button>
      </div>
    </div>
  );
}
