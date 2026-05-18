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
    // 1. Create auth users
    const usersData = [
      { email: 'admin@equilibrium.com', password: 'Demo@1234', role: 'admin', name: 'Rahul Sharma', dept: 'Human Resources' },
      { email: 'manager@equilibrium.com', password: 'Demo@1234', role: 'manager', name: 'Priya Patel', dept: 'Sales' },
      { email: 'employee@equilibrium.com', password: 'Demo@1234', role: 'employee', name: 'Arjun Kumar', dept: 'Sales' }
    ]

    const authIds: Record<string, string> = {}
    
    for (const u of usersData) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true
      })
      if (error) {
        console.log(`User ${u.email} already exists or error:`, error.message)
        // If user already exists, try to fetch them from public users
        const { data: existingUser } = await supabase.from('users').select('auth_id').eq('email', u.email).single()
        if (existingUser) authIds[u.role] = existingUser.auth_id
      } else {
        authIds[u.role] = data.user.id
      }
    }

    if (!authIds.admin || !authIds.manager || !authIds.employee) {
       return NextResponse.json({ message: 'Failed to create auth users or users already exist. Try deleting them from Supabase first.', authIds })
    }

    // 2. Insert into public.users
    // First admin & manager
    const { data: adminData, error: e1 } = await supabase.from('users').insert({
      auth_id: authIds.admin,
      name: 'Rahul Sharma',
      email: 'admin@equilibrium.com',
      role: 'admin',
      department: 'Human Resources'
    }).select().single()

    const { data: managerData, error: e2 } = await supabase.from('users').insert({
      auth_id: authIds.manager,
      name: 'Priya Patel',
      email: 'manager@equilibrium.com',
      role: 'manager',
      department: 'Sales'
    }).select().single()

    // Then employee (needs manager_id)
    const { data: employeeData, error: e3 } = await supabase.from('users').insert({
      auth_id: authIds.employee,
      name: 'Arjun Kumar',
      email: 'employee@equilibrium.com',
      role: 'employee',
      department: 'Sales',
      manager_id: managerData?.id
    }).select().single()

    if (e1 || e2 || e3) {
      console.error("Error inserting public users:", e1 || e2 || e3)
      // Ignore if they already exist
    }

    // Fetch the cycle
    const { data: cycleData } = await supabase.from('goal_cycles').select('id').eq('phase', 'goal_setting').single()
    const cycleId = cycleData?.id

    if (!cycleId) {
      return NextResponse.json({ error: 'Goal cycle not found. Did you run the SQL seed in Supabase?' }, { status: 400 })
    }

    if (employeeData) {
      // 3. Create 5 goals for Arjun Kumar
      const goalsToInsert = [
        { employee_id: employeeData.id, cycle_id: cycleId, thrust_area: 'Revenue Growth', title: 'Achieve Q1 Sales Target of ₹50L', uom_type: 'min_numeric', target: 5000000, weightage: 30, status: 'approved', is_locked: true },
        { employee_id: employeeData.id, cycle_id: cycleId, thrust_area: 'Customer Experience', title: 'Maintain NPS Score Above 75', uom_type: 'min_numeric', target: 75, weightage: 20, status: 'approved', is_locked: true },
        { employee_id: employeeData.id, cycle_id: cycleId, thrust_area: 'Cost Optimisation', title: 'Reduce Customer Acquisition Cost by 15%', uom_type: 'max_percent', target: 15, weightage: 20, status: 'approved', is_locked: true },
        { employee_id: employeeData.id, cycle_id: cycleId, thrust_area: 'Safety & Compliance', title: 'Zero Compliance Violations', uom_type: 'zero', target: 0, weightage: 15, status: 'approved', is_locked: true },
        { employee_id: employeeData.id, cycle_id: cycleId, thrust_area: 'Digital Transformation', title: 'CRM Migration Completion', uom_type: 'timeline', target_date: '2025-09-30', weightage: 15, status: 'approved', is_locked: true }
      ]

      const { data: insertedGoals, error: e4 } = await supabase.from('goals').insert(goalsToInsert).select()

      if (insertedGoals && insertedGoals.length > 0) {
        // 4. Create Q1 achievements
        const achievementsToInsert = insertedGoals.map((g: any, index: number) => {
          let actual = 0
          let progress_status = 'not_started'
          if (index === 0) { actual = 2000000; progress_status = 'on_track' }
          if (index === 1) { actual = 78; progress_status = 'completed' }
          if (index === 2) { actual = 5; progress_status = 'on_track' }
          if (index === 3) { actual = 0; progress_status = 'completed' }
          if (index === 4) { actual = 0; progress_status = 'on_track' } 

          return {
            goal_id: g.id,
            cycle_id: cycleId,
            quarter: 'q1',
            actual,
            actual_date: '2025-07-15',
            progress_status,
            employee_notes: `Progress update for Q1 on ${g.title}`
          }
        })

        await supabase.from('achievements').insert(achievementsToInsert)

        // 5. Create 2 manager checkin comments
        if (managerData) {
          const checkinsToInsert = [
            { goal_id: insertedGoals[0].id, manager_id: managerData.id, quarter: 'q1', comment: 'Good progress on sales. Keep pushing to reach the 50L mark.', rating: 'meets' },
            { goal_id: insertedGoals[1].id, manager_id: managerData.id, quarter: 'q1', comment: 'Excellent work maintaining the NPS score.', rating: 'exceeds' }
          ]
          await supabase.from('checkins').insert(checkinsToInsert)
        }

        // 6. Create 5 audit logs
        const auditLogs = insertedGoals.map((g: any) => ({
          goal_id: g.id,
          user_id: employeeData.id,
          user_name: employeeData.name,
          user_role: employeeData.role,
          action: 'create',
          entity_type: 'goal',
          new_value: g.title
        }))
        await supabase.from('audit_logs').insert(auditLogs)
      }
    }

    return NextResponse.json({ success: true, message: 'Seed data created successfully!' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
