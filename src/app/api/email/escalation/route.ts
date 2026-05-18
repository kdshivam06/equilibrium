import { NextResponse } from "next/server"
import { Resend } from "resend"
import { baseTemplate } from "@/lib/email/templates"

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key')

export async function POST(req: Request) {
  try {
    const { userId, level, ruleType, daysOverdue } = await req.json()
    
    const content = `
      <h2>🚨 Action Overdue</h2>
      <p>This is an automated escalation alert regarding <strong>${ruleType}</strong>.</p>
      <p>The required action is currently <strong>${daysOverdue} days overdue</strong>.</p>
      <p>This event has been escalated to <strong>Level ${level}</strong>. Please address this immediately.</p>
    `
    const html = baseTemplate(content, 'https://equilibrium.com', 'Resolve Issue →')
    
    await resend.emails.send({
      from: 'Equilibrium <escalations@equilibrium.com>',
      to: 'manager@example.com',
      subject: `🚨 Equilibrium: Action Overdue — ${ruleType}`,
      html
    })

    return NextResponse.json({ success: true })
  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
