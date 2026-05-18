"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Loader2, CalendarIcon, ArrowRight, Save, Send, Download, Lock, Info } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { calculateScore as computeGoalScore } from "@/lib/utils/scoreCalculator"
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip as RechartsTooltip, YAxis } from "recharts"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function AchievementsPage() {
  const { user, loading: userLoading } = useCurrentUser()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [cycles, setCycles] = useState<any[]>([])
  const [activeCycle, setActiveCycle] = useState<any>(null)
  const [goals, setGoals] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  
  const [selectedQuarter, setSelectedQuarter] = useState<string>("q1")

  // Form State
  const [inputs, setInputs] = useState<Record<string, { actual: number | string; actual_date: Date | null; progress_status: string; employee_notes: string }>>({})

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch all cycles for 2025
      const { data: cyclesData } = await supabase.from("goal_cycles").select("*").eq("year", 2025)
      if (!cyclesData) return
      
      setCycles(cyclesData)
      const currentActive = cyclesData.find(c => c.is_active && c.phase.startsWith('q'))
      setActiveCycle(currentActive)
      
      if (currentActive) {
        setSelectedQuarter(currentActive.phase)
      } else {
        setSelectedQuarter("q1") // fallback
      }

      // Fetch approved goals
      const { data: goalsData } = await supabase.from("goals")
        .select("*")
        .eq("employee_id", user?.id)
        .in("status", ["approved"]) // only approved goals
      
      setGoals(goalsData || [])

      // Fetch all achievements
      if (goalsData && goalsData.length > 0) {
        const { data: achData } = await supabase.from("achievements")
          .select("*")
          .in("goal_id", goalsData.map(g => g.id))
        
        setAchievements(achData || [])
      }

    } catch (err: any) {
      toast.error("Failed to load: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Effect to load inputs when quarter changes
  useEffect(() => {
    if (goals.length > 0) {
      const initialInputs: any = {}
      goals.forEach(g => {
        const ach = achievements.find(a => a.goal_id === g.id && a.quarter === selectedQuarter)
        initialInputs[g.id] = {
          actual: ach?.actual !== null && ach?.actual !== undefined ? ach.actual : "",
          actual_date: ach?.actual_date ? new Date(ach.actual_date) : null,
          progress_status: ach?.progress_status || "not_started",
          employee_notes: ach?.employee_notes || ""
        }
      })
      setInputs(initialInputs)
    }
  }, [selectedQuarter, goals, achievements])

  const calculateScore = (goal: any, actual: number | string, actualDate: Date | null): number | null => {
    return computeGoalScore(goal, actual, actualDate)
  }

  const syncLinkedSharedGoals = async (goal: any, payload: any) => {
    if (goal.is_shared) return

    const { data: linkedGoals } = await supabase
      .from("goals")
      .select("id")
      .eq("shared_from_goal_id", goal.id)

    if (!linkedGoals || linkedGoals.length === 0) return

    const linkedPayloads = linkedGoals.map(linked => ({
      ...payload,
      goal_id: linked.id
    }))

    await supabase.from("achievements").upsert(linkedPayloads, { onConflict: 'goal_id,quarter' })
  }

  const handleSave = async (goalId: string, showToast = true) => {
    const input = inputs[goalId]
    const goal = goals.find(g => g.id === goalId)
    const cycle = cycles.find(c => c.phase === selectedQuarter)

    if (!cycle) return

    const score = calculateScore(goal, input.actual, input.actual_date)

    const payload = {
      goal_id: goalId,
      cycle_id: cycle.id,
      quarter: selectedQuarter,
      actual: input.actual !== "" ? Number(input.actual) : null,
      actual_date: input.actual_date ? input.actual_date.toISOString() : null,
      progress_status: input.progress_status,
      computed_score: score,
      employee_notes: input.employee_notes,
      updated_at: new Date().toISOString()
    }

    try {
      const { error } = await supabase.from("achievements").upsert(payload, { onConflict: 'goal_id,quarter' })
      if (error) throw error
      await syncLinkedSharedGoals(goal, payload)
      
      // Update local achievements state so we don't refetch
      setAchievements(prev => {
        const exists = prev.findIndex(a => a.goal_id === goalId && a.quarter === selectedQuarter)
        if (exists >= 0) {
          const newArr = [...prev]
          newArr[exists] = { ...newArr[exists], ...payload }
          return newArr
        }
        return [...prev, payload]
      })

      if (showToast) toast.success("Progress saved!")
    } catch (err: any) {
      if (showToast) toast.error("Failed to save: " + err.message)
    }
  }

  const handleSubmitAll = async () => {
    try {
      // Save all first
      await Promise.all(goals.map(g => handleSave(g.id, false)))
      
      // Then mark as submitted
      const updates = goals.map(g => {
        const cycle = cycles.find(c => c.phase === selectedQuarter)
        const input = inputs[g.id]
        const score = calculateScore(g, input.actual, input.actual_date)

        return {
          goal_id: g.id,
          cycle_id: cycle?.id,
          quarter: selectedQuarter,
          actual: input.actual !== "" ? Number(input.actual) : null,
          actual_date: input.actual_date ? input.actual_date.toISOString() : null,
          progress_status: input.progress_status,
          computed_score: score,
          employee_notes: input.employee_notes,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })

      const { error } = await supabase.from("achievements").upsert(updates, { onConflict: 'goal_id,quarter' })
      if (error) throw error

      await Promise.all(goals.map((g, index) => syncLinkedSharedGoals(g, updates[index])))

      toast.success(`Successfully submitted achievements for ${goals.length} goals!`)
    } catch (err: any) {
      toast.error("Submit failed: " + err.message)
    }
  }

  if (userLoading || loading) return <div className="flex justify-center p-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  const qCycles = cycles.filter(c => c.phase.startsWith('q')).sort((a, b) => a.phase.localeCompare(b.phase))
  const selectedCycleDef = qCycles.find(c => c.phase === selectedQuarter)
  const isWindowOpen = selectedCycleDef?.is_active

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-slate-500 border-slate-700"
    if (score >= 80) return "text-success border-success"
    if (score >= 50) return "text-warning border-warning"
    return "text-destructive border-destructive"
  }

  // Calculate Overall Weighted Score for current quarter
  let totalWeightedScore = 0
  goals.forEach(g => {
    const ach = achievements.find(a => a.goal_id === g.id && a.quarter === selectedQuarter)
    const score = ach?.computed_score
    if (score !== null && score !== undefined) {
      totalWeightedScore += score * (g.weightage / 100)
    }
  })
  
  // History data for chart
  const historyData = ['q1', 'q2', 'q3', 'q4'].map(q => {
    let qScore = 0
    goals.forEach(g => {
      const ach = achievements.find(a => a.goal_id === g.id && a.quarter === q)
      if (ach?.computed_score) qScore += ach.computed_score * (g.weightage / 100)
    })
    return { name: q.toUpperCase(), score: Math.round(qScore) }
  })

  // Has only 1 data point entered?
  const pointsWithData = historyData.filter(d => d.score > 0).length

  const getLocalScore = (goalId: string, quarter: string) => {
    const ach = achievements.find(a => a.goal_id === goalId && a.quarter === quarter)
    return ach?.computed_score || 0
  }

  const weightedScore = historyData.reduce((acc, curr) => acc + (curr.score * 0.25), 0)

  const handleDownloadPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    
    // Header
    doc.setFontSize(20)
    doc.setTextColor(249, 115, 22) // primary orange
    doc.text("Equilibrium", 14, 20)
    
    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text(`FY2025 Performance Report: ${(user as any)?.name || user?.full_name || ''}`, 14, 30)
    doc.setFontSize(10)
    doc.text(`Department: ${user?.department || 'N/A'}`, 14, 36)
    
    // Goals Table
    doc.setFontSize(12)
    doc.text("Approved Goals:", 14, 46)
    
    const goalsData = goals.map(g => [
      g.title,
      g.thrust_area,
      g.uom_type,
      g.target,
      `${g.weightage}%`
    ])
    
    autoTable(doc, {
      startY: 50,
      head: [['Title', 'Thrust Area', 'UoM', 'Target', 'Weight']],
      body: goalsData,
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22] }
    })
    
    // Achievements Table
    const finalY = (doc as any).lastAutoTable.finalY || 50
    doc.text("Achievements Progress:", 14, finalY + 10)
    
    const achData = goals.map(g => {
      const q1Score = getLocalScore(g.id, 'q1')
      const q2Score = getLocalScore(g.id, 'q2')
      const q3Score = getLocalScore(g.id, 'q3')
      const q4Score = getLocalScore(g.id, 'q4')
      return [
        g.title,
        `${q1Score}%`,
        `${q2Score}%`,
        `${q3Score}%`,
        `${q4Score}%`
      ]
    })
    
    autoTable(doc, {
      startY: finalY + 14,
      head: [['Goal', 'Q1 Score', 'Q2 Score', 'Q3 Score', 'Q4 Score']],
      body: achData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    })
    
    // Footer
    const footerY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(14)
    doc.text(`Overall Weighted Score: ${weightedScore.toFixed(1)}%`, 14, footerY)
    
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10)
    }

    const cleanName = ((user as any)?.name || user?.full_name || 'Employee').replace(/\s+/g, '')
    doc.save(`GoalSheet_${cleanName}_FY2025.pdf`)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-32">
      {/* Banner */}
      {isWindowOpen && selectedCycleDef ? (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
            <span className="text-success font-medium">{selectedCycleDef.phase_label} Open • {format(new Date(selectedCycleDef.window_open), 'MMM d')} – {format(new Date(selectedCycleDef.window_close), 'MMM d, yyyy')}</span>
          </div>
          <div className="text-success font-semibold">
            {differenceInDays(new Date(selectedCycleDef.window_close), new Date())} days remaining
          </div>
        </div>
      ) : selectedCycleDef ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center gap-3">
          <Lock className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 font-medium">{selectedCycleDef?.phase_label} Closed</span>
        </div>
      ) : null}

      <div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Achievement Tracking</h1>
          <p className="text-slate-400">Log your performance scores dynamically against approved targets.</p>
        </div>
        <Button variant="outline" className="border-slate-700 bg-slate-900 mt-4" onClick={handleDownloadPDF}>
          <Download className="w-4 h-4 mr-2 text-primary" /> Download PDF
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column - Main Content */}
        <div className="flex-1 space-y-6">
          <Tabs value={selectedQuarter} onValueChange={setSelectedQuarter} className="w-full">
            <TabsList className="bg-slate-900/50 border border-slate-800 p-1 w-full justify-start h-auto rounded-lg">
              {qCycles.map(c => (
                <TabsTrigger 
                  key={c.phase} 
                  value={c.phase}
                  className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 py-2.5 rounded-md"
                >
                  {c.phase.toUpperCase()}
                  {!c.is_active && c.phase !== selectedQuarter && <Lock className="w-3 h-3 ml-2 text-slate-500" />}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedQuarter} className="mt-6 space-y-6">
              {goals.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/30 rounded-lg border border-slate-800">
                  <p className="text-slate-400">No approved goals found for this cycle.</p>
                </div>
              ) : (
                goals.map(goal => {
                  const input = inputs[goal.id] || {}
                  const score = calculateScore(goal, input.actual, input.actual_date)
                  
                  return (
                    <Card key={goal.id} className="bg-card border-slate-800 shadow-sm relative overflow-hidden">
                      <CardContent className="p-6">
                        
                        {/* Header */}
                        <div className="flex flex-col md:flex-row gap-6 mb-6">
                          <div className="flex-1">
                            <div className="flex gap-2 mb-3">
                              <Badge className="bg-slate-800 text-slate-300 hover:bg-slate-700">{goal.thrust_area}</Badge>
                              <Badge variant="outline" className="text-slate-400 border-slate-700">{goal.uom_type.replace('_', ' ')}</Badge>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{goal.title}</h3>
                            <div className="bg-slate-900/50 border border-slate-800 rounded px-4 py-2 inline-block">
                              <span className="text-slate-400 text-sm font-medium">Planned Target: </span>
                              <span className="text-white font-bold">
                                {goal.uom_type === 'timeline' && goal.target_date ? format(new Date(goal.target_date), 'MMM d, yyyy') : goal.target || '0'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Score Circle */}
                          <div className="shrink-0 flex flex-col items-center justify-center w-32">
                            <div className={cn("w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center mb-2", getScoreColor(score))}>
                              <span className="text-2xl font-bold">{score !== null ? `${score}%` : '--'}</span>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">
                              {score !== null ? (score >= 80 ? "Exceeds Target" : score >= 50 ? "Meets Target" : "Below Target") : "No Data"}
                            </span>
                          </div>
                        </div>

                        {/* Input Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-900/30 p-5 rounded-lg border border-slate-800">
                          
                          <div className="space-y-6">
                            {/* Actual Input */}
                            <div>
                              {goal.uom_type === 'min_numeric' || goal.uom_type === 'max_numeric' ? (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-300">Actual Achievement</label>
                                  <Input 
                                    type="number" 
                                    disabled={!isWindowOpen}
                                    value={input.actual || ""}
                                    onChange={e => setInputs(p => ({ ...p, [goal.id]: { ...p[goal.id], actual: e.target.value } }))}
                                    className="bg-slate-950 border-slate-700" 
                                    placeholder="Enter actual value"
                                  />
                                </div>
                              ) : goal.uom_type === 'min_percent' || goal.uom_type === 'max_percent' ? (
                                <div className="space-y-4">
                                  <label className="text-sm font-medium text-slate-300">Actual Achievement (%)</label>
                                  <div className="flex items-center gap-4">
                                    <Slider 
                                      disabled={!isWindowOpen}
                                      value={[Number(input.actual) || 0]} 
                                      max={200} 
                                      step={1} 
                                      onValueChange={vals => setInputs(p => ({ ...p, [goal.id]: { ...p[goal.id], actual: (vals as number[])[0] } }))}
                                    />
                                    <Input 
                                      type="number" 
                                      disabled={!isWindowOpen}
                                      value={input.actual || ""}
                                      onChange={e => setInputs(p => ({ ...p, [goal.id]: { ...p[goal.id], actual: e.target.value } }))}
                                      className="w-20 bg-slate-950 border-slate-700" 
                                    />
                                  </div>
                                </div>
                              ) : goal.uom_type === 'timeline' ? (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-300">Completion Date</label>
                                  <Popover>
                                    <PopoverTrigger>
                                      <Button
                                        variant="outline"
                                        disabled={!isWindowOpen}
                                        className={cn("w-full justify-start text-left font-normal bg-slate-950 border-slate-700", !input.actual_date && "text-muted-foreground")}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {input.actual_date ? format(input.actual_date, "PPP") : <span>Pick a date</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={input.actual_date || undefined}
                                        onSelect={d => setInputs(p => ({ ...p, [goal.id]: { ...p[goal.id], actual_date: d || null } }))}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  {input.actual_date && goal.target_date && (
                                    <p className={cn("text-xs font-medium mt-2", input.actual_date <= new Date(goal.target_date) ? "text-success" : "text-destructive")}>
                                      {input.actual_date <= new Date(goal.target_date) ? "✓ Completed on or before target" : `⚠ ${differenceInDays(input.actual_date, new Date(goal.target_date))} days late`}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">Actual incidents/violations <Info className="w-4 h-4 text-slate-500" /></label>
                                  <Input 
                                    type="number" 
                                    disabled={!isWindowOpen}
                                    value={input.actual || ""}
                                    onChange={e => setInputs(p => ({ ...p, [goal.id]: { ...p[goal.id], actual: e.target.value } }))}
                                    className="bg-slate-950 border-slate-700" 
                                    placeholder="Enter 0 for full score"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Status Pills */}
                            <div>
                              <label className="text-sm font-medium text-slate-300 mb-2 block">Progress Status</label>
                              <div className="flex gap-2">
                                {['not_started', 'on_track', 'completed'].map(s => (
                                  <Button
                                    key={s}
                                    variant="outline"
                                    size="sm"
                                    disabled={!isWindowOpen}
                                    onClick={() => setInputs(p => ({ ...p, [goal.id]: { ...p[goal.id], progress_status: s } }))}
                                    className={cn(
                                      "capitalize border-slate-700 text-slate-400 bg-slate-900",
                                      input.progress_status === s && s === 'not_started' && "bg-slate-700 text-white border-slate-600",
                                      input.progress_status === s && s === 'on_track' && "bg-blue-600 text-white border-blue-500",
                                      input.progress_status === s && s === 'completed' && "bg-success text-white border-success"
                                    )}
                                  >
                                    {s === 'completed' ? '✅ ' : s === 'on_track' ? '🔵 ' : '⬜ '} {s.replace('_', ' ')}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 flex flex-col">
                            <label className="text-sm font-medium text-slate-300">Employee Notes (Optional)</label>
                            <Textarea 
                              disabled={!isWindowOpen}
                              value={input.employee_notes || ""}
                              onChange={e => setInputs(p => ({ ...p, [goal.id]: { ...p[goal.id], employee_notes: e.target.value } }))}
                              placeholder="Add notes for your manager..."
                              className="bg-slate-950 border-slate-700 resize-none flex-1 min-h-[100px]"
                            />
                            
                            <div className="flex items-center justify-between mt-auto pt-2">
                              <span className="text-xs text-slate-500 italic">
                                {achievements.find(a => a.goal_id === goal.id && a.quarter === selectedQuarter) 
                                  ? `Last saved ${format(new Date(achievements.find(a => a.goal_id === goal.id && a.quarter === selectedQuarter).updated_at), 'HH:mm')}`
                                  : "Not saved yet"
                                }
                              </span>
                              <Button 
                                disabled={!isWindowOpen}
                                onClick={() => handleSave(goal.id)} 
                                className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                              >
                                💾 Save Progress
                              </Button>
                            </div>
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}

              {goals.length > 0 && (
                <div className="bg-card border border-slate-800 p-6 rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
                  <div>
                    <h4 className="text-lg font-bold text-white">Ready for Review?</h4>
                    <p className="text-sm text-slate-400">Submitting achievements for {goals.length} goals</p>
                  </div>
                  <Button 
                    onClick={handleSubmitAll}
                    disabled={!isWindowOpen}
                    className="bg-primary hover:bg-primary/90 text-white px-8"
                  >
                    <Send className="w-4 h-4 mr-2" /> 📤 Submit All Achievements
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <Card className="bg-card border-slate-800">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Overall Weighted Score</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className={cn("text-5xl font-bold tracking-tight", totalWeightedScore >= 80 ? "text-success" : totalWeightedScore >= 50 ? "text-warning" : "text-destructive")}>
                  {totalWeightedScore.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-400">Formula: Σ (score × weightage)</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-slate-800">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">History</h3>
              <div className="grid grid-cols-4 gap-2 text-center text-sm mb-6">
                {historyData.map(d => (
                  <div key={d.name} className="flex flex-col gap-1">
                    <div className="font-semibold text-slate-300">{d.name}</div>
                    <div className={cn("py-1 rounded bg-slate-900/50 border border-slate-800", d.score > 0 ? "text-white" : "text-slate-600")}>
                      {d.score > 0 ? `${d.score}%` : '--'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-32 w-full mt-4">
                {pointsWithData > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData.filter(d => d.score > 0)}>
                      <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: "#f97316" }} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(val: any) => [`${val}%`, 'Score']}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 text-center px-4">Q2 pending<br/>More data needed for trend</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
