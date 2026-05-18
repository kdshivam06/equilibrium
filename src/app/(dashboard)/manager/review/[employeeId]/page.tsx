"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"

export default function GoalReviewPage() {
  const { user, loading: userLoading } = useCurrentUser()
  const router = useRouter()
  const params = useParams()
  const employeeId = params.employeeId as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [employee, setEmployee] = useState<any>(null)
  const [goals, setGoals] = useState<any[]>([])
  
  // Modals
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [reworkDialogOpen, setReworkDialogOpen] = useState(false)
  const [reworkReason, setReworkReason] = useState("")

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<'target' | 'weightage' | null>(null)
  const [editValue, setEditValue] = useState("")

  useEffect(() => {
    if (!user || !employeeId) return
    fetchData()
  }, [user, employeeId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: cycleData } = await supabase.from("goal_cycles").select("*").eq("phase", "goal_setting").single()
      if (!cycleData) throw new Error("No active cycle")

      const { data: empData } = await supabase.from("users").select("*").eq("id", employeeId).single()
      setEmployee(empData)

      const { data: goalsData } = await supabase.from("goals").select("*").eq("employee_id", employeeId).eq("cycle_id", cycleData.id).order("created_at", { ascending: true })
      setGoals(goalsData || [])
    } catch (err: any) {
      toast.error("Failed to load: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInlineEditSave = async (goalId: string) => {
    if (!editingId || !editField) return
    
    const goal = goals.find(g => g.id === goalId)
    const dbField = editField === "target" && goal.uom_type === "timeline" ? "target_date" : editField
    const oldVal = goal[dbField]
    const newVal = editValue

    if (oldVal?.toString() === newVal) {
      setEditingId(null); setEditField(null); return
    }

    try {
      const { error } = await supabase.from("goals").update({ [dbField]: editField === "weightage" ? Number(newVal) : newVal }).eq("id", goalId)
      if (error) throw error

      // Audit log
      await supabase.from("audit_logs").insert({
        goal_id: goalId,
        user_id: user?.id,
        user_name: (user as any)?.name || (user as any)?.full_name,
        user_role: user?.role,
        action: "update",
        entity_type: "goal",
        field_changed: dbField,
        old_value: oldVal?.toString(),
        new_value: newVal
      })

      // Update state locally & show edited badge
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, [dbField]: editField === "weightage" ? Number(newVal) : newVal, _edited: true } : g))
      toast.success("Saved successfully")
    } catch (err: any) {
      toast.error("Failed to update: " + err.message)
    } finally {
      setEditingId(null)
      setEditField(null)
    }
  }

  const handleApproveAll = async () => {
    const total = goals.reduce((sum, g) => sum + Number(g.weightage || 0), 0)
    if (total !== 100) {
      toast.error(`Total weightage must equal 100% before approval (currently ${total}%)`)
      return
    }
    if (goals.some(g => Number(g.weightage) < 10)) {
      toast.error("Each goal must have at least 10% weightage")
      return
    }

    setSubmitting(true)
    try {
      const updates = goals.map(g => ({
        id: g.id,
        status: 'approved',
        is_locked: true,
        updated_at: new Date().toISOString()
      }))
      
      const { error } = await supabase.from('goals').upsert(updates)
      if (error) throw error

      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        user_name: (user as any)?.name || (user as any)?.full_name,
        user_role: user?.role,
        action: "goals_approved",
        entity_type: "employee_cycle",
        field_changed: "status",
        old_value: "submitted",
        new_value: `Approved all goals for ${employee?.name}`
      })

      toast.success("Goals approved and locked successfully!")
      router.push("/manager")
    } catch (err: any) {
      toast.error("Failed to approve: " + err.message)
    } finally {
      setSubmitting(false)
      setApproveDialogOpen(false)
    }
  }

  const handleReturnForRework = async () => {
    if (reworkReason.length < 20) {
      toast.error("Please provide a more detailed reason (min 20 characters)")
      return
    }
    setSubmitting(true)
    try {
      const updates = goals.map(g => ({
        id: g.id,
        status: 'rework',
        rework_reason: reworkReason,
        updated_at: new Date().toISOString()
      }))
      
      const { error } = await supabase.from('goals').upsert(updates)
      if (error) throw error

      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        user_name: (user as any)?.name || (user as any)?.full_name,
        user_role: user?.role,
        action: "goals_rework",
        entity_type: "employee_cycle",
        field_changed: "status",
        old_value: "submitted",
        new_value: `Returned for rework. Reason: ${reworkReason}`
      })

      toast.success("Goals returned to employee for rework")
      router.push("/manager")
    } catch (err: any) {
      toast.error("Failed to return for rework: " + err.message)
    } finally {
      setSubmitting(false)
      setReworkDialogOpen(false)
    }
  }

  if (userLoading || loading) return <div className="flex justify-center p-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  const totalWeightage = goals.reduce((sum, g) => sum + Number(g.weightage), 0)
  const isPerfect = totalWeightage === 100
  const submittedGoals = goals.filter(g => g.status === 'submitted' || g.status === 'approved' || g.status === 'rework')
  const submittedAt = submittedGoals.length > 0 ? new Date(Math.max(...submittedGoals.map(g => new Date(g.updated_at).getTime()))) : null

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8 pb-32 pt-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-outline-variant pb-8">
        <div>
          <button 
            onClick={() => router.push("/manager")} 
            className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 font-label text-xs uppercase tracking-widest mb-4"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Return to Overview
          </button>
          <div className="flex items-center gap-6 mt-2">
            <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center text-3xl font-headline font-bold border-2 border-outline-variant text-primary shadow-[0_0_15px_rgba(255,45,120,0.2)]">
              {employee?.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-4xl font-headline font-black text-on-surface tracking-tight">{employee?.name}</h1>
              <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">hub</span> {employee?.department} 
                <span className="mx-2 opacity-50">|</span> 
                <span className="material-symbols-outlined text-[14px]">update</span> Submitted: {submittedAt ? format(submittedAt, 'MMM d, yyyy') : 'Unknown'}
              </p>
            </div>
            
            <div className={cn(
              "ml-4 text-xs font-label uppercase tracking-widest px-3 py-1.5 rounded flex items-center gap-2 border", 
              isPerfect ? "text-secondary border-secondary/30 bg-secondary/10 neon-text-secondary" : "text-tertiary border-tertiary/30 bg-tertiary/10"
            )}>
              Total Weightage: {totalWeightage}% {isPerfect ? "✓" : "⚠"}
            </div>
          </div>
        </div>

        {goals.some(g => g.status === 'submitted') && (
          <div className="flex gap-4">
            <button 
              className="border border-error text-error hover:bg-error/10 px-4 py-2 rounded font-label text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-colors" 
              onClick={() => setReworkDialogOpen(true)}
            >
              <span className="material-symbols-outlined text-[16px]">undo</span> Return for Rework
            </button>
            <button 
              className="bg-secondary text-on-secondary px-6 py-2 rounded font-label text-xs uppercase tracking-widest font-bold flex items-center gap-2 hover:brightness-110 neon-glow transition-all" 
              onClick={() => setApproveDialogOpen(true)}
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span> Approve All Goals
            </button>
          </div>
        )}
      </div>

      {/* Goal Cards */}
      <div className="space-y-8">
        {goals.map((goal, i) => (
          <article key={goal.id} className="bg-surface-container-low border border-outline-variant rounded-xl shadow-lg relative overflow-hidden group hover:border-primary/50 transition-colors">
            
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/70 group-hover:bg-primary group-hover:shadow-[0_0_12px_rgba(255,45,120,0.8)] transition-all"></div>
            
            <div className="p-6 md:p-8 pl-10 md:pl-10">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-surface-container text-on-surface-variant text-[10px] font-label uppercase tracking-widest px-2 py-1 rounded border border-outline-variant">
                  {goal.thrust_area}
                </span>
                <span className="bg-surface-dim text-on-surface-variant text-[10px] font-label uppercase tracking-widest px-2 py-1 rounded border border-outline-variant/50">
                  {goal.uom_type.replace('_', ' ')}
                </span>
                {goal._edited && (
                  <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-label uppercase tracking-widest px-2 py-1 rounded ml-auto flex items-center gap-1 neon-text-primary">
                    <span className="material-symbols-outlined text-[12px]">edit</span> Edited
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-headline font-bold text-on-surface mb-3 flex items-start gap-3">
                <span className="text-primary/50 text-lg mt-1 block w-10">#0{i + 1}</span> {goal.title}
              </h3>
              
              {goal.description && <p className="text-on-surface-variant text-sm font-body mb-8 ml-12 border-l border-outline-variant/30 pl-4 py-1">{goal.description}</p>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-surface-container-highest/30 rounded-xl border border-outline-variant/50">
                
                {/* Target Inline Edit */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-on-surface-variant uppercase tracking-widest font-label flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">flag</span> Target
                  </p>
                  {editingId === goal.id && editField === 'target' ? (
                    <input 
                      type={goal.uom_type === 'timeline' ? 'date' : 'text'}
                      autoFocus
                      defaultValue={goal.target || goal.target_date || ''}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => handleInlineEditSave(goal.id)}
                      onKeyDown={e => e.key === 'Enter' && handleInlineEditSave(goal.id)}
                      className="h-10 bg-surface-dim border border-primary text-on-surface px-3 rounded focus:outline-none focus:ring-1 focus:ring-primary font-headline text-lg"
                    />
                  ) : (
                    <div 
                      className="font-headline font-bold text-xl text-on-surface flex items-center group/edit cursor-pointer hover:text-primary hover:bg-primary/10 px-2 -mx-2 rounded transition-colors h-10"
                      onClick={() => { setEditingId(goal.id); setEditField('target'); setEditValue(goal.target?.toString() || goal.target_date?.toString() || "") }}
                    >
                      {goal.uom_type === 'timeline' && goal.target_date ? format(new Date(goal.target_date), 'MMM d, yyyy') : goal.target || 0}
                      <span className="material-symbols-outlined text-[14px] ml-2 opacity-0 group-hover/edit:opacity-100">edit</span>
                    </div>
                  )}
                </div>

                {/* Weightage Inline Edit */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-on-surface-variant uppercase tracking-widest font-label flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">scale</span> Weightage
                  </p>
                  {editingId === goal.id && editField === 'weightage' ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        autoFocus
                        defaultValue={goal.weightage}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => handleInlineEditSave(goal.id)}
                        onKeyDown={e => e.key === 'Enter' && handleInlineEditSave(goal.id)}
                        className="h-10 w-24 bg-surface-dim border border-primary text-on-surface px-3 rounded focus:outline-none focus:ring-1 focus:ring-primary font-headline text-lg"
                      />
                      <span className="text-on-surface-variant">%</span>
                    </div>
                  ) : (
                    <div 
                      className="font-headline font-bold text-xl text-primary neon-text-primary flex items-center group/edit cursor-pointer hover:bg-primary/10 px-2 -mx-2 rounded transition-colors h-10"
                      onClick={() => { setEditingId(goal.id); setEditField('weightage'); setEditValue(goal.weightage?.toString() || "") }}
                    >
                      {goal.weightage}%
                      <span className="material-symbols-outlined text-[14px] ml-2 opacity-0 group-hover/edit:opacity-100">edit</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs text-on-surface-variant uppercase tracking-widest font-label flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">info</span> Status
                  </p>
                  <div className="h-10 flex items-center">
                    <span className="bg-surface-container border border-outline-variant px-3 py-1 text-xs font-label uppercase tracking-widest rounded text-on-surface">
                      {goal.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Manager Notes */}
              <div className="mt-8">
                <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">visibility_off</span> Manager Notes (Private)
                </p>
                <textarea 
                  placeholder="Add notes for this goal..." 
                  defaultValue={goal.manager_notes || ""}
                  onBlur={async (e) => {
                    const val = e.target.value
                    if (val !== goal.manager_notes) {
                       await supabase.from('goals').update({ manager_notes: val }).eq('id', goal.id)
                       toast.success("Notes saved")
                    }
                  }}
                  className="w-full bg-surface-dim border border-outline-variant rounded p-3 text-sm text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[80px]"
                />
              </div>

            </div>
          </article>
        ))}
      </div>

      {/* Modals */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="bg-surface-container border-outline-variant sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-on-surface text-xl">Approve Goal Subroutine?</DialogTitle>
            <DialogDescription className="text-on-surface-variant font-body pt-2">
              Approve {goals.length} goals for {employee?.name}? Once approved, goals will be locked. Only admin can override them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <button className="px-4 py-2 font-label text-sm uppercase text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setApproveDialogOpen(false)}>Abort</button>
            <button onClick={handleApproveAll} disabled={submitting} className="px-6 py-2 bg-secondary text-on-secondary font-label font-bold text-sm uppercase tracking-widest rounded flex items-center gap-2 hover:brightness-110 neon-glow">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Authorize"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reworkDialogOpen} onOpenChange={setReworkDialogOpen}>
        <DialogContent className="bg-surface-container border-outline-variant sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-error text-xl">Initiate Rework Protocol</DialogTitle>
            <DialogDescription className="text-on-surface-variant font-body pt-2">
              Please provide clear instructions on what needs to be changed. Minimum 20 characters required.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <textarea 
              value={reworkReason}
              onChange={e => setReworkReason(e.target.value)}
              placeholder="e.g. Please increase the Revenue target to ₹60L and reduce Digital Transformation weightage to 10%"
              className="w-full bg-surface-dim border border-outline-variant rounded p-3 text-sm text-on-surface focus:outline-none focus:border-error focus:ring-1 focus:ring-error min-h-[120px]"
            />
          </div>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <button className="px-4 py-2 font-label text-sm uppercase text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setReworkDialogOpen(false)}>Cancel</button>
            <button onClick={handleReturnForRework} disabled={submitting || reworkReason.length < 20} className="px-6 py-2 bg-error text-on-error font-label font-bold text-sm uppercase tracking-widest rounded flex items-center gap-2 hover:brightness-110 transition-colors disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Transmit to User"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
