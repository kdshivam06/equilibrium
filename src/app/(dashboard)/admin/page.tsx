"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

export default function AdminDashboard() {
  const { user, loading: userLoading } = useCurrentUser()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalEmployees: 0, goalsSubmitted: 0, goalsApproved: 0, checkinsPending: 0, activeEscalations: 0, goalsTotal: 0 })
  const [deptStats, setDeptStats] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase.from("users").select("*").eq("role", "employee")
      const totalEmployees = usersData?.length || 0

      // Fetch goals for active cycle
      const { data: goalsData } = await supabase.from("goals").select("*")
      
      const goalsTotal = new Set(goalsData?.map(g => g.employee_id)).size || 0
      const submitted = new Set(goalsData?.filter(g => ['submitted', 'approved', 'rework'].includes(g.status)).map(g => g.employee_id)).size || 0
      const approved = new Set(goalsData?.filter(g => g.status === 'approved').map(g => g.employee_id)).size || 0

      // Escalations
      const { data: escalationsData } = await supabase.from("escalation_events").select("*").eq("is_resolved", false)
      const activeEscalations = escalationsData?.length || 0

      const { data: cyclesData } = await supabase.from("goal_cycles").select("*")
      const activeQuarter = cyclesData?.find(c => c.is_active && c.phase?.startsWith("q"))?.phase
      const approvedGoals = goalsData?.filter(g => g.status === "approved") || []
      const { data: checkinsData } = activeQuarter
        ? await supabase.from("checkins").select("goal_id").eq("quarter", activeQuarter)
        : { data: [] as any[] }
      const checkedGoalIds = new Set((checkinsData || []).map(c => c.goal_id))
      const checkinsPending = activeQuarter
        ? approvedGoals.filter(g => !checkedGoalIds.has(g.id)).length
        : 0

      setStats({
        totalEmployees,
        goalsTotal,
        goalsSubmitted: submitted,
        goalsApproved: approved,
        checkinsPending,
        activeEscalations
      })

      // Dept stats
      const depts = Array.from(new Set(usersData?.map(u => u.department)))
      const deptArray = depts.map(d => {
        const dUsers = usersData?.filter(u => u.department === d) || []
        const dIds = dUsers.map(u => u.id)
        const dGoals = goalsData?.filter(g => dIds.includes(g.employee_id)) || []
        
        const submittedCount = new Set(dGoals.filter(g => ['submitted','approved'].includes(g.status)).map(g=>g.employee_id)).size
        const approvedCount = new Set(dGoals.filter(g => g.status === 'approved').map(g=>g.employee_id)).size
        
        return {
          department: d as string,
          employees: dUsers.length,
          submitted: submittedCount,
          approved: approvedCount,
          completion: dUsers.length > 0 ? Math.round((approvedCount / dUsers.length) * 100) : 0
        }
      }).sort((a,b) => b.completion - a.completion)
      
      setDeptStats(deptArray)

      // Audit logs
      const { data: logsData } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(10)
      setAuditLogs(logsData || [])

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading || userLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto pt-20 pb-24">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="font-label text-primary uppercase tracking-[0.3em] text-[10px] font-bold mb-2 block">System Matrix</span>
          <h2 className="font-headline text-4xl font-bold text-on-surface">Admin Governance</h2>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-surface-container text-[10px] font-label px-4 py-2 border border-outline-variant rounded">
            <span className="w-2 h-2 bg-secondary-fixed rounded-full animate-pulse shadow-[0_0_8px_#24ffcd]"></span>
            <span className="text-on-surface uppercase tracking-widest">Live Systems Stable</span>
          </div>
          <div className="flex items-center gap-2 bg-surface-container text-[10px] font-label px-4 py-2 border border-outline-variant rounded uppercase tracking-widest">
            <span className="text-on-surface-variant">Uptime:</span>
            <span className="text-primary neon-text-primary">99.998%</span>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* KPI Section: Critical Escalations */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-low border border-outline-variant p-6 relative overflow-hidden group rounded-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-error-container/10 -mr-16 -mt-16 rounded-full blur-3xl group-hover:bg-error-container/20 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Critical Escalations</div>
            <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="font-display font-black text-6xl text-error tracking-tighter">
              {stats.activeEscalations < 10 ? `0${stats.activeEscalations}` : stats.activeEscalations}
            </span>
            <div className="text-[10px] font-label text-error/80 uppercase">High Priority<br/>Intervention Required</div>
          </div>
          <div className="mt-6 space-y-2">
            {stats.activeEscalations === 0 ? (
              <div className="flex justify-between text-[10px] font-label py-1 border-b border-outline-variant/30">
                <span className="text-on-surface-variant">ALL SYSTEMS NOMINAL</span>
                <span className="text-secondary-fixed">LIVE</span>
              </div>
            ) : (
              <div className="flex justify-between text-[10px] font-label py-1 border-b border-outline-variant/30">
                <span className="text-on-surface-variant">SYS_WARN: ESCALATION DRIFT</span>
                <span className="text-error animate-pulse">ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Chart: Approval Funnel */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low border border-outline-variant p-6 rounded-xl">
          <h3 className="font-headline font-bold text-lg mb-6 text-on-surface">Approval Funnel Stage Distribution</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between font-label text-[10px] mb-2">
                <span className="text-on-surface uppercase tracking-widest">Total User Base</span>
                <span className="text-primary font-bold">{stats.totalEmployees} ACCOUNTS</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary-fixed shadow-[0_0_10px_#24ffcd66]" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between font-label text-[10px] mb-2">
                <span className="text-on-surface uppercase tracking-widest">Started Drafting Goals</span>
                <span className="text-primary font-bold">{stats.goalsTotal} EMPLOYEES</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary-fixed/70 shadow-[0_0_10px_#24ffcd44] transition-all duration-1000" style={{ width: `${stats.totalEmployees ? (stats.goalsTotal / stats.totalEmployees) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between font-label text-[10px] mb-2">
                <span className="text-on-surface uppercase tracking-widest">Submitted to Manager</span>
                <span className="text-primary font-bold">{stats.goalsSubmitted} SUBMISSIONS</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary-fixed/40 shadow-[0_0_10px_#24ffcd22] transition-all duration-1000" style={{ width: `${stats.totalEmployees ? (stats.goalsSubmitted / stats.totalEmployees) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between font-label text-[10px] mb-2">
                <span className="text-on-surface uppercase tracking-widest">Final Executive Sign-off (Approved)</span>
                <span className="text-primary font-bold neon-text-primary">{stats.goalsApproved} LOCKED</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary shadow-[0_0_15px_rgba(255,177,192,0.5)] transition-all duration-1000" style={{ width: `${stats.totalEmployees ? (stats.goalsApproved / stats.totalEmployees) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* System Logs */}
        <div className="col-span-12 lg:col-span-5 bg-surface-container border border-outline-variant p-0 flex flex-col rounded-xl overflow-hidden">
          <div className="p-6 border-b border-outline-variant bg-surface-container-low/50">
            <h3 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">terminal</span>
              Governance Audit Log
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[350px] font-label">
            {auditLogs.map(log => {
              // Colorize based on action type
              let colorClass = "text-secondary-fixed"
              if (log.action.includes("admin")) colorClass = "text-primary"
              if (log.action.includes("escalation") || log.action.includes("rework")) colorClass = "text-error"
              
              return (
                <div key={log.id} className="p-4 border-b border-outline-variant/30 hover:bg-surface-variant/30 transition-colors cursor-pointer group">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className={`${colorClass} font-bold uppercase tracking-widest`}>SYS_LOG</span>
                    <span className="text-on-surface-variant">{formatDistanceToNow(new Date(log.created_at))} ago</span>
                  </div>
                  <div className={`text-xs text-on-surface group-hover:${colorClass} transition-colors capitalize font-body`}>
                    User <span className="font-semibold text-on-surface-variant">{log.user_name || 'Unknown'}</span> triggered action: {log.action.replace(/_/g, ' ')}
                  </div>
                </div>
              )
            })}
            {auditLogs.length === 0 && (
              <div className="p-8 text-center text-on-surface-variant text-xs uppercase tracking-widest">
                No recent system activity
              </div>
            )}
          </div>
        </div>

        {/* Dept Matrix */}
        <div className="col-span-12 lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
          <div className="p-6 border-b border-outline-variant bg-surface-container-high/30">
            <h3 className="font-headline font-bold text-lg text-on-surface">Department Matrix Node Status</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-highest/20">
                <tr>
                  <th className="px-6 py-4 font-label uppercase tracking-widest text-[10px] text-on-surface-variant">Cluster (Dept)</th>
                  <th className="px-6 py-4 font-label uppercase tracking-widest text-[10px] text-on-surface-variant">Users</th>
                  <th className="px-6 py-4 font-label uppercase tracking-widest text-[10px] text-on-surface-variant">Submitted</th>
                  <th className="px-6 py-4 font-label uppercase tracking-widest text-[10px] text-on-surface-variant">Approved</th>
                  <th className="px-6 py-4 font-label uppercase tracking-widest text-[10px] text-on-surface-variant text-right">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {deptStats.map((d, i) => (
                  <tr key={d.department} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">hub</span>
                        <span className="font-semibold text-on-surface text-sm">{d.department}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{d.employees}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{d.submitted}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{d.approved}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-20 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${d.completion > 80 ? 'bg-secondary-fixed' : d.completion > 40 ? 'bg-tertiary' : 'bg-primary'}`} 
                            style={{ width: `${d.completion}%` }}
                          ></div>
                        </div>
                        <span className={`text-[10px] font-label font-bold ${d.completion > 80 ? 'text-secondary-fixed' : d.completion > 40 ? 'text-tertiary' : 'text-primary'}`}>
                          {d.completion}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {deptStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-on-surface-variant font-label uppercase tracking-widest text-[10px]">
                      Awaiting Node Data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
