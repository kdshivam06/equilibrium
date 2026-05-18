export type Role = 'employee' | 'manager' | 'admin';

export interface User {
  id: string;
  auth_id?: string;
  name: string;
  full_name?: string; // alias for backward compat
  email: string;
  role: Role;
  department?: string | null;
  manager_id?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalCycle {
  id: string;
  year: number;
  phase: 'goal_setting' | 'q1' | 'q2' | 'q3' | 'q4';
  phase_label: string;
  window_open: string;
  window_close: string;
  is_active: boolean;
  created_at: string;
}

export interface Goal {
  id: string;
  employee_id: string;
  cycle_id: string;
  thrust_area: string;
  title: string;
  description?: string | null;
  uom_type: 'min_numeric' | 'max_numeric' | 'min_percent' | 'max_percent' | 'timeline' | 'zero';
  target?: number | null;
  target_date?: string | null;
  weightage: number;
  status: 'draft' | 'submitted' | 'approved' | 'rework';
  is_locked: boolean;
  is_shared: boolean;
  shared_from_goal_id?: string | null;
  primary_owner_id?: string | null;
  rework_reason?: string | null;
  manager_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  goal_id: string;
  cycle_id?: string | null;
  quarter: 'q1' | 'q2' | 'q3' | 'q4';
  actual?: number | null;
  actual_date?: string | null;
  progress_status: 'not_started' | 'on_track' | 'completed';
  computed_score?: number | null;
  employee_notes?: string | null;
  submitted_at?: string | null;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  goal_id: string;
  manager_id: string;
  quarter: string;
  comment: string;
  rating?: 'below' | 'meets' | 'exceeds' | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  goal_id?: string | null;
  user_id?: string | null;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  field_changed?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  ip_address?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface EscalationRule {
  id: string;
  rule_type: 'goal_not_submitted' | 'goal_not_approved' | 'checkin_not_done';
  rule_label: string;
  days_threshold: number;
  level2_after_days: number;
  level3_after_days: number;
  is_active: boolean;
  created_at: string;
}

export interface EscalationEvent {
  id: string;
  rule_id?: string | null;
  user_id?: string | null;
  goal_id?: string | null;
  current_level: number;
  is_resolved: boolean;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
  last_notified_at?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}
