import { NextResponse } from "next/server"
import { Resend } from "resend"
import { baseTemplate } from "@/lib/email/templates"

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key')

export async function POST(req: Request) {
  try {
    const { quarter, employeeIds } = await req.json()
    
    const content = `
      <h2>📅 Check-in Window is Now Open</h2>
      <p>The <strong>${quarter || 'Q1'}</strong> performance check-in window is officially open.</p>
      <p>Please log in to the Equilibrium portal to submit your actual achievements against your locked targets.</p>
      <p><em>Ensure all data is submitted before the window closes.</em></p>
    `
    const html = baseTemplate(content, 'https://equilibrium.com/employee/achievements', 'Submit My Progress →')
    
    // In real app, loop or batch send to employeeIds
    await resend.emails.send({
      from: 'Equilibrium <notifications@equilibrium.com>',
      to: 'employees@example.com', // bulk mock
      subject: `📅 ${quarter || 'Q1'} Check-in Window is Now Open`,
      html
    })

    return NextResponse.json({ success: true })
  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
