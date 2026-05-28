export interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_color?: string;
  created_at?: string;
  role?: string;
  joined_at?: string;
}

export interface Team {
  id: string;
  name: string;
  team_code: string;
  description?: string;
  created_by: string;
  created_at?: string;
  my_role?: string;
}

export interface TeamMember {
  id: string;
  full_name: string;
  username: string;
  avatar_color?: string;
  role: string;
  joined_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RepeatType = 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  team_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  created_by: string;
  due_date?: string;
  start_date?: string;
  tags: string[];
  position: number;
  total_time_spent: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  team_id: string;
  content: string;
  completed: boolean;
  position: number;
  created_at?: string;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  team_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
  note?: string;
  created_at?: string;
}

export interface TaskMessage {
  id: string;
  task_id: string;
  team_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  created_at?: string;
  profiles?: Profile;
}

export interface RepeatTask {
  id: string;
  team_id: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  assignee_id?: string;
  created_by: string;
  repeat_type: RepeatType;
  repeat_interval: number;
  repeat_days: number[];
  active: boolean;
  last_generated_at?: string;
  next_run_at?: string;
  due_date_offset: number;
  tags: string[];
  created_at?: string;
}

export interface ApprovalRequest {
  id: string;
  task_id: string;
  team_id: string;
  requested_by: string;
  from_status: TaskStatus;
  to_status: TaskStatus;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  review_message?: string;
  created_at?: string;
  reviewed_at?: string;
  tasks?: { title: string };
  profiles?: Profile;
}

export interface Tag {
  id: string;
  team_id: string;
  name: string;
  color: string;
}
