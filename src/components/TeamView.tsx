import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n';
import { TasksTab } from './TasksTab';
import { MembersTab } from './MembersTab';
import { ApprovalsTab } from './ApprovalsTab';
import { SettingsTab } from './SettingsTab';
import { ReportsTab } from './ReportsTab';
import { TaskForm } from './TaskForm';
import { TaskDetail } from './TaskDetail';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Inbox, Users, Settings, BarChart3, LayoutGrid, List, Plus, Copy, Crown, User } from 'lucide-react';
import type { Team, Task, TaskMessage, ChecklistItem, TimeEntry, ApprovalRequest, TeamMember } from '@/types';

interface Props {
  team: Team;
  onTeamUpdate: () => void;
}

export function TeamView({ team, onTeamUpdate }: Props) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState('tasks');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);

  const isLeader = team.my_role === 'leader';

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tasksRes, membersRes, approvalsRes, messagesRes, checklistsRes, timeRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('team_id', team.id).order('position', { ascending: true }).order('created_at', { ascending: false }),
      supabase.from('team_members').select('role, joined_at, profiles(*)').eq('team_id', team.id),
      supabase.from('task_approval_requests').select('*, tasks(title), profiles!task_approval_requests_requested_by_fkey(*)').eq('team_id', team.id).order('created_at', { ascending: false }),
      supabase.from('task_messages').select('*, profiles(*)').eq('team_id', team.id).order('created_at', { ascending: false }),
      supabase.from('task_checklists').select('*').eq('team_id', team.id).order('position', { ascending: true }),
      supabase.from('time_entries').select('*').eq('team_id', team.id).order('started_at', { ascending: false }),
    ]);

    setTasks((tasksRes.data || []) as Task[]);
    setMembers((membersRes.data || []).map((m: any) => ({ ...m.profiles, role: m.role, joined_at: m.joined_at })) as TeamMember[]);
    setApprovals((approvalsRes.data || []) as ApprovalRequest[]);
    setMessages((messagesRes.data || []) as TaskMessage[]);
    setChecklists((checklistsRes.data || []) as ChecklistItem[]);
    setTimeEntries((timeRes.data || []) as TimeEntry[]);
    setLoading(false);
  }, [team.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // realtime subscriptions
  useEffect(() => {
    const tables = ['tasks', 'task_approval_requests', 'team_members', 'task_messages', 'task_checklists', 'time_entries'];
    const channel = supabase.channel(`team-${team.id}`);
    tables.forEach(table => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `team_id=eq.${team.id}` }, loadData);
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [team.id, loadData]);

  const pendingApprovalsCount = approvals.filter(a => a.status === 'pending').length;

  const tabs = [
    { id: 'tasks', label: t.team.tabs.tasks, icon: CheckSquare },
    { id: 'approvals', label: t.team.tabs.approvals, icon: Inbox, badge: pendingApprovalsCount },
    { id: 'members', label: t.team.tabs.members, icon: Users },
    { id: 'reports', label: t.team.tabs.reports, icon: BarChart3 },
    ...(isLeader ? [{ id: 'settings', label: t.team.tabs.settings, icon: Settings }] : []),
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-40px)] overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0 bg-card">
        <div>
          <div className="flex items-center gap-3 mb-0.5">
            <h1 className="text-xl font-semibold tracking-tight">{team.name}</h1>
            {isLeader ? (
              <Badge variant="outline" className="text-primary border-primary/30"><Crown className="w-2.5 h-2.5 mr-1" />{t.team.leader}</Badge>
            ) : (
              <Badge variant="outline" className="text-sky-400 border-sky-400/30"><User className="w-2.5 h-2.5 mr-1" />{t.team.worker}</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{members.length} {t.team.members}</span>
            <span className="text-border">•</span>
            <span className="font-mono">{t.team.code}: {team.team_code}</span>
            <button onClick={() => navigator.clipboard.writeText(team.team_code)} className="text-muted-foreground hover:text-primary" title={t.team.copyCode}>
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
        {tab === 'tasks' && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-0.5 bg-accent border border-border rounded-md">
              <button onClick={() => setView('kanban')} className={`p-1.5 rounded transition-colors ${view === 'kanban' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`} title={t.team.views.kanban}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setView('list')} className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`} title={t.team.views.list}>
                <List className="w-4 h-4" />
              </button>
            </div>
            <Button onClick={() => setNewTaskOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1" />{t.team.newTask}</Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-6 flex gap-1 flex-shrink-0 bg-card">
        {tabs.map(ta => (
          <button
            key={ta.id}
            onClick={() => setTab(ta.id)}
            className={`px-3 py-3 text-sm flex items-center gap-2 border-b-2 -mb-px transition-colors ${
              tab === ta.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ta.icon className="w-3.5 h-3.5" />
            {ta.label}
            {(ta as any).badge > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-semibold rounded-full px-1.5 py-0">{(ta as any).badge}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full"><span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : tab === 'tasks' ? (
          <TasksTab view={view} tasks={tasks} members={members} team={team} isLeader={isLeader}
            onEdit={setEditingTask} onChange={loadData} messages={messages} checklists={checklists}
            timeEntries={timeEntries} activeTimer={activeTimer} setActiveTimer={setActiveTimer} />
        ) : tab === 'approvals' ? (
          <ApprovalsTab approvals={approvals} team={team} isLeader={isLeader} onChange={loadData} members={members} />
        ) : tab === 'members' ? (
          <MembersTab members={members} team={team} isLeader={isLeader} onChange={loadData} />
        ) : tab === 'reports' ? (
          <ReportsTab tasks={tasks} members={members} timeEntries={timeEntries} approvals={approvals} />
        ) : tab === 'settings' ? (
          <SettingsTab team={team} onChange={() => { loadData(); onTeamUpdate(); }} />
        ) : null}
      </div>

      {/* Modals */}
      {newTaskOpen && (
        <TaskForm team={team} members={members} onClose={() => setNewTaskOpen(false)} onDone={() => { loadData(); setNewTaskOpen(false); }} />
      )}
      {editingTask && (
        <TaskDetail task={editingTask} team={team} members={members} isLeader={isLeader}
          onClose={() => setEditingTask(null)} onChange={loadData}
          messages={messages.filter(m => m.task_id === editingTask.id)}
          checklists={checklists.filter(c => c.task_id === editingTask.id)}
          timeEntries={timeEntries.filter(te => te.task_id === editingTask.id)}
          activeTimer={activeTimer} setActiveTimer={setActiveTimer} />
      )}
    </div>
  );
}
