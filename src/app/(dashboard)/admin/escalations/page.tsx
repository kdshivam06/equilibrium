"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, AlertCircle, Check } from "lucide-react"
import { format } from "date-fns"

export default function AdminEscalations() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: rData }, { data: eData }] = await Promise.all([
      supabase.from("escalation_rules").select("*").order("created_at"),
      supabase.from("escalation_events").select("*, users:user_id(name)").order("created_at", { ascending: false })
    ])
    setRules(rData || [])
    setEvents(eData || [])
    setLoading(false)
  }

  const handleResolve = async () => {
    if (!resolveNote || !resolveId) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: uData } = await supabase.from("users").select("id").eq("auth_id", user?.id).single()

      await supabase.from("escalation_events").update({
        is_resolved: true,
        resolved_by: uData?.id,
        resolution_note: resolveNote,
        resolved_at: new Date().toISOString()
      }).eq("id", resolveId)
      
      toast.success("Event marked as resolved")
      setResolveId(null)
      setResolveNote("")
      fetchData()
    } catch(e:any) {
      toast.error(e.message)
    }
  }

  if (loading) return <div className="p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>

  const activeCount = events.filter(e => !e.is_resolved).length
  const resolvedCount = events.filter(e => e.is_resolved).length
  const level3Count = events.filter(e => e.current_level >= 3 && !e.is_resolved).length

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <h1 className="text-3xl font-bold text-white">Escalation Center</h1>

      <div className="flex gap-4 mb-8">
        <Badge variant="outline" className="px-4 py-2 text-sm bg-slate-900 border-warning text-warning">{activeCount} Active</Badge>
        <Badge variant="outline" className="px-4 py-2 text-sm bg-slate-900 border-success text-success">{resolvedCount} Resolved This Month</Badge>
        <Badge variant="outline" className="px-4 py-2 text-sm bg-slate-900 border-destructive text-destructive">{level3Count} Escalated to Level 3</Badge>
      </div>

      <h2 className="text-xl font-bold text-white mt-12 mb-4">Rule Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rules.map(r => (
          <Card key={r.id} className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-white">{r.rule_label}</h3>
                <Badge className={r.is_active ? "bg-success/20 text-success border-none" : "bg-slate-800 border-none"}>{r.is_active ? "Active ✓" : "Inactive"}</Badge>
              </div>
              <p className="text-sm text-slate-400 mb-4">Threshold: <span className="font-bold text-white">{r.days_threshold} days</span></p>
              <Button variant="outline" size="sm" className="w-full border-slate-700 bg-slate-950">Edit Rule</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="text-xl font-bold text-white mt-12 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-warning" /> Escalation Events</h2>
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Rule Triggered</th>
                <th className="p-4">Current Level</th>
                <th className="p-4">Created</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {events.map(e => {
                const rule = rules.find(r => r.id === e.rule_id)
                return (
                  <tr key={e.id} className="text-slate-200">
                    <td className="p-4 font-medium">{e.users?.name}</td>
                    <td className="p-4">{rule?.rule_label}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <div className={`h-2 w-8 rounded-full ${e.current_level >= 1 ? 'bg-warning' : 'bg-slate-800'}`}></div>
                        <div className={`h-2 w-8 rounded-full ${e.current_level >= 2 ? 'bg-orange-500' : 'bg-slate-800'}`}></div>
                        <div className={`h-2 w-8 rounded-full ${e.current_level >= 3 ? 'bg-destructive' : 'bg-slate-800'}`}></div>
                        <span className="ml-2 text-xs font-bold text-slate-300">L{e.current_level}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-400">{format(new Date(e.created_at), 'MMM d, yyyy')}</td>
                    <td className="p-4">
                      <Badge variant="outline" className={e.is_resolved ? "border-success/30 text-success bg-success/10" : "border-warning/30 text-warning bg-warning/10"}>
                        {e.is_resolved ? "Resolved" : "Open"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {!e.is_resolved ? (
                        <Button size="sm" variant="outline" onClick={() => setResolveId(e.id)} className="border-slate-700 bg-slate-950 hover:bg-slate-800">
                          <Check className="w-3 h-3 mr-2 text-success" /> Mark Resolved
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-500 truncate max-w-[150px] inline-block" title={e.resolution_note}>{e.resolution_note}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {events.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No escalation events found.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!resolveId} onOpenChange={(v) => !v && setResolveId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader><DialogTitle>Resolve Escalation</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <label className="text-sm text-slate-400">Resolution Note:</label>
            <Textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} className="bg-slate-950 border-slate-800 min-h-[100px]" placeholder="e.g. Employee has now submitted their goals" />
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setResolveId(null)}>Cancel</Button>
            <Button onClick={handleResolve} disabled={!resolveNote} className="bg-success hover:bg-success/90 text-white">Resolve Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}