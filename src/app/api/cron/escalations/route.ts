import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { differenceInDays } from "date-fns"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// Requires service role key to bypass RLS in cron job
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    const today = new Date()

    // 1. Fetch active rules
    const { data: rules } = await supabase.from('escalation_rules').select('*').eq('is_active', true)
    if (!rules) return NextResponse.json({ message: "No active rules" })

    // Fetch dependencies
    const { data: users } = await supabase.from('users').select('*')
    const { data: cycles } = await supabase.from('goal_cycles').select('*').eq('is_active', true)
    const { data: goals } = await supabase.from('goals').select('*')
    
    let processed = 0

    for (const rule of rules) {
      if (rule.rule_type === 'goal_not_submitted') {
        const activeGoalCycle = cycles?.find(c => c.phase === 'goal_setting')
        if (activeGoalCycle) {
          const employees = users?.filter(u => u.role === 'employee') || []
          for (const emp of employees) {
            const hasSubmitted = goals?.some(g => g.employee_id === emp.id && ['submitted', 'approved', 'rework'].includes(g.status))
            if (!hasSubmitted) {
              const daysOverdue = differenceInDays(today, new Date(activeGoalCycle.window_open))
              if (daysOverdue >= rule.days_threshold) {
                await handleEscalation(emp.id, rule, daysOverdue, 'goal_not_submitted')
                processed++
              }
            }
          }
        }
      }
      
      if (rule.rule_type === 'goal_not_approved') {
        const submittedGoals = goals?.filter(g => g.status === 'submitted') || []
        // Group by manager
        for (const goal of submittedGoals) {
          const daysOverdue = differenceInDays(today, new Date(goal.updated_at))
          if (daysOverdue >= rule.days_threshold) {
            const emp = users?.find(u => u.id === goal.employee_id)
            if (emp && emp.manager_id) {
              await handleEscalation(emp.manager_id, rule, daysOverdue, 'goal_not_approved')
              processed++
            }
          }
        }
      }

      if (rule.rule_type === 'checkin_not_done') {
        const activeCheckinCycle = cycles?.find(c => c.phase === 'check_in')
        if (activeCheckinCycle) {
          const { data: checkins } = await supabase.from('checkins').select('*').eq('cycle_id', activeCheckinCycle.id)
          const employees = users?.filter(u => u.role === 'employee') || []
          
          for (const emp of employees) {
            const hasCheckin = checkins?.some(c => c.employee_id === emp.id && ['submitted', 'approved'].includes(c.status))
            if (!hasCheckin) {
              const daysOverdue = differenceInDays(today, new Date(activeCheckinCycle.window_open))
              if (daysOverdue >= rule.days_threshold) {
                await handleEscalation(emp.id, rule, daysOverdue, 'checkin_not_done')
                processed++
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, processed })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handleEscalation(userId: string, rule: any, daysOverdue: number, type: string) {
  // Check if active event exists in escalation_events
  const { data: existing } = await supabase
    .from('escalation_events')
    .select('*')
    .eq('user_id', userId)
    .eq('rule_id', rule.id)
    .eq('is_resolved', false)
    .single()

  let newLevel = 1
  if (existing) {
    if (existing.level === 1 && daysOverdue >= rule.days_threshold + 3) newLevel = 2
    else if (existing.level === 2 && daysOverdue >= rule.days_threshold + 7) newLevel = 3
    else return // No change needed
    
    await supabase.from('escalation_events').update({ 
      level: newLevel, 
      days_overdue: daysOverdue, 
      updated_at: new Date().toISOString() 
    }).eq('id', existing.id)
  } else {
    await supabase.from('escalation_events').insert({
      user_id: userId,
      rule_id: rule.id,
      level: 1,
      days_overdue: daysOverdue,
      is_resolved: false
    })
  }

  // Create notification
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Escalation Alert',
    message: `Action required for: ${type.replace(/_/g, ' ')}. Days overdue: ${daysOverdue}`,
    type: 'escalation_alert',
    is_read: false
  })

  // Trigger email API in background
  fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/escalation`, {
    method: 'POST',
    body: JSON.stringify({ userId, level: newLevel, ruleType: type, daysOverdue })
  }).catch(() => {})
}
