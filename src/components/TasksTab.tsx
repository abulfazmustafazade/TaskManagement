import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n';
import { useDndContext, DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar } from './Avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Flag, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Task, Team, TeamMember, TaskStatus, TaskPriority, TaskMessage, ChecklistItem, TimeEntry } from '@/types';

interface Props {
  view: 'kanban' | 'list';
  tasks: Task[];
  members: TeamMember[];
  team: Team;
  isLeader: boolean;
  onEdit: (task: Task) => void;
  onChange: () => void;
  messages: TaskMessage[];
  checklists: ChecklistItem[];
  timeEntries: TimeEntry[];
  activeTimer: string | null;
  setActiveTimer: (id: string | null) => void;
}

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export function TasksTab({ view, tasks, members, team, isLeader, onEdit, onChange }: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      if (filterAssignee !== 'all' && task.assignee_id !== filterAssignee) return false;
      return true;
    });
  }, [tasks, search, filterStatus, filterPriority, filterAssignee]);

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterAssignee('all');
  };

  const hasFilters = search || filterStatus !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all';

  if (tasks.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent mb-4">
          <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-1">{t.task.noTasks}</h3>
        <p className="text-sm text-muted-foreground">{t.task.createFirst}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.task.search} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t.task.filterStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.task.all}</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{(t.statuses as any)[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t.task.filterPriority} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.task.all}</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{(t.priorities as any)[p]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t.task.filterAssignee} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.task.all}</SelectItem>
            {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <button onClick={clearFilters} className="text-muted-foreground hover:text-foreground px-2">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t.task.noTasks}</div>
      ) : view === 'kanban' ? (
        <KanbanView tasks={filteredTasks} members={members} onEdit={onEdit} onChange={onChange} />
      ) : (
        <ListView tasks={filteredTasks} members={members} onEdit={onEdit} />
      )}
    </div>
  );
}

function KanbanView({ tasks, members, onEdit, onChange }: { tasks: Task[]; members: TeamMember[]; onEdit: (t: Task) => void; onChange: () => void }) {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = {
    // Use pointer sensor for drag
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeTask = tasks.find(t => t.id === active.id);
    const overId = over.id;
    let newStatus: TaskStatus | null = null;
    
    // Check if dropped on a column
    if (STATUSES.includes(overId as TaskStatus)) {
      newStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    if (newStatus && activeTask && activeTask.status !== newStatus) {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', activeTask.id);
      onChange();
    }
  };

  const statusColors: Record<TaskStatus, string> = {
    todo: 'bg-muted-foreground',
    in_progress: 'bg-sky-400',
    in_review: 'bg-amber-400',
    done: 'bg-emerald-400',
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={({ active }) => setActiveId(active.id as string)} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 min-h-full">
        {STATUSES.map(status => {
          const colTasks = tasks.filter(t => t.status === status);
          return (
            <div key={status} className="w-72 flex-shrink-0 flex flex-col">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">{(t.statuses as any)[status]}</h3>
                  <span className="text-xs text-muted-foreground font-mono">{colTasks.length}</span>
                </div>
              </div>
              <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 flex-1 min-h-[100px]" id={status}>
                  {colTasks.map(task => (
                    <SortableTaskCard key={task.id} task={task} members={members} onEdit={onEdit} />
                  ))}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeId ? (
          <TaskCardOverlay task={tasks.find(t => t.id === activeId)!} members={members} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableTaskCard({ task, members, onEdit }: { task: Task; members: TeamMember[]; onEdit: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} members={members} onEdit={onEdit} />
    </div>
  );
}

function TaskCard({ task, members, onEdit }: { task: Task; members: TeamMember[]; onEdit: (t: Task) => void }) {
  const { t } = useI18n();
  const assignee = members.find(m => m.id === task.assignee_id);
  const priorityColors: Record<string, string> = {
    urgent: 'border-l-red-500',
    high: 'border-l-amber-400',
    medium: 'border-l-muted-foreground',
    low: 'border-l-border',
  };

  const formatDate = (d?: string) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short' });
  };

  return (
    <div
      onClick={() => onEdit(task)}
      className={`bg-card border border-border hover:border-primary/30 rounded-md p-3 cursor-pointer transition-colors group border-l-[3px] ${priorityColors[task.priority] || 'border-l-border'}`}
    >
      <div className="text-sm font-medium text-foreground mb-2 leading-snug">{task.title}</div>
      {task.description && <div className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</div>}
      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{tag}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
          <div className={`flex items-center gap-1 ${task.priority === 'urgent' ? 'text-red-400' : task.priority === 'high' ? 'text-amber-400' : ''}`}>
            <Flag className="w-3 h-3" />
          </div>
        </div>
        {assignee && <Avatar user={assignee} size="xs" />}
      </div>
    </div>
  );
}

function TaskCardOverlay({ task, members }: { task: Task; members: TeamMember[] }) {
  return (
    <div className="bg-card border border-primary/50 rounded-md p-3 shadow-lg opacity-90 rotate-2">
      <div className="text-sm font-medium text-foreground mb-2">{task.title}</div>
    </div>
  );
}

function ListView({ tasks, members, onEdit }: { tasks: Task[]; members: TeamMember[]; onEdit: (t: Task) => void }) {
  const { t } = useI18n();
  const statusColors: Record<string, string> = {
    todo: 'bg-muted-foreground',
    in_progress: 'bg-sky-400',
    in_review: 'bg-amber-400',
    done: 'bg-emerald-400',
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        <div className="col-span-5">{t.task.title}</div>
        <div className="col-span-2">{t.task.status}</div>
        <div className="col-span-2">{t.task.priority}</div>
        <div className="col-span-2">{t.task.assignee}</div>
        <div className="col-span-1">{t.task.dueDate}</div>
      </div>
      {tasks.map(task => {
        const assignee = members.find(m => m.id === task.assignee_id);
        return (
          <div key={task.id} onClick={() => onEdit(task)}
            className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer items-center">
            <div className="col-span-5 text-sm font-medium text-foreground truncate">{task.title}</div>
            <div className="col-span-2 flex items-center gap-1.5 text-xs">
              <div className={`w-1.5 h-1.5 rounded-full ${statusColors[task.status]}`} />
              <span className="text-muted-foreground">{(t.statuses as any)[task.status]}</span>
            </div>
            <div className="col-span-2 text-xs text-muted-foreground">{(t.priorities as any)[task.priority]}</div>
            <div className="col-span-2">
              {assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar user={assignee} size="xs" />
                  <span className="text-xs text-foreground truncate">{assignee.full_name}</span>
                </div>
              ) : <span className="text-xs text-muted-foreground">—</span>}
            </div>
            <div className="col-span-1 text-xs text-muted-foreground">{formatDate(task.due_date)}</div>
          </div>
        );
      })}
    </div>
  );
}
