import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { Onboarding } from './Onboarding';
import { TeamView } from './TeamView';
import { Footer } from './Footer';
import { NewTeamForm } from './NewTeamForm';
import { Avatar } from './Avatar';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Plus, Sun, Moon, Globe } from 'lucide-react';
import type { Team } from '@/types';

const colorFor = (id: string) => {
  const colors = ['bg-red-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500'];
  const idx = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
};

export function AppShell() {
  const { profile, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTeam, setShowNewTeam] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('team_members')
      .select('role, teams(*)')
      .eq('user_id', profile.id);
    const t = (data || []).map((d: any) => ({ ...d.teams, my_role: d.role }));
    setTeams(t);
    if (!activeTeamId && t.length > 0) setActiveTeamId(t[0].id);
    setLoading(false);
  }, [profile?.id, activeTeamId]);

  useEffect(() => {
    if (profile) loadTeams();
  }, [profile, loadTeams]);

  // Subscribe to team_members changes
  useEffect(() => {
    if (!profile) return;
    const channel = supabase.channel('team-members-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, loadTeams)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, loadTeams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (teams.length === 0) {
    return <Onboarding onDone={(id) => { setActiveTeamId(id); loadTeams(); }} />;
  }

  const activeTeam = teams.find(t => t.id === activeTeamId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-60 bg-card border-r border-border flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 bg-primary-foreground rounded-sm" />
              </div>
              <span className="font-semibold tracking-tight">{t.app.name}</span>
            </div>
          </div>
          <div className="p-3 flex-1 overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t.sidebar.teams}</span>
              <button onClick={() => setShowNewTeam(true)} className="text-muted-foreground hover:text-primary p-0.5" title={t.sidebar.newTeam}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => setActiveTeamId(team.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 group transition-colors ${
                    team.id === activeTeamId ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded text-[10px] font-semibold flex items-center justify-center flex-shrink-0 ${colorFor(team.id)} text-white`}>
                    {team.name[0].toUpperCase()}
                  </div>
                  <span className="truncate flex-1">{team.name}</span>
                  {team.my_role === 'leader' && <CrownIcon />}
                </button>
              ))}
            </div>
          </div>
          {/* Controls */}
          <div className="p-2 border-t border-border">
            <div className="flex items-center gap-1 mb-2 px-2">
              <button onClick={toggle} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title={theme === 'dark' ? t.theme.light : t.theme.dark}>
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setLang(lang === 'az' ? 'en' : 'az')} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-xs" title="Language">
                <Globe className="w-3.5 h-3.5" />
                {lang.toUpperCase()}
              </button>
            </div>
          </div>
          {/* User */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <Avatar user={profile!} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{profile?.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">@{profile?.username}</div>
              </div>
              <button onClick={signOut} className="text-muted-foreground hover:text-destructive p-1" title={t.sidebar.logout}>
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTeam && (
            <TeamView
              team={activeTeam}
              key={activeTeam.id}
              onTeamUpdate={loadTeams}
            />
          )}
        </main>
      </div>
      <Footer />

      {/* New team modal */}
      {showNewTeam && (
        <NewTeamForm
          onClose={() => setShowNewTeam(false)}
          onDone={(id) => { loadTeams(); setActiveTeamId(id); setShowNewTeam(false); }}
        />
      )}
    </div>
  );
}

function CrownIcon() {
  return (
    <svg className="w-3 h-3 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V18H19V19Z" />
    </svg>
  );
}
