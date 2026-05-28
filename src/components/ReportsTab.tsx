import { useMemo } from 'react';
import { useI18n } from '@/i18n';
import { Avatar } from './Avatar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CheckSquare, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import type { Task, TeamMember, TimeEntry, ApprovalRequest } from '@/types';

interface Props {
  tasks: Task[];
  members: TeamMember[];
  timeEntries: TimeEntry[];
  approvals: ApprovalRequest[];
}

const COLORS = ['#f37510', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

export function ReportsTab({ tasks, members, timeEntries, approvals }: Props) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
    return { total, completed, inProgress, overdue };
  }, [tasks]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name: (t.statuses as any)[name] || name,
      value,
    }));
  }, [tasks, t]);

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.priority] = (counts[t.priority] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name: (t.priorities as any)[name] || name,
      value,
    }));
  }, [tasks, t]);

  const assigneeData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { if (t.assignee_id) counts[t.assignee_id] = (counts[t.assignee_id] || 0) + 1; });
    return Object.entries(counts).map(([userId, value]) => {
      const member = members.find(m => m.id === userId);
      return { name: member?.full_name || '?', value };
    }).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [tasks, members]);

  const timeData = useMemo(() => {
    const userTime: Record<string, number> = {};
    timeEntries.forEach(te => {
      if (te.duration) userTime[te.user_id] = (userTime[te.user_id] || 0) + te.duration;
    });
    return Object.entries(userTime).map(([userId, seconds]) => {
      const member = members.find(m => m.id === userId);
      const hours = Math.round(seconds / 3600 * 10) / 10;
      return { name: member?.full_name || '?', hours };
    }).sort((a, b) => b.hours - a.hours).slice(0, 8);
  }, [timeEntries, members]);

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckSquare className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">{t.reports.totalTasks}</span>
          </div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">{t.reports.completed}</span>
          </div>
          <div className="text-2xl font-semibold">{stats.completed}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sky-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">{t.reports.inProgress}</span>
          </div>
          <div className="text-2xl font-semibold">{stats.inProgress}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">{t.reports.overdue}</span>
          </div>
          <div className="text-2xl font-semibold">{stats.overdue}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4">{t.reports.byStatus}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4">{t.reports.byPriority}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={priorityData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name }) => name}>
                {priorityData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4">{t.reports.byAssignee}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={assigneeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4">{t.reports.timeReport} (saat)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={timeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
              <Bar dataKey="hours" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
