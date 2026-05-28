import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Trash2, Repeat } from 'lucide-react';
import type { Team, TeamMember, TaskStatus, TaskPriority, RepeatType } from '@/types';

interface Props {
  team: Team;
  members: TeamMember[];
  onClose: () => void;
  onDone: () => void;
}

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const REPEAT_TYPES: RepeatType[] = ['daily', 'weekly', 'monthly'];

export function TaskForm({ team, members, onClose, onDone }: Props) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isRepeat, setIsRepeat] = useState(false);
  const [repeatType, setRepeatType] = useState<RepeatType>('daily');
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      // Insert task
      const { data: taskData, error } = await supabase.from('tasks').insert({
        team_id: team.id,
        title,
        description,
        priority,
        status,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        start_date: startDate || null,
        tags,
        created_by: profile!.id,
        position: 0,
      }).select().single();

      if (error) throw error;

      // If repeat is enabled, create repeat task
      if (isRepeat && taskData) {
        const { error: rErr } = await supabase.from('repeat_tasks').insert({
          team_id: team.id,
          parent_task_id: taskData.id,
          title,
          description,
          priority,
          assignee_id: assigneeId || null,
          created_by: profile!.id,
          repeat_type: repeatType,
          repeat_interval: repeatInterval,
          active: true,
          due_date_offset: dueDate ? Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / 86400000) : 1,
          tags,
        });
        if (rErr) console.error('Repeat task error:', rErr);
      }

      onDone();
    } catch (e: any) {
      setErr(e.message || t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl mt-8 fade-up p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">{t.team.newTask}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>{t.task.title}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required autoFocus placeholder="Task title" />
          </div>
          <div>
            <Label>{t.task.description}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Details, notes..." />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t.task.status}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{(t.statuses as any)[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.task.priority}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{(t.priorities as any)[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.task.assignee}</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder={t.task.nobody} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">{t.task.nobody}</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.task.startDate}</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>{t.task.dueDate}</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>{t.task.tags}</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}><Trash2 className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add tag" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
              <Button type="button" variant="outline" size="sm" onClick={addTag}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Repeat */}
          <div className="border border-border rounded-md p-3">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={isRepeat} onChange={e => setIsRepeat(e.target.checked)} className="rounded" />
              <span className="text-sm font-medium flex items-center gap-1"><Repeat className="w-4 h-4" /> {t.task.repeat}</span>
            </label>
            {isRepeat && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t.task.repeatType}</Label>
                  <Select value={repeatType} onValueChange={(v) => setRepeatType(v as RepeatType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REPEAT_TYPES.map(r => <SelectItem key={r} value={r}>{(t.task as any)[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t.task.repeatInterval}</Label>
                  <Input type="number" min={1} value={repeatInterval} onChange={e => setRepeatInterval(parseInt(e.target.value) || 1)} />
                </div>
              </div>
            )}
          </div>

          {err && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{err}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>{t.task.cancel}</Button>
            <Button type="submit" disabled={loading}>
              {loading && <span className="mr-2 inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              {t.task.create}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
