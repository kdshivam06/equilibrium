import { NextResponse } from "next/server"
import { Resend } from "resend"
import { baseTemplate } from "@/lib/email/templates"

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key')

export async function POST(req: Request) {
  try {
    const { employeeId, managerId, goalCount, employeeName, submittedDate } = await req.json()
    
    const content = `
      <h2>Goals Submitted for Review</h2>
      <p><strong>${employeeName || 'A team member'}</strong> has submitted <strong>${goalCount} goals</strong> on ${submittedDate || new Date().toLocaleDateString()}.</p>
      <p>Please review and approve these goals to unlock their tracking dashboard.</p>
    `
    const html = baseTemplate(content, 'https://equilibrium.com/manager', 'Review Goals →')
    
    await resend.emails.send({
      from: 'Equilibrium <notifications@equilibrium.com>',
      to: 'manager@example.com',
      subject: `Action Required: ${employeeName || 'Employee'} submitted goals for review`,
      html
    })

    return NextResponse.json({ success: true })
  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
