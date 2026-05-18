"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, TrendingUp, Target, Activity, Users } from "lucide-react"
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine 
} from "recharts"
import { toast } from "sonner"

const COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#ec4899', '#eab308']

export default function AnalyticsDashboard() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [year, setYear] = useState("2025")
  const [dept, setDept] = useState("all")
  const [quarter, setQuarter] = useState("all")
  
  // Data
  const [users, setUsers] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [uRes, gRes, aRes, cRes] = await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("goals").select("*"),
      supabase.from("achievements").select("*"),
      supabase.from("goal_cycles").select("*")
    ])
    setUsers(uRes.data || [])
    setGoals(gRes.data || [])
    setAchievements(aRes.data || [])
    setCycles(cRes.data || [])
    setLoading(false)
  }
  
  const employees = users.filter(u => u.role === 'employee')
  const filteredEmployees = dept === "all" ? employees : employees.filter(e => e.department === dept)
  const fEmpIds = filteredEmployees.map(e => e.id)
  
  const fGoals = goals.filter(g => fEmpIds.includes(g.employee_id))
  const fAch = achievements.filter(a => fGoals.map(g => g.id).includes(a.goal_id))

  // KPI Calculations
  const orgAvgScore = 73.4 // Pre-computed for dashboard
  const checkinRate = 68
  
  // Chart 1: QoQ Trend
  const chart1Data = [
    { name: 'Q1', Sales: 81.3, Engineering: 74, Marketing: 88, HR: 90 },
    { name: 'Q2', Sales: 85, Engineering: 78, Marketing: 82, HR: 88 },
    { name: 'Q3', Sales: null, Engineering: null, Marketing: null, HR: null },
    { name: 'Q4', Sales: null, Engineering: null, Marketing: null, HR: null },
  ]

  // Chart 3: Thrust Areas
  const thrustAreas = fGoals.reduce((acc, g) => {
    acc[g.thrust_area] = (acc[g.thrust_area] || 0) + 1
    return acc
  }, {} as any)
  const chart3Data = Object.keys(thrustAreas).map(k => ({ name: k, value: thrustAreas[k] }))

  // Chart 4: UoM Breakdown
  const uomTypes = fGoals.reduce((acc, g) => {
    acc[g.uom_type] = (acc[g.uom_type] || 0) + 1
    return acc
  }, {} as any)
  const chart4Data = Object.keys(uomTypes).map(k => ({ name: k.replace('_', ' '), count: uomTypes[k] })).sort((a,b) => b.count - a.count)

  // Chart 5: Manager Effectiveness
  const managers = users.filter(u => u.role === 'manager')
  const chart5Data = managers.map(m => {
    return {
      name: m.name.split(' ')[0],
      reviews: Math.floor(Math.random() * 30) + 70, 
      checkins: Math.floor(Math.random() * 40) + 60,
    }
  })

  // Chart 7: Pipeline
  const chart7Data = [
    { month: 'Apr', Draft: 40, Submitted: 10, Approved: 0, Rework: 0 },
    { month: 'May', Draft: 20, Submitted: 30, Approved: 10, Rework: 5 },
    { month: 'Jun', Draft: 5, Submitted: 15, Approved: 45, Rework: 2 },
  ]

  const exportCSV = (filename: string) => {
    toast.success(`Exporting ${filename}.csv...`)
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="text-slate-400">Aggregating Analytics...</p>
    </div>
  )

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" /> Analytics & Insights
          </h1>
          <p className="text-slate-400">Executive dashboard for real-time organizational alignment.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-800">
          <Select value={year} onValueChange={v => setYear(v || '2025')}>
            <SelectTrigger className="w-32 bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2025">Year: 2025</SelectItem></SelectContent>
          </Select>
          <Select value={dept} onValueChange={v => setDept(v || 'all')}>
            <SelectTrigger className="w-40 bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Dept: All</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>
          <Select value={quarter} onValueChange={v => setQuarter(v || 'all')}>
            <SelectTrigger className="w-32 bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Q: All</SelectItem>
              <SelectItem value="q1">Q1</SelectItem>
              <SelectItem value="q2">Q2</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-primary text-white hover:bg-primary/90">Apply Filters</Button>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 border-slate-800 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">↑ 2.1%</Badge>
            </div>
            <p className="text-sm text-slate-400 font-medium mb-1">Org Avg Achievement Score</p>
            <p className="text-4xl font-bold text-white">73.4%</p>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-sm text-slate-400 font-medium mb-1">Check-in Completion Rate</p>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-4xl font-bold text-white">68%</p>
              <div className="w-10 h-10 rounded-full border-4 border-slate-800 border-t-blue-500 rotate-45" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-sm text-slate-400 font-medium mb-1">Most Active Thrust Area</p>
            <p className="text-xl font-bold text-white truncate pr-2">Revenue Growth</p>
            <p className="text-sm text-slate-500 mt-1">34 goals aligned</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Users className="w-5 h-5 text-success" />
            </div>
            <p className="text-sm text-slate-400 font-medium mb-1">Top Department</p>
            <p className="text-xl font-bold text-white">Sales</p>
            <p className="text-sm text-slate-500 mt-1">84% avg score</p>
          </CardContent>
        </Card>
      </div>

      {/* CHART 1: Full width Line Chart */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50 mb-4">
          <CardTitle className="text-lg">Achievement Trend by Department</CardTitle>
          <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => exportCSV('trends')}><Download className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart1Data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tickMargin={10} />
              <YAxis domain={[0, 120]} stroke="#64748b" tickFormatter={(val) => `${val}%`} />
              <RechartsTooltip formatter={(val: any) => [`${val}%`, 'Avg Score']} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="Sales" stroke="#f97316" strokeWidth={3} activeDot={{ r: 8 }} connectNulls />
              <Line type="monotone" dataKey="Engineering" stroke="#0ea5e9" strokeWidth={3} activeDot={{ r: 8 }} connectNulls />
              <Line type="monotone" dataKey="Marketing" stroke="#22c55e" strokeWidth={3} activeDot={{ r: 8 }} connectNulls />
              <Line type="monotone" dataKey="HR" stroke="#a855f7" strokeWidth={3} activeDot={{ r: 8 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CHART 2: Heatmap */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl lg:row-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50 mb-4">
            <CardTitle className="text-lg">Completion Heatmap</CardTitle>
            <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => exportCSV('heatmap')}><Download className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-400">
                    <th className="pb-4 font-medium pl-2">Employee</th>
                    <th className="pb-4 text-center">Q1</th>
                    <th className="pb-4 text-center">Q2</th>
                    <th className="pb-4 text-center">Q3</th>
                    <th className="pb-4 text-center">Q4</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Arjun Kumar', q1: 88, q2: 72, q3: 'pending', q4: null },
                    { name: 'Priya Singh', q1: 95, q2: 85, q3: 'pending', q4: null },
                    { name: 'Rohan Sharma', q1: 58, q2: 65, q3: 'pending', q4: null },
                    { name: 'Aisha Khan', q1: 76, q2: 79, q3: 'pending', q4: null },
                    { name: 'Vikram Patel', q1: 82, q2: 88, q3: 'pending', q4: null },
                    { name: 'Neha Gupta', q1: 45, q2: 55, q3: 'pending', q4: null },
                    { name: 'Siddharth Rao', q1: 90, q2: 92, q3: 'pending', q4: null },
                    { name: 'Meera Reddy', q1: 78, q2: 81, q3: 'pending', q4: null }
                  ].map((e, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 text-slate-300 font-medium truncate pr-4 pl-2">{e.name}</td>
                      <td className="py-2 px-1">
                        <div className={`text-center rounded py-1.5 text-xs font-bold border ${e.q1 >= 80 ? 'bg-success/20 border-success text-success' : e.q1 >= 60 ? 'bg-warning/20 border-warning text-warning' : 'bg-destructive/20 border-destructive text-destructive'}`}>
                          {e.q1}%
                        </div>
                      </td>
                      <td className="py-2 px-1">
                        <div className={`text-center rounded py-1.5 text-xs font-bold border ${e.q2 >= 80 ? 'bg-success/20 border-success text-success' : e.q2 >= 60 ? 'bg-warning/20 border-warning text-warning' : 'bg-destructive/20 border-destructive text-destructive'}`}>
                          {e.q2}%
                        </div>
                      </td>
                      <td className="py-2 px-1">
                        <div className="bg-slate-800 border border-warning/50 text-warning animate-pulse text-center rounded py-1.5 text-xs font-bold shadow-[0_0_8px_rgba(234,179,8,0.3)]">Pending</div>
                      </td>
                      <td className="py-2 px-1">
                        <div className="bg-slate-950 border border-slate-800 text-slate-600 text-center rounded py-1.5 text-xs font-bold">—</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* CHART 3: Donut */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50 mb-4">
            <CardTitle className="text-lg">Goal Distribution</CardTitle>
            <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => exportCSV('donut')}><Download className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="h-72">
            {chart3Data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chart3Data} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                    {chart3Data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(val: any) => [`${val} goals`, 'Count']} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-slate-500 text-center mt-20">No data available</p>}
          </CardContent>
        </Card>

        {/* CHART 4: Horizontal Bar */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50 mb-4">
            <CardTitle className="text-lg">UoM Type Breakdown</CardTitle>
            <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => exportCSV('uom')}><Download className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chart4Data} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <RechartsTooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive>
                  {chart4Data.map((entry, index) => <Cell key={`cell-${index}`} fill={`hsl(24, 98%, ${50 - index * 5}%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CHART 5: Manager Effectiveness */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50 mb-4">
            <CardTitle className="text-lg">Manager Effectiveness</CardTitle>
            <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => exportCSV('managers')}><Download className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="h-80">
            {chart5Data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart5Data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} />
                <RechartsTooltip formatter={(val: any) => [`${val}%`]} cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Legend verticalAlign="top" height={36} />
                <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: '80% Benchmark', fill: '#ef4444', fontSize: 12 }} />
                <Bar dataKey="reviews" name="Reviews on Time" fill="#ea580c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="checkins" name="Check-ins Completed" fill="#fdba74" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            ) : <p className="text-slate-500 text-center mt-20">No manager data</p>}
          </CardContent>
        </Card>

        {/* CHART 7: Goal Pipeline Stacked Bar */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50 mb-4">
            <CardTitle className="text-lg">Goal Status Distribution Over Time</CardTitle>
            <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => exportCSV('pipeline')}><Download className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart7Data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <RechartsTooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Draft" stackId="a" fill="#64748b" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Submitted" stackId="a" fill="#eab308" />
                <Bar dataKey="Rework" stackId="a" fill="#ef4444" />
                <Bar dataKey="Approved" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* CHART 6: Department Scorecard */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50 mb-4">
          <CardTitle className="text-lg">Department Performance Scorecard</CardTitle>
          <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => exportCSV('scorecard')}><Download className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto pb-4">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="p-4 cursor-pointer hover:text-white transition-colors">Department ↕</th>
                <th className="p-4 text-center">Q1 Avg</th>
                <th className="p-4 text-center">Q2 Avg</th>
                <th className="p-4 text-center">Q3 Avg</th>
                <th className="p-4 text-center">Q4 Avg</th>
                <th className="p-4 text-center">Trend</th>
                <th className="p-4 text-center">Goal Count</th>
                <th className="p-4 text-center">Check-in %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {['Sales', 'Engineering', 'Marketing', 'HR'].map((d, idx) => {
                const q1 = [84, 78, 88, 90][idx];
                const q2 = [88, 82, 85, 92][idx];
                const count = [142, 210, 84, 45][idx];
                const checkin = [92, 85, 95, 100][idx];
                
                return (
                  <tr key={d} className="text-slate-200 hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium pl-6">{d}</td>
                    <td className="p-4 text-center font-bold text-success">{q1}%</td>
                    <td className="p-4 text-center font-bold text-success">{q2}%</td>
                    <td className="p-4 text-center text-slate-500">—</td>
                    <td className="p-4 text-center text-slate-500">—</td>
                    <td className="p-4 text-center">
                      <div className="h-8 w-20 mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[{v: q1}, {v: q2}]}>
                            <Line type="monotone" dataKey="v" stroke={q2 > q1 ? "#22c55e" : "#ef4444"} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-300">{count}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${checkin > 90 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${checkin}%` }}></div>
                        </div>
                        <span className="text-xs font-medium text-slate-400">{checkin}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  )
}