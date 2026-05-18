"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import Papa from "papaparse"

export default function AdminGoals() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  const [unlockGoalId, setUnlockGoalId] = useState<string | null>(null)
  const [unlockReason, setUnlockReason] = useState("")
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [sourceGoalId, setSourceGoalId] = useState("")
  const [recipientIds, setRecipientIds] = useState<string[]>([])
  const [shareWeightage, setShareWeightage] = useState(10)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: gData }, { data: uData }] = await Promise.all([
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("id, name, department, role")
    ])
    setGoals(gData || [])
    setUsers(uData || [])
    setLoading(false)
  }

  const handleExportCSV = () => {
    const rows = filteredGoals.map(g => {
      const u = getUser(g.employee_id)
      return {
        Employee: u.name,
        Department: u.department,
        GoalTitle: g.title,
        ThrustArea: g.thrust_area,
        UoM: g.uom_type,
        Target: g.target ?? g.target_date ?? "",
        Weightage: g.weightage,
        Status: g.status,
        Locked: g.is_locked ? "Yes" : "No",
        Shared: g.is_shared ? "Yes" : "No"
      }
    })
    const blob = new Blob([Papa.unparse(rows)], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "Equilibrium_All_Goals.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleRecipientToggle = (id: string) => {
    setRecipientIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handlePushSharedGoal = async () => {
    const source = goals.find(g => g.id === sourceGoalId)
    if (!source) {
      toast.error("Select a source KPI first")
      return
    }
    if (recipientIds.length === 0) {
      toast.error("Select at least one recipient")
      return
    }
    if (shareWeightage < 10) {
      toast.error("Shared goal weightage must be at least 10%")
      return
    }

    try {
      const rows = recipientIds
        .filter(id => id !== source.employee_id)
        .map(employeeId => ({
          employee_id: employeeId,
          cycle_id: source.cycle_id,
          thrust_area: source.thrust_area,
          title: source.title,
          description: source.description,
          uom_type: source.uom_type,
          target: source.target,
          target_date: source.target_date,
          weightage: shareWeightage,
          status: "draft",
          is_locked: false,
          is_shared: true,
          shared_from_goal_id: source.id,
          primary_owner_id: source.employee_id
        }))

      if (rows.length === 0) {
        toast.error("Recipients cannot contain only the primary owner")
        return
      }

      const { error } = await supabase.from("goals").insert(rows)
      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      const { data: uData } = await supabase.from("users").select("id, name, role").eq("auth_id", user?.id).single()

      await supabase.from("audit_logs").insert({
        goal_id: source.id,
        user_id: uData?.id,
        user_name: uData?.name || "Admin",
        user_role: uData?.role || "admin",
        action: "shared_goal_pushed",
        entity_type: "goal",
        field_changed: "recipients",
        old_value: "none",
        new_value: `${rows.length} linked goal sheets`
      })

      toast.success(`Shared KPI pushed to ${rows.length} employee goal sheet(s)`)
      setShareDialogOpen(false)
      setSourceGoalId("")
      setRecipientIds([])
      fetchData()
    } catch(e:any) {
      toast.error(e.message)
    }
  }

  const handleUnlock = async () => {
    if (!unlockReason || !unlockGoalId) return
    try {
      await supabase.from("goals").update({ is_locked: false, status: 'rework' }).eq("id", unlockGoalId)
      
      const { data: { user } } = await supabase.auth.getUser()
      const { data: uData } = await supabase.from("users").select("id, name, role").eq("auth_id", user?.id).single()

      await supabase.from("audit_logs").insert({
        goal_id: unlockGoalId,
        user_id: uData?.id,
        user_name: uData?.name,
        user_role: uData?.role,
        action: "admin_unlock",
        entity_type: "goal",
        field_changed: "is_locked",
        old_value: "true",
        new_value: `Unlocked. Reason: ${unlockReason}`
      })
      toast.success("Goal unlocked. Employee can now edit.")
      setUnlockGoalId(null)
      setUnlockReason("")
      fetchData()
    } catch(e:any) {
      toast.error(e.message)
    }
  }

  const getUser = (id: string) => users.find(u => u.id === id) || {}

  const filteredGoals = goals.filter(g => {
    const u = getUser(g.employee_id)
    return g.title.toLowerCase().includes(searchTerm.toLowerCase()) || (u.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) return <div className="p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-32 pt-20">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8">
        <div>
          <span className="font-label text-primary uppercase tracking-[0.3em] text-[10px] font-bold mb-2 block">System Matrix / Objects</span>
          <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight">All Goals Oversight</h1>
        </div>
        <div className="flex gap-3">
        <button onClick={() => setShareDialogOpen(true)} className="bg-secondary text-on-secondary hover:brightness-110 px-4 py-2 rounded font-label text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-colors">
          <span className="material-symbols-outlined text-[16px]">share</span> Push Shared KPI
        </button>
        <button onClick={handleExportCSV} className="border border-outline-variant text-on-surface hover:bg-surface-container-high px-4 py-2 rounded font-label text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-colors">
          <span className="material-symbols-outlined text-[16px]">download</span> Export All Goals (CSV)
        </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative">
          <span className="material-symbols-outlined text-[16px] absolute left-3 top-3.5 text-on-surface-variant">search</span>
          <input 
            placeholder="Search by name or title..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-80 pl-9 py-3 bg-surface-dim border border-outline-variant text-sm text-on-surface focus:outline-none focus:border-primary rounded" 
          />
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-container-low text-on-surface-variant">
              <tr>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Employee</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Department</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Goal Title</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">UoM</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Weightage</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Status</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Locked</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {filteredGoals.map(g => {
                const u = getUser(g.employee_id)
                return (
                  <tr key={g.id} className="text-on-surface hover:bg-surface-container-highest/20 transition-colors">
                    <td className="p-4 font-semibold">{u.name}</td>
                    <td className="p-4 text-on-surface-variant">{u.department}</td>
                    <td className="p-4 truncate max-w-[250px] font-body">{g.title}</td>
                    <td className="p-4">
                      <span className="bg-surface-dim border border-outline-variant px-2 py-1 text-[10px] font-label uppercase tracking-widest rounded text-on-surface-variant inline-block">
                        {g.uom_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 font-headline font-bold text-primary">{g.weightage}%</td>
                    <td className="p-4">
                      <span className="bg-surface-dim border border-outline-variant px-2 py-1 text-[10px] font-label uppercase tracking-widest rounded text-on-surface inline-block">
                        {g.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-label uppercase tracking-widest text-on-surface-variant">
                      {g.is_locked ? <span className="text-secondary flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">lock</span> Yes</span> : <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">lock_open</span> No</span>}
                    </td>
                    <td className="p-4">
                      {g.is_locked && (
                        <button 
                          onClick={() => setUnlockGoalId(g.id)} 
                          className="bg-error/10 text-error hover:bg-error/20 border border-error/30 px-3 py-1.5 rounded text-[10px] font-label uppercase tracking-widest font-bold flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">key</span> Unlock
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!unlockGoalId} onOpenChange={(v) => !v && setUnlockGoalId(null)}>
        <DialogContent className="bg-surface-container border-outline-variant sm:max-w-md">
          <DialogHeader><DialogTitle className="font-headline text-error text-xl">Unlock Goal Subroutine</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Reason for override (required):</label>
            <textarea 
              value={unlockReason} 
              onChange={e => setUnlockReason(e.target.value)} 
              className="w-full bg-surface-dim border border-outline-variant min-h-[100px] p-3 rounded text-sm text-on-surface focus:outline-none focus:border-error focus:ring-1 focus:ring-error" 
              placeholder="e.g., Requested by HR for exceptional revision" 
            />
          </div>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <button className="px-4 py-2 font-label text-sm uppercase text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setUnlockGoalId(null)}>Cancel</button>
            <button onClick={handleUnlock} disabled={!unlockReason} className="px-6 py-2 bg-error text-on-error font-label font-bold text-sm uppercase tracking-widest rounded hover:brightness-110 disabled:opacity-50 transition-colors">
              Confirm Unlock
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="bg-surface-container border-outline-variant sm:max-w-2xl">
          <DialogHeader><DialogTitle className="font-headline text-secondary text-xl">Push Departmental Shared KPI</DialogTitle></DialogHeader>
          <div className="space-y-5 mt-4">
            <div>
              <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Source goal / primary owner</label>
              <select value={sourceGoalId} onChange={e => setSourceGoalId(e.target.value)} className="mt-2 w-full bg-surface-dim border border-outline-variant p-3 rounded text-sm text-on-surface focus:outline-none focus:border-secondary">
                <option value="">Select KPI to share</option>
                {goals.map(g => {
                  const u = getUser(g.employee_id)
                  return <option key={g.id} value={g.id}>{g.title} — {u.name || "Unknown"}</option>
                })}
              </select>
              <p className="text-xs text-on-surface-variant mt-2">Recipients receive the goal title, target, UoM, and thrust area as read-only fields. They can adjust only weightage before submission.</p>
            </div>

            <div>
              <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Default recipient weightage</label>
              <input type="number" min={10} value={shareWeightage} onChange={e => setShareWeightage(Number(e.target.value))} className="mt-2 w-32 bg-surface-dim border border-outline-variant p-3 rounded text-sm text-on-surface focus:outline-none focus:border-secondary" />
            </div>

            <div>
              <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Recipients</label>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {users.filter(u => u.role === "employee").map(u => (
                  <label key={u.id} className="flex items-center gap-3 bg-surface-dim border border-outline-variant rounded p-3 text-sm text-on-surface cursor-pointer hover:border-secondary">
                    <input type="checkbox" checked={recipientIds.includes(u.id)} onChange={() => handleRecipientToggle(u.id)} />
                    <span>{u.name} <span className="text-on-surface-variant">({u.department})</span></span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <button className="px-4 py-2 font-label text-sm uppercase text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setShareDialogOpen(false)}>Cancel</button>
            <button onClick={handlePushSharedGoal} className="px-6 py-2 bg-secondary text-on-secondary font-label font-bold text-sm uppercase tracking-widest rounded hover:brightness-110 transition-colors">
              Push KPI
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
