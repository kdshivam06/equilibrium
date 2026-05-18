-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'manager', 'admin')),
  department TEXT NOT NULL,
  manager_id UUID REFERENCES public.users(id),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GOAL CYCLES TABLE
CREATE TABLE public.goal_cycles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  year INTEGER NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN 
    ('goal_setting','q1','q2','q3','q4')),
  phase_label TEXT NOT NULL,
  window_open DATE NOT NULL,
  window_close DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GOALS TABLE
CREATE TABLE public.goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.goal_cycles(id),
  thrust_area TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  uom_type TEXT NOT NULL CHECK (uom_type IN 
    ('min_numeric','max_numeric','min_percent',
     'max_percent','timeline','zero')),
  target NUMERIC,
  target_date DATE,
  weightage NUMERIC NOT NULL CHECK (weightage >= 10),
  status TEXT DEFAULT 'draft' CHECK (status IN 
    ('draft','submitted','approved','rework')),
  is_locked BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  shared_from_goal_id UUID REFERENCES public.goals(id),
  primary_owner_id UUID REFERENCES public.users(id),
  rework_reason TEXT,
  manager_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACHIEVEMENTS TABLE
CREATE TABLE public.achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.goal_cycles(id),
  quarter TEXT NOT NULL CHECK (quarter IN ('q1','q2','q3','q4')),
  actual NUMERIC,
  actual_date DATE,
  progress_status TEXT DEFAULT 'not_started' CHECK (progress_status IN 
    ('not_started','on_track','completed')),
  computed_score NUMERIC,
  employee_notes TEXT,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_id, quarter)
);

-- CHECKINS TABLE
CREATE TABLE public.checkins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.users(id),
  quarter TEXT NOT NULL,
  comment TEXT NOT NULL,
  rating TEXT CHECK (rating IN ('below','meets','exceeds')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_id, quarter)
);

-- AUDIT LOGS TABLE
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  goal_id UUID REFERENCES public.goals(id),
  user_id UUID REFERENCES public.users(id),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ESCALATION RULES TABLE
CREATE TABLE public.escalation_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rule_type TEXT NOT NULL CHECK (rule_type IN 
    ('goal_not_submitted','goal_not_approved','checkin_not_done')),
  rule_label TEXT NOT NULL,
  days_threshold INTEGER NOT NULL DEFAULT 7,
  level2_after_days INTEGER NOT NULL DEFAULT 2,
  level3_after_days INTEGER NOT NULL DEFAULT 4,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ESCALATION EVENTS TABLE
CREATE TABLE public.escalation_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rule_id UUID REFERENCES public.escalation_rules(id),
  user_id UUID REFERENCES public.users(id),
  goal_id UUID REFERENCES public.goals(id),
  current_level INTEGER DEFAULT 1,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  last_notified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (simplified for hackathon - authenticated users see data 
-- based on role stored in users table)
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Authenticated can read users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Employees see own goals" ON public.goals
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Managers see team goals" ON public.goals
  FOR ALL USING (
    employee_id IN (
      SELECT u.id FROM public.users u
      JOIN public.users m ON u.manager_id = m.id
      WHERE m.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins see all goals" ON public.goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Same admin policies for other tables
CREATE POLICY "All authenticated read cycles" ON public.goal_cycles
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY "Admins manage cycles" ON public.goal_cycles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated manage achievements" ON public.achievements
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated manage checkins" ON public.checkins
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated manage audit logs" ON public.audit_logs
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read escalation rules" ON public.escalation_rules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage escalation rules" ON public.escalation_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated manage escalation events" ON public.escalation_events
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated manage notifications" ON public.notifications
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- SEED DATA
-- First create auth users via Supabase dashboard, then run:

INSERT INTO public.goal_cycles 
  (year, phase, phase_label, window_open, window_close, is_active)
VALUES
  (2025,'goal_setting','Goal Setting — FY2025',
   '2025-05-01','2025-06-30', true),
  (2025,'q1','Q1 Check-in — July 2025',
   '2025-07-01','2025-07-31', false),
  (2025,'q2','Q2 Check-in — October 2025',
   '2025-10-01','2025-10-31', false),
  (2025,'q3','Q3 Check-in — January 2026',
   '2026-01-01','2026-01-31', false),
  (2025,'q4','Q4 Annual — March 2026',
   '2026-03-01','2026-04-30', false);

INSERT INTO public.escalation_rules 
  (rule_type, rule_label, days_threshold, level2_after_days, level3_after_days)
VALUES
  ('goal_not_submitted', 'Goals Not Submitted After Cycle Opens', 7, 2, 4),
  ('goal_not_approved', 'Goals Pending Approval Too Long', 5, 2, 3),
  ('checkin_not_done', 'Quarterly Check-in Overdue', 10, 3, 5);
