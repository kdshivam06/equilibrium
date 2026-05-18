"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Download, FileSpreadsheet, FileText } from "lucide-react"
import Papa from "papaparse"
import * as XLSX from "xlsx"

export default function AdminReports() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState("2025")
  const [quarter, setQuarter] = useState("q1")
  const [dept, setDept] = useState("all")
  
  // Data
  const [users, setUsers] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const [checkins, setCheckins] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [uRes, gRes, aRes, cRes] = await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("goals").select("*"),
      supabase.from("achievements").select("*"),
      supabase.from("checkins").select("*")
    ])
    setUsers(uRes.data || [])
    setGoals(gRes.data || [])
    setAchievements(aRes.data || [])
    setCheckins(cRes.data || [])
    setLoading(false)
  }

  // Derived Data for Tab 1
  const getTab1Data = () => {
    let filteredGoals = goals.filter(g => g.status === 'approved')
    let res = filteredGoals.map(g => {
      const u = users.find(x => x.id === g.employee_id) || {}
      const m = users.find(x => x.id === u.manager_id) || {}
      const ach = achievements.find(a => a.goal_id === g.id && a.quarter === quarter)
      return {
        Employee: u.name,
        Department: u.department,
        Manager: m.name || '--',
        Goal: g.title,
        ThrustArea: g.thrust_area,
        UoM: g.uom_type,
        Target: g.target || g.target_date || '—',
        Actual: ach?.actual ?? '—',
        Score: ach?.computed_score ?? 0,
        Status: ach?.submitted_at ? 'Submitted' : (ach ? 'In Progress' : 'Pending')
      }
    })
    if (dept !== 'all') {
      res = res.filter(r => r.Department === dept)
    }
    return res
  }

  // Derived Data for Tab 2
  const getTab2Data = () => {
    const employees = users.filter(u => u.role === 'employee')
    return employees.map(e => {
      const empGoals = goals.filter(g => g.employee_id === e.id)
      const hasApprovedGoals = empGoals.some(g => g.status === 'approved')
      
      const approvedGoalIds = empGoals.filter(g => g.status === 'approved').map(g => g.id)
      const q1Done = approvedGoalIds.length > 0 && approvedGoalIds.every(goalId => checkins.some(c => c.goal_id === goalId && c.quarter === 'q1'))
      const q2Done = approvedGoalIds.length > 0 && approvedGoalIds.every(goalId => checkins.some(c => c.goal_id === goalId && c.quarter === 'q2'))
      const q3Done = approvedGoalIds.length > 0 && approvedGoalIds.every(goalId => checkins.some(c => c.goal_id === goalId && c.quarter === 'q3'))
      const q4Done = approvedGoalIds.length > 0 && approvedGoalIds.every(goalId => checkins.some(c => c.goal_id === goalId && c.quarter === 'q4'))

      let done = 0
      if (hasApprovedGoals) done++
      if (q1Done) done++
      if (q2Done) done++
      if (q3Done) done++
      if (q4Done) done++

      return {
        id: e.id,
        Name: e.name,
        GoalSetting: hasApprovedGoals ? 'Complete' : 'Not Done',
        Q1: q1Done ? 'Complete' : (hasApprovedGoals ? 'In Progress' : 'Not Done'),
        Q2: q2Done ? 'Complete' : '—',
        Q3: q3Done ? 'Complete' : '—',
        Q4: q4Done ? 'Complete' : '—',
        done
      }
    })
  }

  const handleExportCSV = (data: any[], filename: string) => {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportExcel = () => {
    const data = getTab1Data()
    const wb = XLSX.utils.book_new()
    
    // Sheet 1: Achievement Data
    const ws1 = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws1, "Achievement Data")

    // Sheet 2: Summary Stats
    const totalScore = data.reduce((sum, row) => sum + row.Score, 0)
    const avgScore = data.length ? totalScore / data.length : 0
    const ws2 = XLSX.utils.json_to_sheet([{ "Org Average Score": `${avgScore.toFixed(1)}%`, "Total Goals": data.length }])
    XLSX.utils.book_append_sheet(wb, ws2, "Summary Stats")

    XLSX.writeFile(wb, `Equilibrium_Achievement_Report_${quarter.toUpperCase()}_${year}.xlsx`)
  }

  if (loading) return <div className="p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>

  const tab1Data = getTab1Data()
  const tab2Data = getTab2Data()

  const orgAvg = tab1Data.length > 0 ? (tab1Data.reduce((sum, r) => sum + r.Score, 0) / tab1Data.length).toFixed(1) : 0

  const getStatusColor = (s: string) => {
    if (s === 'Complete') return 'text-success'
    if (s === 'In Progress') return 'text-warning'
    if (s === 'Not Done') return 'text-destructive'
    return 'text-slate-500'
  }
  const getStatusIcon = (s: string) => {
    if (s === 'Complete') return '✅'
    if (s === 'In Progress') return '⏳'
    if (s === 'Not Done') return '❌'
    return '—'
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <h1 className="text-3xl font-bold text-white">Reports & Exports</h1>

      <Tabs defaultValue="achievement" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 mb-6">
          <TabsTrigger value="achievement">Achievement Report</TabsTrigger>
          <TabsTrigger value="completion">Completion Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="achievement">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50">
              <div className="flex gap-4">
                <Select value={year} onValueChange={v => setYear(v || '2025')}>
                  <SelectTrigger className="w-32 bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="2025">Year: 2025</SelectItem></SelectContent>
                </Select>
                <Select value={quarter} onValueChange={v => setQuarter(v || 'q1')}>
                  <SelectTrigger className="w-32 bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="q1">Quarter 1</SelectItem>
                    <SelectItem value="q2">Quarter 2</SelectItem>
                    <SelectItem value="q3">Quarter 3</SelectItem>
                    <SelectItem value="q4">Quarter 4</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dept} onValueChange={v => setDept(v || 'all')}>
                  <SelectTrigger className="w-40 bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-slate-800 text-white hover:bg-slate-700">Apply Filters</Button>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="border-slate-700" onClick={() => handleExportCSV(tab1Data, `Equilibrium_Achievement_${quarter.toUpperCase()}_${year}.csv`)}>
                  <FileText className="w-4 h-4 mr-2" /> Export CSV
                </Button>
                <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white">
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Dept</th>
                    <th className="p-4">Manager</th>
                    <th className="p-4">Goal</th>
                    <th className="p-4">Actual</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tab1Data.slice(0, 10).map((r, i) => (
                    <tr key={i} className="text-slate-200">
                      <td className="p-4 font-medium">{r.Employee}</td>
                      <td className="p-4">{r.Department}</td>
                      <td className="p-4">{r.Manager}</td>
                      <td className="p-4 truncate max-w-[200px]">{r.Goal}</td>
                      <td className="p-4 font-bold">{r.Actual}</td>
                      <td className="p-4">{r.Score}%</td>
                      <td className="p-4">{r.Status}</td>
                    </tr>
                  ))}
                  {tab1Data.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No data for selected filters</td></tr>}
                </tbody>
              </table>
              <div className="p-4 border-t border-slate-800 flex justify-between items-center text-sm">
                <span className="text-slate-400">Showing {Math.min(10, tab1Data.length)} of {tab1Data.length} records in preview.</span>
                <span className="font-bold text-white">Org Average Score: <span className="text-primary">{orgAvg}%</span></span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completion">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50">
              <CardTitle>Real-time Completion Grid</CardTitle>
              <Button variant="outline" className="border-slate-700" onClick={() => handleExportCSV(tab2Data, 'Equilibrium_Completion_Grid.csv')}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="p-4">Employee</th>
                    <th className="p-4 text-center">Goal Setting</th>
                    <th className="p-4 text-center">Q1</th>
                    <th className="p-4 text-center">Q2</th>
                    <th className="p-4 text-center">Q3</th>
                    <th className="p-4 text-center">Q4</th>
                    <th className="p-4 text-center">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tab2Data.map(r => (
                    <tr key={r.id} className="text-slate-200">
                      <td className="p-4 font-medium">{r.Name}</td>
                      <td className={`p-4 text-center font-medium ${getStatusColor(r.GoalSetting)}`}>{getStatusIcon(r.GoalSetting)}</td>
                      <td className={`p-4 text-center font-medium ${getStatusColor(r.Q1)}`}>{getStatusIcon(r.Q1)}</td>
                      <td className={`p-4 text-center font-medium ${getStatusColor(r.Q2)}`}>{getStatusIcon(r.Q2)}</td>
                      <td className={`p-4 text-center font-medium ${getStatusColor(r.Q3)}`}>{getStatusIcon(r.Q3)}</td>
                      <td className={`p-4 text-center font-medium ${getStatusColor(r.Q4)}`}>{getStatusIcon(r.Q4)}</td>
                      <td className="p-4 text-center text-slate-400">{r.done}/5 phases</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-slate-800 text-sm font-medium text-slate-300">
                Summary: {tab2Data.filter(r => r.GoalSetting === 'Complete').length}/{tab2Data.length} employees completed Goal Setting.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
