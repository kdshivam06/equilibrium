"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const THRUST_AREAS = [
  "Revenue Growth", "Cost Optimisation", "Customer Experience", 
  "People & Culture", "Digital Transformation", "Safety & Compliance", 
  "Quality", "Innovation"
]

const UOM_TYPES = [
  { value: "min_numeric", label: "Min Numeric", tooltip: "Higher achievement = better (e.g. Revenue, Units sold)" },
  { value: "max_numeric", label: "Max Numeric", tooltip: "Lower achievement = better (e.g. Cost, TAT, Defects)" },
  { value: "min_percent", label: "Min %", tooltip: "Higher % = better (e.g. NPS score, Attendance %)" },
  { value: "max_percent", label: "Max %", tooltip: "Lower % = better (e.g. Error rate, Attrition %)" },
  { value: "timeline", label: "Timeline", tooltip: "Completion by a specific date (e.g. Project delivery)" },
  { value: "zero", label: "Zero-based", tooltip: "Success = achieving zero (e.g. Safety incidents, Violations)" }
]

export default function GoalsPage() {
  const { user, loading: userLoading } = useCurrentUser()
  const supabase = createClient()

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cycle, setCycle] = useState<any>(null)
  const [goals, setGoals] = useState<any[]>([])
  const [viewMode, setViewMode] = useState(false)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)

  // Initialization
  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Get active cycle
      const { data: cycleData, error: cycleError } = await supabase
        .from("goal_cycles")
        .select("*")
        .eq("phase", "goal_setting")
        .single()

      if (cycleError && cycleError.code !== 'PGRST116') throw cycleError
      if (!cycleData) {
        toast.error("No active goal setting cycle found")
        setLoading(false)
        return
      }
      setCycle(cycleData)

      // 2. Get goals
      const { data: goalsData, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .eq("employee_id", user?.id)
        .eq("cycle_id", cycleData.id)
        .order("created_at", { ascending: true })

      if (goalsError) throw goalsError

      if (goalsData && goalsData.length > 0) {
        // Map to state
        const formattedGoals = goalsData.map(g => ({
          ...g,
          id: g.id,
          target: g.target?.toString() || "",
          target_date: g.target_date ? new Date(g.target_date) : undefined
        }))
        setGoals(formattedGoals)
        
        // If any goal is submitted or approved, switch to view mode
        const isReadOnly = goalsData.some(g => g.status === 'submitted' || g.status === 'approved')
        setViewMode(isReadOnly)
      } else {
        // Start with 1 empty goal
        handleAddGoal()
      }
    } catch (err: any) {
      toast.error("Failed to load goals: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddGoal = () => {
    if (goals.length >= 8) {
      toast.error("Maximum 8 goals allowed")
      return
    }
    setGoals(prev => [
      ...prev,
      {
        id: `temp_${Date.now()}`,
        employee_id: user?.id,
        cycle_id: cycle?.id,
        thrust_area: "",
        title: "",
        description: "",
        uom_type: "min_numeric",
        target: "",
        target_date: undefined,
        weightage: 10,
        status: "draft",
        is_shared: false,
        is_locked: false
      }
    ])
  }

  const handleRemoveGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const handleUpdateGoal = (id: string, field: string, value: any) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g))
  }

  const handleWeightageChange = (id: string, delta: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const newW = Math.max(10, Math.min(100, Number(g.weightage) + delta))
        return { ...g, weightage: newW }
      }
      return g
    }))
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      const formattedGoals = goals.map(g => {
        const dbGoal: any = {
          employee_id: user?.id,
          cycle_id: cycle?.id,
          thrust_area: g.thrust_area,
          title: g.title,
          description: g.description || null,
          uom_type: g.uom_type,
          weightage: Number(g.weightage),
          status: "draft"
        }
        if (!g.id.startsWith("temp_")) dbGoal.id = g.id
        
        if (g.uom_type === 'timeline') {
          dbGoal.target_date = g.target_date ? format(g.target_date, 'yyyy-MM-dd') : null
          dbGoal.target = null
        } else if (g.uom_type === 'zero') {
          dbGoal.target = 0
          dbGoal.target_date = null
        } else {
          dbGoal.target = g.target ? Number(g.target) : null
          dbGoal.target_date = null
        }
        return dbGoal
      })

      const { error } = await supabase.from('goals').upsert(formattedGoals, { onConflict: 'id' })
      if (error) throw error
      
      toast.success("Draft saved successfully")
      fetchData() // Refresh to get real IDs
    } catch (err: any) {
      toast.error("Failed to save draft: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const validateGoals = () => {
    if (goals.length === 0) {
      toast.error("Add at least 1 goal before submitting")
      return false
    }
    if (goals.length > 8) {
      toast.error("Maximum 8 goals allowed")
      return false
    }
    
    let totalWeightage = 0
    
    for (let i = 0; i < goals.length; i++) {
      const g = goals[i]
      if (!g.title.trim()) {
        toast.error(`Goal ${i + 1} is missing a title`)
        return false
      }
      if (!g.thrust_area) {
        toast.error(`Goal ${i + 1} is missing a thrust area`)
        return false
      }
      if (g.weightage < 10) {
        toast.error(`Goal ${i + 1} weightage cannot be less than 10%`)
        return false
      }
      
      if (g.uom_type === 'timeline' && !g.target_date) {
        toast.error(`Goal ${i + 1} is missing a target date`)
        return false
      } else if (g.uom_type !== 'timeline' && g.uom_type !== 'zero' && !g.target) {
        toast.error(`Goal ${i + 1} is missing a target value`)
        return false
      }

      totalWeightage += Number(g.weightage)
    }

    if (totalWeightage !== 100) {
      toast.error(`Total weightage must equal exactly 100% (currently at ${totalWeightage}%)`)
      return false
    }

    return true
  }

  const handleSubmitClick = () => {
    if (validateGoals()) {
      setSubmitDialogOpen(true)
    }
  }

  const handleConfirmSubmit = async () => {
    setSubmitting(true)
    setSubmitDialogOpen(false)
    try {
      const formattedGoals = goals.map(g => {
        const dbGoal: any = {
          employee_id: user?.id,
          cycle_id: cycle?.id,
          thrust_area: g.thrust_area,
          title: g.title,
          description: g.description || null,
          uom_type: g.uom_type,
          weightage: Number(g.weightage),
          status: "submitted",
          updated_at: new Date().toISOString()
        }
        if (!g.id.startsWith("temp_")) dbGoal.id = g.id
        
        if (g.uom_type === 'timeline') {
          dbGoal.target_date = g.target_date ? format(g.target_date, 'yyyy-MM-dd') : null
          dbGoal.target = null
        } else if (g.uom_type === 'zero') {
          dbGoal.target = 0
          dbGoal.target_date = null
        } else {
          dbGoal.target = g.target ? Number(g.target) : null
          dbGoal.target_date = null
        }
        return dbGoal
      })

      const { error } = await supabase.from('goals').upsert(formattedGoals, { onConflict: 'id' })
      if (error) throw error
      
      toast.success("Goals submitted successfully! Your manager will review them shortly.")
      fetchData() // will switch to view mode
    } catch (err: any) {
      toast.error("Failed to submit goals: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (userLoading || loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  if (!cycle) return <div className="p-24 text-center font-label">No active goal setting cycle found.</div>

  const totalAllocated = goals.reduce((sum, g) => sum + Number(g.weightage || 0), 0)
  const isPerfect = totalAllocated === 100
  const isOver = totalAllocated > 100
  const hasRework = goals.some(g => g.status === "rework")
  const isGoalWindowOpen = Boolean(cycle?.is_active || hasRework)

  return (
    <div className="flex-1 flex flex-col pb-24 md:pb-20 pt-16 scanline-bg relative min-h-screen">
      
      {/* Page Header & Sticky Tracking Bar */}
      <header className="bg-surface-container-low border-b border-outline-variant/20 sticky top-16 z-40 px-6 py-4 shadow-lg flex flex-col gap-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="font-headline text-2xl font-bold text-on-surface flex items-center gap-3">
            My Goal Sheet — FY {cycle.year}
          </h1>
          <div className="flex items-center gap-2 bg-surface-container py-1.5 px-3 rounded-full border border-secondary/30 neon-border-secondary text-secondary text-sm font-label uppercase tracking-wider">
            <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_#00ffcc]"></div>
            <span>{cycle.phase_label} {isGoalWindowOpen ? "Window Open" : "Window Closed"} • Closes {new Date(cycle.window_close).toLocaleDateString()}</span>
          </div>
        </div>
        
        {/* Massive Weightage Tracker */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="w-full h-6 bg-surface-container-highest rounded-full overflow-hidden flex shadow-inner">
            <div 
              className={cn(
                "h-full relative flex items-center justify-end pr-3 transition-all duration-500",
                isPerfect ? "bg-gradient-to-r from-secondary-fixed to-secondary-container" : 
                isOver ? "bg-gradient-to-r from-error to-[#ff4c83]" : 
                "bg-gradient-to-r from-tertiary to-[#ff8c00]"
              )}
              style={{ width: `${Math.min(100, totalAllocated)}%` }}
            >
              <span className="text-surface-lowest font-headline font-bold text-xs">{totalAllocated}%</span>
            </div>
            <div className="h-full bg-inverse-on-surface flex-1 flex items-center justify-center border-l border-outline/30 relative">
              <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiPjxsaW5lIHgxPSIwIiB5MT0iNDAiIHgyPSI0MCIgeTI9IjAiLz48L2c+PC9zdmc+')" }}></div>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs font-label text-on-surface-variant tracking-wide">
            <span>{goals.length}/8 Goals Configured</span>
            {!isPerfect && !isOver && <span className="text-tertiary neon-text-tertiary">{100 - totalAllocated}% Weightage Budget Remaining</span>}
            {isPerfect && <span className="text-secondary neon-text-secondary">Optimal Distribution Achieved (100%)</span>}
            {isOver && <span className="text-error font-bold">Exceeded 100% maximum!</span>}
          </div>
        </div>
      </header>

      {/* Main Content Canvas - Grid Layout */}
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min">
        
        {goals.map((goal, index) => (
          <article 
            key={goal.id} 
            className={cn(
              "bg-surface-container rounded-xl border flex flex-col overflow-hidden relative transition-colors duration-300",
              goal.is_shared ? "border-secondary/30 hover:border-secondary/70" : "border-outline-variant/30 hover:border-primary/50 group"
            )}
          >
            {/* Color Accent Bar */}
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1.5 transition-shadow",
              goal.is_shared ? "bg-secondary" : "bg-primary group-hover:shadow-[0_0_12px_rgba(255,45,120,0.8)]"
            )}></div>

            {/* Status / Shared Header */}
            {(goal.is_shared || viewMode) && (
              <div className="bg-surface-container-highest px-5 py-3 border-b border-outline-variant/30 flex items-center justify-between pl-7">
                <div className="flex items-center gap-2">
                  {goal.is_shared && <span className="material-symbols-outlined text-[14px] text-secondary">push_pin</span>}
                  <span className={cn(
                    "font-label text-xs uppercase tracking-wider font-semibold",
                    goal.status === 'submitted' ? "text-tertiary" :
                    goal.status === 'approved' ? "text-secondary" :
                    goal.status === 'rework' ? "text-error" :
                    goal.is_shared ? "text-secondary" : "text-on-surface"
                  )}>
                    {goal.is_shared ? "Assigned KPI" : ""}
                    {!goal.is_shared && goal.status === 'submitted' && "Pending Review"}
                    {!goal.is_shared && goal.status === 'approved' && "Approved"}
                    {!goal.is_shared && goal.status === 'rework' && "Needs Rework"}
                  </span>
                </div>
              </div>
            )}

            <div className={cn("p-5 flex flex-col gap-5 pl-7 h-full", viewMode && "opacity-80")}>
              
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 w-full max-w-[85%]">
                  <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                    Thrust Area {(goal.is_shared || viewMode) && <span className="material-symbols-outlined text-[14px]">lock</span>}
                  </label>
                  {goal.is_shared || viewMode ? (
                    <div className="text-on-surface font-body text-sm py-2 border-b border-outline-variant/50">{goal.thrust_area || "—"}</div>
                  ) : (
                    <select 
                      value={goal.thrust_area}
                      onChange={(e) => handleUpdateGoal(goal.id, 'thrust_area', e.target.value)}
                      className="bg-surface-dim border-b border-outline-variant text-on-surface font-body text-sm py-2 px-1 focus:outline-none focus:border-primary focus:ring-0 w-full appearance-none"
                    >
                      <option value="" disabled>Select Area</option>
                      {THRUST_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  )}
                </div>
                {!viewMode && isGoalWindowOpen && !goal.is_shared && goals.length > 1 && (
                  <button onClick={() => handleRemoveGoal(goal.id)} className="text-outline hover:text-error transition-colors p-1" title="Delete Goal">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                  Goal Title {(goal.is_shared || viewMode) && <span className="material-symbols-outlined text-[14px]">lock</span>}
                </label>
                {goal.is_shared || viewMode ? (
                  <div className="bg-surface-dim border border-outline-variant/50 rounded p-3 text-on-surface-variant font-headline font-bold min-h-[50px]">{goal.title || "—"}</div>
                ) : (
                  <input 
                    type="text" 
                    value={goal.title}
                    onChange={(e) => handleUpdateGoal(goal.id, 'title', e.target.value)}
                    placeholder="Enter objective title..."
                    className="bg-surface border border-outline-variant rounded p-3 text-on-surface font-headline font-bold focus:border-primary focus:ring-1 focus:ring-primary w-full outline-none transition-all" 
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                  Details & Metrics {(goal.is_shared || viewMode) && <span className="material-symbols-outlined text-[14px]">lock</span>}
                </label>
                {goal.is_shared || viewMode ? (
                  <div className="bg-surface border border-outline-variant/30 rounded p-3 text-on-surface-variant font-body text-sm min-h-[76px] whitespace-pre-wrap">{goal.description || "—"}</div>
                ) : (
                  <textarea 
                    value={goal.description}
                    onChange={(e) => handleUpdateGoal(goal.id, 'description', e.target.value)}
                    placeholder="Execution details..."
                    className="bg-surface border border-outline-variant rounded p-3 text-on-surface-variant font-body text-sm focus:border-primary focus:ring-1 focus:ring-primary w-full outline-none transition-all resize-none" 
                    rows={3}
                  />
                )}
              </div>

              {/* Rework reason if applicable */}
              {goal.status === 'rework' && goal.rework_reason && (
                <div className="mt-2 p-3 bg-error-container/20 border border-error/50 rounded">
                  <p className="font-label text-[10px] text-error uppercase tracking-widest mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">feedback</span> Manager Feedback</p>
                  <p className="text-sm text-on-surface-variant font-body">{goal.rework_reason}</p>
                </div>
              )}

              <div className="flex items-center gap-4 mt-auto pt-4">
                <div className="flex flex-col gap-1 w-1/3">
                  <label className={cn(
                    "text-xs font-label uppercase tracking-widest flex items-center gap-1",
                    goal.is_shared ? "text-secondary" : "text-on-surface-variant"
                  )}>
                    Weightage {!viewMode && isGoalWindowOpen && <span className="material-symbols-outlined text-[14px]">edit</span>}
                  </label>
                  <div className="relative group flex items-center">
                    {!viewMode && isGoalWindowOpen && (
                      <button type="button" onClick={() => handleWeightageChange(goal.id, -5)} className="absolute left-1 z-10 w-6 h-6 flex items-center justify-center text-outline hover:text-primary">−</button>
                    )}
                    <input 
                      type="number" 
                      readOnly
                      value={goal.weightage}
                      className={cn(
                        "bg-surface-dim border rounded p-2 font-headline font-bold text-lg w-full outline-none text-center transition-all",
                        goal.is_shared ? "border-secondary/50 text-secondary neon-text-secondary neon-border-secondary" : "border-outline-variant text-primary neon-text-primary focus:border-primary focus:ring-0"
                      )} 
                    />
                    <span className={cn("absolute right-3 top-1/2 -translate-y-1/2 font-label", goal.is_shared ? "text-secondary/70" : "text-on-surface-variant")}>%</span>
                    {!viewMode && isGoalWindowOpen && (
                      <button type="button" onClick={() => handleWeightageChange(goal.id, 5)} className="absolute right-1 z-10 w-6 h-6 flex items-center justify-center text-outline hover:text-primary opacity-0 group-hover:opacity-100 bg-surface-dim">+</button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 w-2/3">
                  <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                    Target {(goal.is_shared || viewMode) && <span className="material-symbols-outlined text-[14px]">lock</span>}
                  </label>
                  
                  {goal.is_shared || viewMode ? (
                     <div className="bg-surface-dim border border-outline-variant/50 rounded p-2 text-on-surface-variant font-body text-sm flex items-center h-[46px] px-3">
                       {goal.uom_type === 'timeline' ? (goal.target_date ? format(new Date(goal.target_date), 'MMM d, yyyy') : '—') :
                        goal.uom_type === 'zero' ? '0' :
                        goal.target ? `${goal.target} ${goal.uom_type.includes('percent') ? '%' : ''}` : '—'}
                     </div>
                  ) : (
                    <div className="flex flex-col gap-2 relative">
                      <select 
                        value={goal.uom_type}
                        onChange={(e) => handleUpdateGoal(goal.id, 'uom_type', e.target.value)}
                        className="bg-surface-container-high text-on-surface text-xs font-label border border-outline-variant/50 rounded py-1.5 px-2 w-full focus:border-primary focus:outline-none"
                      >
                        {UOM_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>

                      {goal.uom_type === 'zero' ? (
                        <div className="bg-surface-dim border border-outline-variant rounded p-2 text-on-surface-variant text-sm flex items-center h-[38px] px-3 opacity-50">Target is 0</div>
                      ) : goal.uom_type === 'timeline' ? (
                        <input 
                          type="date"
                          value={goal.target_date ? format(new Date(goal.target_date), 'yyyy-MM-dd') : ''}
                          onChange={(e) => handleUpdateGoal(goal.id, 'target_date', new Date(e.target.value))}
                          className="bg-surface-dim border border-outline-variant rounded p-2 text-on-surface text-sm h-[38px] w-full focus:border-primary focus:outline-none"
                        />
                      ) : (
                        <div className="relative">
                          <input 
                            type="number"
                            value={goal.target}
                            onChange={(e) => handleUpdateGoal(goal.id, 'target', e.target.value)}
                            placeholder="Value"
                            className="bg-surface-dim border border-outline-variant rounded p-2 text-on-surface text-sm h-[38px] w-full focus:border-primary focus:outline-none pr-8"
                          />
                          <span className="absolute right-2 top-2 text-xs text-on-surface-variant font-label">{goal.uom_type.includes('percent') ? '%' : ''}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}

        {/* Add New Action */}
        {!viewMode && isGoalWindowOpen && (
          <button 
            onClick={handleAddGoal}
            disabled={goals.length >= 8}
            className="bg-transparent border-2 border-dashed border-outline-variant hover:border-primary/70 rounded-xl p-8 flex flex-col items-center justify-center gap-4 text-on-surface-variant hover:text-primary transition-all duration-300 group min-h-[350px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 rounded-full bg-surface-container-high group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">add</span>
            </div>
            <span className="font-headline font-bold text-lg group-hover:neon-text-primary">+ Add New Goal</span>
            <span className="font-body text-sm text-center max-w-[200px] opacity-70">Initialize a new objective subroutine.</span>
          </button>
        )}

      </div>

      {viewMode && goals.some(g => g.status === 'rework') && (
        <div className="max-w-[1600px] mx-auto w-full px-6 flex justify-center mt-4">
          <button 
            onClick={() => setViewMode(false)} 
            className="bg-primary/20 border border-primary text-primary font-headline font-bold px-8 py-3 rounded hover:bg-primary hover:text-on-primary transition-colors neon-glow"
          >
            Unlock to Edit Rework Goals
          </button>
        </div>
      )}

      {/* Bottom Action Bar */}
      {!viewMode && (
        <footer className="fixed bottom-0 w-full bg-surface-dim/95 backdrop-blur-md border-t border-outline-variant/30 p-4 flex justify-end gap-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
          <button 
            onClick={handleSaveDraft} 
            disabled={saving || submitting || !isGoalWindowOpen}
            className="px-6 py-2.5 rounded-lg border border-outline hover:bg-surface-container-high text-on-surface font-label font-semibold text-sm transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <span className="material-symbols-outlined text-[18px]">save</span>}
            [💾 Save Draft Layout]
          </button>
          
          <button 
            onClick={handleSubmitClick} 
            disabled={saving || submitting || totalAllocated !== 100 || !isGoalWindowOpen}
            className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-label font-bold text-sm transition-all flex items-center gap-2 border border-primary neon-border-primary neon-glow disabled:opacity-50 disabled:grayscale"
          >
            {submitting ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <span className="material-symbols-outlined text-[18px]">send</span>}
            [📤 Submit Final Sheet for L1 Approval]
          </button>
        </footer>
      )}

      {/* Submit Confirmation Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="bg-surface-container border-outline-variant sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-on-surface text-xl">Confirm System Override</DialogTitle>
            <DialogDescription className="text-on-surface-variant font-body pt-2">
              You are about to lock and submit {goals.length} objectives for Level 1 Manager approval. 
              Further edits will require a manual unlock from the governance layer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between items-center bg-surface-dim border border-outline-variant/50 p-4 rounded my-4">
            <span className="font-label text-xs uppercase text-on-surface-variant">Allocated Weightage</span>
            <span className="font-headline font-bold text-secondary neon-text-secondary">{totalAllocated}%</span>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <button 
              onClick={() => setSubmitDialogOpen(false)}
              className="px-4 py-2 font-label text-sm uppercase text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Abort
            </button>
            <button 
              onClick={handleConfirmSubmit} 
              disabled={submitting}
              className="px-6 py-2 bg-primary text-on-primary font-label font-bold text-sm uppercase tracking-widest rounded flex items-center gap-2 hover:brightness-110 neon-glow"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Subroutine"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
