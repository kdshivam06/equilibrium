"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Download, Search } from "lucide-react"
import { format } from "date-fns"

export default function AdminAudit() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)
    setLogs(data || [])
    setLoading(false)
  }

  const getActionColor = (action: string) => {
    if (action.includes("approve")) return "bg-green-500/10 text-green-500 border-green-500/20"
    if (action.includes("rework")) return "bg-orange-500/10 text-orange-500 border-orange-500/20"
    if (action.includes("submit")) return "bg-blue-500/10 text-blue-500 border-blue-500/20"
    if (action.includes("unlock")) return "bg-red-500/10 text-red-500 border-red-500/20"
    if (action.includes("update") || action.includes("edit")) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
    return "bg-slate-800 text-slate-300 border-slate-700"
  }

  const filteredLogs = logs.filter(l => 
    (l.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.field_changed || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.new_value || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div className="p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-32">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Audit Trail</h1>
        <Button variant="outline" className="border-slate-700 bg-slate-900"><Download className="w-4 h-4 mr-2" /> Export as CSV</Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <Input placeholder="Search user, action..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-80 pl-9 bg-slate-900 border-slate-800" />
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Action</th>
                <th className="p-4">Field Changed / Old Value / New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.map(l => (
                <tr key={l.id} className="text-slate-200 hover:bg-slate-800/20">
                  <td className="p-4 whitespace-nowrap text-xs text-slate-400">{format(new Date(l.created_at), 'MMM d, yyyy HH:mm')}</td>
                  <td className="p-4 font-medium">{l.user_name || 'System'}</td>
                  <td className="p-4"><Badge variant="outline" className="capitalize text-xs bg-slate-950">{l.user_role || 'system'}</Badge></td>
                  <td className="p-4"><Badge variant="outline" className={getActionColor(l.action)}>{l.action.replace(/_/g, ' ')}</Badge></td>
                  <td className="p-4 text-xs text-slate-300 max-w-xl truncate">
                    {l.field_changed ? (
                      <>
                        <span className="text-slate-500">Changed:</span> {l.field_changed} | 
                        <span className="text-slate-500 ml-2">Old:</span> {l.old_value || '—'} | 
                        <span className="text-slate-500 ml-2">New:</span> {l.new_value || '—'}
                      </>
                    ) : (
                      <span className="text-slate-500">{l.new_value || l.action.replace(/_/g, ' ')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}