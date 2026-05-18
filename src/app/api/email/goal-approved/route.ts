import { NextResponse } from "next/server"
import { Resend } from "resend"
import { baseTemplate } from "@/lib/email/templates"

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key')

export async function POST(req: Request) {
  try {
    const { employeeId, managerName } = await req.json()
    
    const content = `
      <h2>✅ Your goals have been approved!</h2>
      <p>Your goals for FY2025 have been reviewed and approved by <strong>${managerName || 'your manager'}</strong>.</p>
      <p>They are now locked and Q1 check-in starts in July. You can track your progress in your dashboard.</p>
    `
    const html = baseTemplate(content, 'https://equilibrium.com/employee/achievements', 'View My Goals →')
    
    await resend.emails.send({
      from: 'Equilibrium <notifications@equilibrium.com>',
      to: 'employee@example.com',
      subject: `✅ Your goals have been approved!`,
      html
    })

    return NextResponse.json({ success: true })
  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
