import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n';
import { Avatar } from './Avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Send, Clock, Play, Square, CheckSquare, Trash2, Flag, Calendar, MessageSquare, ListChecks } from 'lucide-react';
import type { Task, Team, TeamMember, TaskStatus, TaskPriority, TaskMessage, ChecklistItem, TimeEntry } from '@/types';

interface Props {
  task: Task;
  team: Team;
  members: TeamMember[];
  isLeader: boolean;
  onClose: () => void;
  onChange: () => void;
  messages: TaskMessage[];
  checklists: ChecklistItem[];
  timeEntries: TimeEntry[];
  activeTimer: string | null;
  setActiveTimer: (id: string | null) => void;
}

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export function TaskDetail({ task: initTask, team, members, isLeader, onClose, onChange, messages: initMessages, checklists: initChecklists, timeEntries, activeTimer, setActiveTimer }: Props) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [task, setTask] = useState<Task>(initTask);
  const [comments, setComments] = useState<TaskMessage[]>(initMessages);
  const [checklists, setChecklists] = useState<ChecklistItem[]>(initChecklists);
  const [newComment, setNewComment] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description || '');
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editStatus, setEditStatus] = useState(task.status);
  const [editAssignee, setEditAssignee] = useState(task.assignee_id || '');
  const [editDueDate, setEditDueDate] = useState(task.due_date || '');
  const [editStartDate, setEditStartDate] = useState(task.start_date || '');
  const [editTags, setEditTags] = useState<string[]>(task.tags || []);
  const [newTag, setNewTag] = useState('');
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'checklist' | 'time'>('chat');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const assignee = members.find(m => m.id === task.assignee_id);
  const creator = members.find(m => m.id === task.created_by);

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatDateTime = (d?: string) => d ? new Date(d).toLocaleString('az-AZ') : '';
  const formatDuration = (s?: number) => {
    if (!s) return '0s';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${sec}s`;
  };

  // Load messages
  const loadMessages = useCallback(async () => {
    const { data } = await supabase.from('task_messages').select('*, profiles(*)').eq('task_id', task.id).order('created_at', { ascending: true });
    setComments((data || []) as TaskMessage[]);
  }, [task.id]);

  // Load checklists
  const loadChecklists = useCallback(async () => {
    const { data } = await supabase.from('task_checklists').select('*').eq('task_id', task.id).order('position', { ascending: true });
    setChecklists((data || []) as ChecklistItem[]);
  }, [task.id]);

  useEffect(() => {
    loadMessages();
    loadChecklists();
  }, [loadMessages, loadChecklists]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Timer interval
  useEffect(() => {
    if (activeTimer === task.id && timerStart) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerStart.getTime()) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTimer, timerStart, task.id]);

  const startTimer = async () => {
    setBusy(true);
    const { data, error } = await supabase.from('time_entries').insert({
      task_id: task.id, team_id: team.id, user_id: profile!.id, started_at: new Date().toISOString(),
    }).select().single();
    if (!error && data) {
      setActiveTimer(task.id);
      setTimerStart(new Date());
    }
    setBusy(false);
  };

  const stopTimer = async () => {
    setBusy(true);
    const activeEntry = timeEntries.find(te => te.task_id === task.id && !te.ended_at && te.user_id === profile!.id);
    if (activeEntry) {
      const now = new Date();
      const started = new Date(activeEntry.started_at);
      const duration = Math.floor((now.getTime() - started.getTime()) / 1000);
      await supabase.from('time_entries').update({ ended_at: now.toISOString(), duration }).eq('id', activeEntry.id);
    }
    setActiveTimer(null);
    setTimerStart(null);
    setElapsed(0);
    onChange();
    setBusy(false);
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    // Parse mentions (@username)
    const mentionUsernames = newComment.match(/@(\w+)/g) || [];
    const mentions = mentionUsernames.map(mu => {
      const username = mu.slice(1);
      const member = members.find(m => m.username === username);
      return member?.id;
    }).filter(Boolean) as string[];

    await supabase.from('task_messages').insert({
      task_id: task.id, team_id: team.id, user_id: profile!.id,
      content: newComment.trim(), mentions,
    });
    setNewComment('');
    loadMessages();
    onChange();
  };

  const addCheckItem = async () => {
    if (!newCheckItem.trim()) return;
    await supabase.from('task_checklists').insert({
      task_id: task.id, team_id: team.id, content: newCheckItem.trim(), position: checklists.length,
    });
    setNewCheckItem('');
    loadChecklists();
    onChange();
  };

  const toggleCheckItem = async (item: ChecklistItem) => {
    await supabase.from('task_checklists').update({ completed: !item.completed }).eq('id', item.id);
    loadChecklists();
    onChange();
  };

  const deleteCheckItem = async (id: string) => {
    await supabase.from('task_checklists').delete().eq('id', id);
    loadChecklists();
    onChange();
  };

  const saveEdit = async () => {
    setBusy(true); setErr('');
    try {
      const { error } = await supabase.from('tasks').update({
        title: editTitle, description: editDesc, priority: editPriority, status: editStatus,
        assignee_id: editAssignee || null, due_date: editDueDate || null, start_date: editStartDate || null, tags: editTags,
      }).eq('id', task.id);
      if (error) throw error;
      setTask({ ...task, title: editTitle, description: editDesc, priority: editPriority, status: editStatus, assignee_id: editAssignee || undefined, due_date: editDueDate || undefined, start_date: editStartDate || undefined, tags: editTags });
      setEditMode(false);
      onChange();
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const deleteTask = async () => {
    if (!confirm(t.task.deleteConfirm)) return;
    await supabase.from('tasks').delete().eq('id', task.id);
    onChange();
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => setEditTags(editTags.filter(t => t !== tag));

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (isLeader) {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
      setTask({ ...task, status: newStatus });
      onChange();
    }
  };

  const completedChecks = checklists.filter(c => c.completed).length;
  const totalTime = (task.total_time_spent || 0) + (activeTimer === task.id ? elapsed : 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-card border border-border rounded-lg shadow-2xl mt-8 fade-up">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            {editMode ? (
              <div className="flex-1 space-y-3">
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-lg font-semibold" />
                <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} />
                <div className="grid grid-cols-3 gap-2">
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as TaskStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{(t.statuses as any)[s]}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={editPriority} onValueChange={(v) => setEditPriority(v as TaskPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{(t.priorities as any)[p]}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={editAssignee} onValueChange={setEditAssignee}>
                    <SelectTrigger><SelectValue placeholder={t.task.nobody} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t.task.nobody}</SelectItem>
                      {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">{t.task.startDate}</Label><Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} /></div>
                  <div><Label className="text-xs">{t.task.dueDate}</Label><Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} /></div>
                </div>
                {/* Tags edit */}
                <div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {editTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {tag}<button onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Tag" size={1} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                    <Button type="button" size="sm" variant="outline" onClick={addTag}>+</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">{task.title}</h2>
                {task.description && <p className="text-sm text-muted-foreground mb-3">{task.description}</p>}
                <div className="flex flex-wrap gap-2 mb-2">
                  {task.tags?.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 ml-4">
              {editMode ? (
                <>
                  <Button size="sm" onClick={saveEdit} disabled={busy}>{t.task.edit}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>{t.task.cancel}</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setEditMode(true)}>{t.task.edit}</Button>
                  <Button size="sm" variant="destructive" onClick={deleteTask}><Trash2 className="w-4 h-4" /></Button>
                </>
              )}
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-2"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Meta */}
          {!editMode && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Flag className="w-3 h-3" />
                <span className={task.priority === 'urgent' ? 'text-red-400' : task.priority === 'high' ? 'text-amber-400' : ''}>{(t.priorities as any)[task.priority]}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{t.task.startDate}: {formatDate(task.start_date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{t.task.dueDate}: {formatDate(task.due_date)}</span>
              </div>
              {assignee && (
                <div className="flex items-center gap-1.5">
                  <Avatar user={assignee} size="xs" />
                  <span>{assignee.full_name}</span>
                </div>
              )}
              {creator && <span>{t.team.tabs.members}: {creator.full_name}</span>}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(totalTime)}</span>
              </div>
              {/* Status selector for leader */}
              {isLeader && (
                <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
                  <SelectTrigger className="h-6 text-xs w-auto"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{(t.statuses as any)[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          {err && <div className="text-sm text-destructive mt-2">{err}</div>}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { id: 'chat' as const, label: t.task.chat, icon: MessageSquare },
            { id: 'checklist' as const, label: `${t.task.checklist} (${completedChecks}/${checklists.length})`, icon: ListChecks },
            { id: 'time' as const, label: t.task.timeTracking, icon: Clock },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
                activeTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 max-h-[50vh] overflow-y-auto">
          {activeTab === 'chat' && (
            <div>
              <div className="space-y-3 mb-4">
                {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t.task.typeMessage}</p>}
                {comments.map(msg => {
                  const sender = members.find(m => m.id === msg.user_id);
                  return (
                    <div key={msg.id} className="flex gap-2.5">
                      <Avatar user={sender || { id: msg.user_id, full_name: '?' }} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium">{sender?.full_name || '?'}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDateTime(msg.created_at)}</span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{renderMentions(msg.content, members)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2">
                <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder={`${t.task.typeMessage} (@username to mention)`} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendComment())} />
                <Button size="sm" onClick={sendComment} disabled={!newComment.trim()}><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div>
              <div className="space-y-2 mb-4">
                {checklists.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t.task.addChecklist}</p>}
                {checklists.map(item => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <Checkbox checked={item.completed} onCheckedChange={() => toggleCheckItem(item)} />
                    <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.content}</span>
                    <button onClick={() => deleteCheckItem(item.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} placeholder={t.task.addChecklist} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCheckItem())} />
                <Button size="sm" onClick={addCheckItem} disabled={!newCheckItem.trim()}><CheckSquare className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {activeTab === 'time' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-mono font-semibold">{formatDuration(totalTime)}</div>
                  <div className="text-xs text-muted-foreground">{t.task.timeSpent}</div>
                </div>
                {activeTimer === task.id ? (
                  <Button onClick={stopTimer} disabled={busy} variant="destructive"><Square className="w-4 h-4 mr-1" />{t.task.stopTimer}</Button>
                ) : (
                  <Button onClick={startTimer} disabled={busy}><Play className="w-4 h-4 mr-1" />{t.task.startTimer}</Button>
                )}
              </div>
              {activeTimer === task.id && (
                <div className="text-center py-2 mb-4 bg-primary/5 rounded-md">
                  <span className="text-lg font-mono text-primary">{formatDuration(elapsed)}</span>
                </div>
              )}
              <div className="space-y-1">
                {timeEntries.filter(te => te.task_id === task.id).map(te => {
                  const user = members.find(m => m.id === te.user_id);
                  return (
                    <div key={te.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <Avatar user={user || { id: te.user_id, full_name: '?' }} size="xs" />
                        <span>{user?.full_name}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {formatDateTime(te.started_at)} — {te.duration ? formatDuration(te.duration) : 'Running...'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderMentions(content: string, members: TeamMember[]) {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.slice(1);
      const member = members.find(m => m.username === username);
      return (
        <span key={i} className={`font-semibold ${member ? 'text-primary' : ''}`}>
          {part}
        </span>
      );
    }
    return part;
  });
}
