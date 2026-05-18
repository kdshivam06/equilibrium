"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

export default function ManagerDashboard() {
  const { user, loading: userLoading } = useCurrentUser()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [teamStats, setTeamStats] = useState<any[]>([])
  const [summary, setSummary] = useState({ pending: 0, approved: 0, total: 0, completion: 0 })

  useEffect(() => {
    if (!user) return
    fetchTeamData()
  }, [user])

  const fetchTeamData = async () => {
    try {
      const { data: cycleData } = await supabase.from("goal_cycles").select("*").eq("phase", "goal_setting").single()
      if (!cycleData) return

      const { data: teamMembers } = await supabase.from("users").select("*").eq("manager_id", user?.id)
      if (!teamMembers || teamMembers.length === 0) {
        setLoading(false)
        return
      }

      const { data: goalsData } = await supabase.from("goals").select("*").in("employee_id", teamMembers.map(m => m.id)).eq("cycle_id", cycleData.id)

      let pending = 0, approvedCount = 0, totalGoals = 0

      const stats = teamMembers.map(member => {
        const memberGoals = (goalsData || []).filter(g => g.employee_id === member.id)
        const goalsCount = memberGoals.length
        const totalWeightage = memberGoals.reduce((sum, g) => sum + Number(g.weightage), 0)
        
        let status = 'draft'
        if (memberGoals.some(g => g.status === 'rework')) status = 'rework'
        else if (memberGoals.every(g => g.status === 'approved') && goalsCount > 0) status = 'approved'
        else if (memberGoals.some(g => g.status === 'submitted')) status = 'submitted'
        else if (goalsCount > 0) status = 'draft'

        if (status === 'submitted') pending++
        if (status === 'approved') approvedCount++
        totalGoals += goalsCount

        let submittedAt = null
        if (status === 'submitted' || status === 'approved') {
          const submittedGoals = memberGoals.filter(g => g.status === 'submitted' || g.status === 'approved')
          if (submittedGoals.length > 0) {
            submittedAt = new Date(Math.max(...submittedGoals.map(g => new Date(g.updated_at).getTime())))
          }
        }

        return { ...member, goalsCount, totalWeightage, status, submittedAt }
      })

      setTeamStats(stats)
      setSummary({ 
        pending, 
        approved: approvedCount, 
        total: teamMembers.length,
        completion: teamMembers.length > 0 ? (approvedCount / teamMembers.length) * 100 : 0
      })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (userLoading || loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in pb-32 pt-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Manager Dashboard</h1>
          <p className="text-on-surface-variant mt-1 font-body">Real-time performance governance for your direct reports.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-surface-container-high px-4 py-2 rounded font-label text-xs uppercase tracking-widest text-primary border border-outline-variant hover:border-primary transition-colors">
            Download Report
          </button>
          <button className="bg-primary-container px-4 py-2 rounded font-label text-xs uppercase tracking-widest text-on-primary-container font-bold hover:brightness-110 transition-all neon-glow">
            Sync Data
          </button>
        </div>
      </div>

      {/* Metric Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team Goal Completion */}
        <div className="bg-surface-container border border-outline-variant p-6 rounded-xl flex flex-col justify-between h-40 relative overflow-hidden group hover:border-secondary transition-all duration-300">
          <div className="z-10">
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Team Goal Completion</p>
            <h2 className="text-4xl font-headline font-black text-secondary">{summary.completion.toFixed(1)}%</h2>
          </div>
          <div className="flex items-center gap-2 z-10">
            <span className="material-symbols-outlined text-secondary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
            <span className="text-xs text-secondary-container font-medium">{summary.approved} of {summary.total} approved</span>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-9xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>ads_click</span>
          </div>
        </div>
        
        {/* Pending Actions */}
        <div className="bg-surface-container border border-outline-variant p-6 rounded-xl flex flex-col justify-between h-40 relative overflow-hidden group hover:border-error transition-all duration-300">
          <div className="z-10">
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Pending Approvals</p>
            <h2 className="text-4xl font-headline font-black text-error">{summary.pending < 10 ? `0${summary.pending}` : summary.pending}</h2>
          </div>
          <div className="flex items-center gap-2 z-10">
            <span className="material-symbols-outlined text-error text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            <span className="text-xs text-error font-medium">{summary.pending > 0 ? 'Action Required' : 'All caught up'}</span>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-9xl text-error" style={{ fontVariationSettings: "'FILL' 1" }}>priority_high</span>
          </div>
        </div>

        {/* Total Members */}
        <div className="bg-surface-container border border-outline-variant p-6 rounded-xl flex flex-col justify-between h-40 relative overflow-hidden group hover:border-tertiary transition-all duration-300">
          <div className="z-10">
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Total Members</p>
            <h2 className="text-4xl font-headline font-black text-tertiary">{summary.total < 10 ? `0${summary.total}` : summary.total}</h2>
          </div>
          <div className="flex items-center gap-2 z-10">
            <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <span className="text-xs text-tertiary font-medium">Active direct reports</span>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-9xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
          </div>
        </div>
      </div>

      {/* Team List View */}
      <section className="bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden shadow-2xl glass-panel">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container/50">
          <h3 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
            Direct Reports
          </h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-xs font-label text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-secondary-container"></span> On Track
            </div>
            <div className="flex items-center gap-2 text-xs font-label text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-error"></span> Needs Action
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high/30">
              <tr>
                <th className="px-6 py-4 font-label uppercase tracking-widest text-[10px] text-on-surface-variant">Employee</th>
                <th className="px-6 py-4 font-label uppercase tracking-widest text-[10px] text-on-surface-variant">Department</th>
                <th className="px-6 py-4 font-label uppercase tracking-widest text-[10px] text-on-surface-variant">Status</th>
                <th className="px-6 py-4 font-label uppercase tracking-widest text-[10px] text-on-surface-variant">Engagement</th>
                <th className="px-6 py-4 font-label uppercase tracking-widest text-[10px] text-on-surface-variant">Last Update</th>
                <th className="px-6 py-4 font-label uppercase tracking-widest text-[10px] text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {teamStats.map(member => (
                <tr key={member.id} className="hover:bg-surface-variant/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden border border-outline flex items-center justify-center bg-surface-container-highest text-primary font-headline font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface">{member.name}</p>
                        <p className="text-xs text-on-surface-variant">{member.goalsCount || 0} Goals | {member.totalWeightage || 0}%</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {member.department}
                  </td>
                  <td className="px-6 py-4">
                    {member.status === 'draft' && <span className="px-2 py-1 bg-surface-container-highest text-on-surface-variant text-[10px] font-label uppercase tracking-tighter rounded border border-outline-variant">Drafting</span>}
                    {member.status === 'submitted' && <span className="px-2 py-1 bg-error-container text-error text-[10px] font-label uppercase tracking-tighter rounded border border-error/30 animate-pulse">Needs Review</span>}
                    {member.status === 'approved' && <span className="px-2 py-1 bg-[#00513f] text-secondary-fixed text-[10px] font-label uppercase tracking-tighter rounded border border-[#00e0b3]/30">Approved</span>}
                    {member.status === 'rework' && <span className="px-2 py-1 bg-[#4b3f00] text-tertiary-fixed text-[10px] font-label uppercase tracking-tighter rounded border border-tertiary/30">Rework</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-24 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${member.status === 'approved' ? 'bg-secondary-container w-[100%]' : member.status === 'submitted' ? 'bg-primary w-[75%]' : member.status === 'rework' ? 'bg-error w-[40%]' : 'bg-tertiary w-[20%]'}`}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {member.submittedAt ? formatDistanceToNow(member.submittedAt) + ' ago' : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {member.status === 'submitted' ? (
                      <button 
                        onClick={() => router.push(`/manager/review/${member.id}`)}
                        className="bg-primary text-on-primary font-label text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded hover:brightness-110 active:scale-95 transition-all neon-glow"
                      >
                        Start Review
                      </button>
                    ) : member.status === 'approved' || member.status === 'rework' ? (
                      <button 
                        onClick={() => router.push(`/manager/review/${member.id}`)}
                        className="border border-primary text-primary font-label text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded hover:bg-primary/10 active:scale-95 transition-all"
                      >
                        View Goals
                      </button>
                    ) : (
                      <span className="text-[10px] font-label text-outline uppercase tracking-widest mr-4">Pending Submit</span>
                    )}
                  </td>
                </tr>
              ))}
              {teamStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-on-surface-variant font-label uppercase tracking-widest">
                    No direct reports found in the system
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom Layout: Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container p-6 rounded-xl border border-outline-variant border-l-4 border-l-secondary-container">
          <h4 className="font-headline font-bold text-on-surface mb-4">Upcoming Cycle Milestone</h4>
          <div className="flex items-start gap-4">
            <div className="bg-secondary-container/10 p-3 rounded-lg">
              <span className="material-symbols-outlined text-secondary-container">event</span>
            </div>
            <div>
              <p className="text-secondary-container font-label text-xs uppercase tracking-widest mb-1">Active Now</p>
              <p className="text-on-surface font-semibold">Goal Setting & Approval Phase</p>
              <p className="text-sm text-on-surface-variant mt-1">Ensure all direct reports submit their objectives and review them to align with departmental OKRs.</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container p-6 rounded-xl border border-outline-variant">
          <h4 className="font-headline font-bold text-on-surface mb-4">System Insights</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded bg-surface-container-high/50 group cursor-pointer hover:bg-surface-bright/20 transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                <span className="text-sm text-on-surface">{summary.pending} submissions require immediate attention</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-surface-container-high/50 group cursor-pointer hover:bg-surface-bright/20 transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                <span className="text-sm text-on-surface">Overall team alignment is trending well</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}