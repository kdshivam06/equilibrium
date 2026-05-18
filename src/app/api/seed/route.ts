import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const usersData = [
      { email: 'admin@equilibrium.com', password: 'Demo@1234', role: 'admin', name: 'Rahul Sharma', department: 'Human Resources' },
      { email: 'manager@equilibrium.com', password: 'Demo@1234', role: 'manager', name: 'Priya Patel', department: 'Sales' },
      { email: 'employee@equilibrium.com', password: 'Demo@1234', role: 'employee', name: 'Arjun Kumar', department: 'Sales' }
    ]

    const authIds: Record<string, string> = {}

    for (const demoUser of usersData) {
      const created = await supabase.auth.admin.createUser({
        email: demoUser.email,
        password: demoUser.password,
        email_confirm: true
      })

      if (created.data.user) {
        authIds[demoUser.role] = created.data.user.id
        continue
      }

      const listed = await supabase.auth.admin.listUsers()
      const existing = listed.data.users.find(user => user.email === demoUser.email)
      if (existing) authIds[demoUser.role] = existing.id
    }

    if (!authIds.admin || !authIds.manager || !authIds.employee) {
      return NextResponse.json({ error: 'Failed to create or find all demo auth users', authIds }, { status: 500 })
    }

    const { data: adminData, error: adminError } = await supabase.from('users').upsert({
      auth_id: authIds.admin,
      name: 'Rahul Sharma',
      email: 'admin@equilibrium.com',
      role: 'admin',
      department: 'Human Resources'
    }, { onConflict: 'email' }).select().single()

    if (adminError) throw adminError

    const { data: managerData, error: managerError } = await supabase.from('users').upsert({
      auth_id: authIds.manager,
      name: 'Priya Patel',
      email: 'manager@equilibrium.com',
      role: 'manager',
      department: 'Sales'
    }, { onConflict: 'email' }).select().single()

    if (managerError) throw managerError

    const { data: employeeData, error: employeeError } = await supabase.from('users').upsert({
      auth_id: authIds.employee,
      name: 'Arjun Kumar',
      email: 'employee@equilibrium.com',
      role: 'employee',
      department: 'Sales',
      manager_id: managerData.id
    }, { onConflict: 'email' }).select().single()

    if (employeeError) throw employeeError

    let { data: cycleData } = await supabase.from('goal_cycles').select('id').eq('phase', 'goal_setting').single()

    if (!cycleData) {
      const { data: insertedCycles, error: cycleError } = await supabase.from('goal_cycles').insert([
        { year: 2025, phase: 'goal_setting', phase_label: 'Goal Setting - FY2025', window_open: '2025-05-01', window_close: '2025-06-30', is_active: true },
        { year: 2025, phase: 'q1', phase_label: 'Q1 Check-in - July 2025', window_open: '2025-07-01', window_close: '2025-07-31', is_active: false },
        { year: 2025, phase: 'q2', phase_label: 'Q2 Check-in - October 2025', window_open: '2025-10-01', window_close: '2025-10-31', is_active: false },
        { year: 2025, phase: 'q3', phase_label: 'Q3 Check-in - January 2026', window_open: '2026-01-01', window_close: '2026-01-31', is_active: false },
        { year: 2025, phase: 'q4', phase_label: 'Q4 Annual - March/April 2026', window_open: '2026-03-01', window_close: '2026-04-30', is_active: false }
      ]).select('id, phase')

      if (cycleError) throw cycleError
      cycleData = insertedCycles?.find(cycle => cycle.phase === 'goal_setting') || null
    }

    const cycleId = cycleData?.id
    if (!cycleId) return NextResponse.json({ error: 'Goal setting cycle could not be prepared' }, { status: 500 })

    const { data: existingGoals } = await supabase
      .from('goals')
      .select('id')
      .eq('employee_id', employeeData.id)
      .eq('cycle_id', cycleId)

    if (existingGoals && existingGoals.length > 0) {
      return NextResponse.json({ success: true, message: 'Demo users already exist. Existing goal data left unchanged.' })
    }

    const goalsToInsert = [
      { employee_id: employeeData.id, cycle_id: cycleId, thrust_area: 'Revenue Growth', title: 'Achieve Q1 Sales Target of INR 50L', uom_type: 'min_numeric', target: 5000000, weightage: 30, status: 'approved', is_locked: true },
      { employee_id: employeeData.id, cycle_id: cycleId, thrust_area: 'Customer Experience', title: 'Maintain NPS Score Above 75', uom_type: 'min_numeric', target: 75, weightage: 20, status: 'approved', is_locked: true },
      { employee_id: employeeData.id, cycle_id: cycleId, thrust_area: 'Cost Optimisation', title: 'Reduce Customer Acquisition Cost by 15%', uom_type: 'max_percent', target: 15, weightage: 20, status: 'approved', is_locked: true },
      { employee_id: employeeData.id, cycle_id: cycleId, thrust_area: 'Safety & Compliance', title: 'Zero Compliance Violations', uom_type: 'zero', target: 0, weightage: 15, status: 'approved', is_locked: true },
      { employee_id: employeeData.id, cycle_id: cycleId, thrust_area: 'Digital Transformation', title: 'CRM Migration Completion', uom_type: 'timeline', target_date: '2025-09-30', weightage: 15, status: 'approved', is_locked: true }
    ]

    const { data: insertedGoals, error: goalError } = await supabase.from('goals').insert(goalsToInsert).select()
    if (goalError) throw goalError

    if (insertedGoals && insertedGoals.length > 0) {
      await supabase.from('achievements').insert(insertedGoals.map((goal: any, index: number) => ({
        goal_id: goal.id,
        cycle_id: cycleId,
        quarter: 'q1',
        actual: [2000000, 78, 5, 0, null][index],
        actual_date: index === 4 ? '2025-09-20' : '2025-07-15',
        progress_status: ['on_track', 'completed', 'on_track', 'completed', 'on_track'][index],
        computed_score: [40, 104, 200, 100, 100][index],
        employee_notes: `Progress update for Q1 on ${goal.title}`,
        submitted_at: new Date().toISOString()
      })))

      await supabase.from('checkins').insert([
        { goal_id: insertedGoals[0].id, manager_id: managerData.id, quarter: 'q1', comment: 'Good progress on sales. Keep pushing to reach the 50L mark.', rating: 'meets' },
        { goal_id: insertedGoals[1].id, manager_id: managerData.id, quarter: 'q1', comment: 'Excellent work maintaining the NPS score.', rating: 'exceeds' }
      ])

      await supabase.from('audit_logs').insert(insertedGoals.map((goal: any) => ({
        goal_id: goal.id,
        user_id: employeeData.id,
        user_name: employeeData.name,
        user_role: employeeData.role,
        action: 'create',
        entity_type: 'goal',
        new_value: goal.title
      })))
    }

    return NextResponse.json({ success: true, message: 'Seed data created successfully!', adminId: adminData.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
