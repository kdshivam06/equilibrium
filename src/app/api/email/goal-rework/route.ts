import { NextResponse } from "next/server"
import { Resend } from "resend"
import { baseTemplate } from "@/lib/email/templates"

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key')

export async function POST(req: Request) {
  try {
    const { employeeId, managerName, reason } = await req.json()
    
    const content = `
      <h2>⚠ Your goals need revision</h2>
      <p><strong>${managerName || 'Your manager'}</strong> has requested revisions to your submitted goals.</p>
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; color: #b45309;"><strong>Manager's Note:</strong></p>
        <p style="margin: 8px 0 0 0; color: #92400e;">${reason || 'Please review and adjust your targets.'}</p>
      </div>
      <p>Please update your goals and resubmit them for approval.</p>
    `
    const html = baseTemplate(content, 'https://equilibrium.com/employee/goals', 'Edit My Goals →')
    
    await resend.emails.send({
      from: 'Equilibrium <notifications@equilibrium.com>',
      to: 'employee@example.com',
      subject: `⚠ Your goals need revision — please update`,
      html
    })

    return NextResponse.json({ success: true })
  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
