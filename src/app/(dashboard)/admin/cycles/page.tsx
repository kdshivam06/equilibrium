"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function AdminCycles() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [cycles, setCycles] = useState<any[]>([])
  
  // Create Modal
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({ year: new Date().getFullYear(), phase: '', phase_label: '', window_open: '', window_close: '' })

  useEffect(() => {
    fetchCycles()
  }, [])

  const fetchCycles = async () => {
    setLoading(true)
    const { data } = await supabase.from("goal_cycles").select("*").order("year", { ascending: false }).order("window_open", { ascending: true })
    setCycles(data || [])
    setLoading(false)
  }

  const handleToggle = async (id: string, current: boolean) => {
    if (!current) {
      if (!confirm("Activating this will deactivate other active cycles. Continue?")) return
      await supabase.from("goal_cycles").update({ is_active: false }).neq("id", id)
    }
    await supabase.from("goal_cycles").update({ is_active: !current }).eq("id", id)
    fetchCycles()
    toast.success("Cycle status updated")
  }

  const handleCreate = async () => {
    try {
      const { error } = await supabase.from("goal_cycles").insert([formData])
      if (error) throw error
      toast.success("Cycle created")
      setOpen(false)
      fetchCycles()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const activeCycle = cycles.find(c => c.is_active)

  if (loading) return <div className="p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 pb-32 pt-20">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-4">
        <div>
          <span className="font-label text-primary uppercase tracking-[0.3em] text-[10px] font-bold mb-2 block">System Configuration</span>
          <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight">Cycle Management</h1>
        </div>
        <button 
          onClick={() => setOpen(true)} 
          className="bg-primary text-on-primary px-6 py-2.5 rounded font-label text-xs uppercase tracking-widest font-bold flex items-center gap-2 hover:brightness-110 neon-glow transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add</span> Create New Cycle
        </button>
      </div>

      {activeCycle && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4 flex items-center gap-3 w-fit neon-border-secondary">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_8px_#00ffcc] animate-pulse"></span>
          <span className="text-secondary font-label text-xs uppercase tracking-widest font-bold">Currently Active: {activeCycle.phase_label}</span>
        </div>
      )}

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg glass-panel mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-container-low text-on-surface-variant">
              <tr>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Year</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Phase</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Label</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Window Opens</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Window Closes</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Status</th>
                <th className="p-4 font-label uppercase tracking-widest text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {cycles.map(c => (
                <tr key={c.id} className="text-on-surface hover:bg-surface-container-highest/20 transition-colors">
                  <td className="p-4 font-headline font-bold">{c.year}</td>
                  <td className="p-4 uppercase font-label text-primary">{c.phase}</td>
                  <td className="p-4 font-medium">{c.phase_label}</td>
                  <td className="p-4 text-on-surface-variant font-body">{c.window_open}</td>
                  <td className="p-4 text-on-surface-variant font-body">{c.window_close}</td>
                  <td className="p-4">
                    <button 
                      onClick={() => handleToggle(c.id, c.is_active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${c.is_active ? 'bg-secondary' : 'bg-surface-dim border border-outline-variant'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${c.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="p-4">
                    <button className="text-xs font-label uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 border border-outline-variant px-3 py-1.5 rounded">
                      <span className="material-symbols-outlined text-[14px]">edit_calendar</span> Edit Dates
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface-container border-outline-variant text-on-surface">
          <DialogHeader><DialogTitle className="font-headline text-xl">Create New Cycle Subroutine</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Year</label>
              <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} className="mt-1 w-full bg-surface-dim border border-outline-variant p-2 rounded text-sm text-on-surface focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Phase (e.g. q1, q2)</label>
              <input value={formData.phase} onChange={e => setFormData({...formData, phase: e.target.value})} className="mt-1 w-full bg-surface-dim border border-outline-variant p-2 rounded text-sm text-on-surface focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Label (e.g. Q1 Check-in)</label>
              <input value={formData.phase_label} onChange={e => setFormData({...formData, phase_label: e.target.value})} className="mt-1 w-full bg-surface-dim border border-outline-variant p-2 rounded text-sm text-on-surface focus:outline-none focus:border-primary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Open Date</label>
                <input type="date" value={formData.window_open} onChange={e => setFormData({...formData, window_open: e.target.value})} className="mt-1 w-full bg-surface-dim border border-outline-variant p-2 rounded text-sm text-on-surface focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Close Date</label>
                <input type="date" value={formData.window_close} onChange={e => setFormData({...formData, window_close: e.target.value})} className="mt-1 w-full bg-surface-dim border border-outline-variant p-2 rounded text-sm text-on-surface focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <button className="px-4 py-2 font-label text-sm uppercase text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setOpen(false)}>Cancel</button>
            <button onClick={handleCreate} className="px-6 py-2 bg-primary text-on-primary font-label font-bold text-sm uppercase tracking-widest rounded hover:brightness-110 neon-glow transition-colors">
              Save Cycle
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}