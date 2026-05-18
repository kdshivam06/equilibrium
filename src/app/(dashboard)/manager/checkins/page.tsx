"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { calculateScore } from "@/lib/utils/scoreCalculator"

export default function ManagerCheckinsPage() {
  const { user, loading: userLoading } = useCurrentUser()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [activeCycle, setActiveCycle] = useState<any>(null)
  
  // States for actual values being edited
  const [actuals, setActuals] = useState<Record<string, string>>({})
  
  // States for checkin forms
  const [checkins, setCheckins] = useState<Record<string, { rating: string, comment: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  // Detect active quarter
  const [activeQuarter, setActiveQuarter] = useState<string>("q1")

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Find active Q-cycle, fallback to goal_setting cycle for goal data
      const { data: allCycles } = await supabase.from("goal_cycles").select("*")
      const qCycle = allCycles?.find(c => c.is_active && c.phase.startsWith('q'))
      const goalCycle = allCycles?.find(c => c.phase === 'goal_setting')
      
      const quarter = qCycle?.phase || 'q1'
      setActiveQuarter(quarter)
      setActiveCycle(qCycle || goalCycle)

      const cycleId = goalCycle?.id
      if (!cycleId) return

      const { data: teamData } = await supabase.from("users").select("*").eq("manager_id", user?.id)
      
      if (teamData) {
        const empIds = teamData.map(e => e.id)
        
        const goalsRes = await supabase.from("goals").select("*").in("employee_id", empIds).eq("cycle_id", cycleId).in("status", ["approved"])
        const goalsList = goalsRes.data || []
        const goalIds = goalsList.map(g => g.id)
        
        const [achievementsRes, checkinsRes] = await Promise.all([
          goalIds.length > 0 ? supabase.from("achievements").select("*").in("goal_id", goalIds).eq("quarter", quarter) : { data: [] },
          supabase.from("checkins").select("*").eq("manager_id", user?.id).eq("quarter", quarter)
        ])

        const achievementsList = (achievementsRes as any).data || []
        const checkinsList = (checkinsRes as any).data || []

        const enrichedTeam = teamData.map(emp => {
          const empGoals = goalsList.filter(g => g.employee_id === emp.id).map(g => {
            const achievement = achievementsList.find((a: any) => a.goal_id === g.id)
            const checkin = checkinsList.find((c: any) => c.goal_id === g.id)
            return { ...g, achievement, checkin }
          })
          return { ...emp, goals: empGoals }
        })

        setTeamMembers(enrichedTeam)
        
        const initialActuals: any = {}
        const initialCheckins: any = {}
        enrichedTeam.forEach(emp => {
          emp.goals.forEach((g: any) => {
            if (g.achievement?.actual !== undefined) initialActuals[g.id] = g.achievement.actual
            if (g.checkin) {
              initialCheckins[g.id] = { rating: g.checkin.rating, comment: g.checkin.comment }
            }
          })
        })
        setActuals(initialActuals)
        setCheckins(initialCheckins)
      }
    } catch (err: any) {
      toast.error("Failed to load: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCheckin = async (goalId: string, employeeId: string) => {
    setSavingId(goalId)
    try {
      const actualVal = actuals[goalId]
      const form = checkins[goalId] || { rating: 'meets', comment: '' }

      // 1. Upsert Achievement
      if (actualVal !== undefined && actualVal !== "") {
        const goal = teamMembers.flatMap(member => member.goals).find((g: any) => g.id === goalId)
        const score = goal ? calculateScore(goal, actualVal, new Date()) : null
        await supabase.from("achievements").upsert({
          goal_id: goalId,
          cycle_id: activeCycle?.id,
          quarter: activeQuarter,
          actual: Number(actualVal),
          actual_date: new Date().toISOString(),
          progress_status: score !== null && score >= 100 ? "completed" : "on_track",
          computed_score: score,
          updated_at: new Date().toISOString()
        }, { onConflict: 'goal_id,quarter' })
      }

      // 2. Upsert Checkin
      if (form.comment || form.rating) {
        await supabase.from("checkins").upsert({
          goal_id: goalId,
          manager_id: user?.id,
          quarter: activeQuarter,
          rating: form.rating,
          comment: form.comment
        }, { onConflict: 'goal_id,quarter' })
      }

      toast.success("Check-in saved successfully")
    } catch (err: any) {
      toast.error("Failed to save checkin: " + err.message)
    } finally {
      setSavingId(null)
    }
  }

  if (userLoading || loading) return <div className="flex justify-center p-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  const doneCount = teamMembers.filter(m => m.goals.some((g: any) => g.checkin)).length
  const totalCount = teamMembers.length

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8 pb-32 pt-20">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-on-surface flex items-center gap-3">
            {activeQuarter.toUpperCase()} Check-ins 
            <span className="bg-secondary/10 text-secondary border border-secondary/30 px-2 py-1 text-xs uppercase tracking-widest rounded neon-glow neon-border-secondary">Active</span>
          </h1>
          <p className="text-on-surface-variant font-body mt-2">Document performance discussions and actuals for your team</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">{activeQuarter.toUpperCase()} Check-in: {doneCount}/{totalCount} done</p>
          <div className="w-48 h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-secondary transition-all shadow-[0_0_8px_#00ffcc]" style={{ width: `${(doneCount/Math.max(1, totalCount))*100}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden glass-panel">
        <Accordion className="w-full" defaultValue={[]}>
          {teamMembers.map(member => (
            <AccordionItem value={member.id} key={member.id} className="border-outline-variant">
              <AccordionTrigger className="px-6 py-4 hover:bg-surface-container-highest/30 hover:no-underline data-[state=open]:bg-surface-container-highest/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-sm font-headline font-bold border border-outline-variant text-primary">
                    {member.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="font-headline font-semibold text-on-surface">{member.name}</p>
                    <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">{member.department} • {member.goals.length} Goals</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-4 border-t border-outline-variant bg-surface-container/20">
                {member.goals.length === 0 ? (
                  <p className="text-on-surface-variant font-label uppercase tracking-widest text-center py-8">No approved goals found for this cycle.</p>
                ) : (
                  <div className="space-y-8">
                    {member.goals.map((goal: any) => (
                      <div key={goal.id} className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden group hover:border-primary/50 transition-colors">
                        
                        <div className="p-4 bg-surface-container-highest/30 border-b border-outline-variant flex flex-col md:flex-row justify-between md:items-center gap-4">
                          <div>
                            <h4 className="font-headline font-semibold text-on-surface">{goal.title}</h4>
                            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mt-1">Target: {goal.target || goal.target_date}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Actual ({activeQuarter.toUpperCase()}):</label>
                            <input 
                              type="text"
                              className="w-24 h-9 bg-surface-dim border border-outline-variant rounded px-2 text-on-surface text-sm focus:border-primary focus:outline-none focus:ring-0" 
                              placeholder="Value"
                              value={actuals[goal.id] || ""}
                              onChange={e => setActuals(prev => ({ ...prev, [goal.id]: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                          
                          {/* Checkin Form */}
                          <div className="space-y-4">
                            <h5 className="text-xs font-label uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px]">comment</span> Structured Check-in Comment
                            </h5>
                            
                            <RadioGroup 
                              value={checkins[goal.id]?.rating || 'meets'} 
                              onValueChange={(val) => setCheckins(prev => ({ ...prev, [goal.id]: { ...prev[goal.id], rating: val } }))}
                              className="flex gap-4 flex-wrap"
                            >
                              <div className="flex items-center space-x-2 bg-surface-dim px-3 py-2 rounded border border-outline-variant cursor-pointer has-[:checked]:border-error has-[:checked]:text-error has-[:checked]:bg-error/10 transition-colors">
                                <RadioGroupItem value="below" id={`below-${goal.id}`} />
                                <label htmlFor={`below-${goal.id}`} className="cursor-pointer font-label text-xs uppercase tracking-widest text-inherit">Below Target ⬇</label>
                              </div>
                              <div className="flex items-center space-x-2 bg-surface-dim px-3 py-2 rounded border border-outline-variant cursor-pointer has-[:checked]:border-secondary has-[:checked]:text-secondary has-[:checked]:bg-secondary/10 transition-colors">
                                <RadioGroupItem value="meets" id={`meets-${goal.id}`} />
                                <label htmlFor={`meets-${goal.id}`} className="cursor-pointer font-label text-xs uppercase tracking-widest text-inherit">Meets Target ✓</label>
                              </div>
                              <div className="flex items-center space-x-2 bg-surface-dim px-3 py-2 rounded border border-outline-variant cursor-pointer has-[:checked]:border-primary has-[:checked]:text-primary has-[:checked]:bg-primary/10 transition-colors">
                                <RadioGroupItem value="exceeds" id={`exceeds-${goal.id}`} />
                                <label htmlFor={`exceeds-${goal.id}`} className="cursor-pointer font-label text-xs uppercase tracking-widest text-inherit">Exceeds Target ⬆</label>
                              </div>
                            </RadioGroup>

                            <textarea 
                              placeholder="Document your check-in discussion..." 
                              value={checkins[goal.id]?.comment || ""}
                              onChange={e => setCheckins(prev => ({ ...prev, [goal.id]: { ...prev[goal.id], comment: e.target.value } }))}
                              className="bg-surface-dim border border-outline-variant rounded p-3 text-sm text-on-surface-variant w-full min-h-[100px] focus:border-primary focus:outline-none"
                            />

                            <button 
                              onClick={() => handleSaveCheckin(goal.id, member.id)} 
                              disabled={savingId === goal.id}
                              className="bg-primary text-on-primary hover:brightness-110 px-4 py-2 w-full rounded font-label text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all neon-glow"
                            >
                              {savingId === goal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="material-symbols-outlined text-[16px]">save</span>}
                              Save Check-in
                            </button>
                          </div>

                          {/* Timeline */}
                          <div className="bg-surface-dim p-5 rounded-lg border border-outline-variant">
                            <h5 className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px]">history</span> Timeline History
                            </h5>
                            
                            {goal.checkin ? (
                              <div className="relative pl-4 border-l-2 border-outline-variant">
                                <div className="absolute w-2.5 h-2.5 bg-secondary rounded-full -left-[6px] top-1 shadow-[0_0_8px_#00ffcc]" />
                                <p className="text-xs font-label uppercase tracking-widest text-secondary mb-2">{activeQuarter.toUpperCase()} Check-in • {format(new Date(goal.checkin.created_at), 'MMM d, yyyy')}</p>
                                <span className="bg-surface-container border border-outline-variant px-2 py-1 text-[10px] font-label uppercase tracking-widest rounded text-on-surface-variant inline-block mb-3">Rating: {goal.checkin.rating}</span>
                                <p className="text-sm font-body text-on-surface bg-surface-container-high/50 p-3 rounded border border-outline-variant">{goal.checkin.comment}</p>
                              </div>
                            ) : (
                              <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest italic opacity-50">No check-ins recorded yet.</p>
                            )}
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

    </div>
  )
}
