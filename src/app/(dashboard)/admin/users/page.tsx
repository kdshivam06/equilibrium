"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, UserPlus, Edit2 } from "lucide-react"
import { format } from "date-fns"

export default function AdminUsers() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', role: 'employee', department: '', manager_id: 'none' })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from("users").select("*").order("name")
    setUsers(data || [])
    setLoading(false)
  }

  const getManagerName = (id: string) => users.find(u => u.id === id)?.name || '--'

  const handleCreate = async () => {
    try {
      const payload = {
        ...formData,
        manager_id: formData.manager_id === 'none' ? null : formData.manager_id
      }
      const { error } = await supabase.from("users").insert([payload])
      if (error) throw error
      toast.success("User created in DB (Auth mapping required)")
      setOpen(false)
      fetchUsers()
    } catch(e:any) {
      toast.error(e.message)
    }
  }

  if (loading) return <div className="p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>

  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin')
  const admins = users.filter(u => u.role === 'admin')

  const renderTree = (managerId: string | null, depth = 0) => {
    const subordinates = users.filter(u => u.manager_id === managerId)
    if (!subordinates.length) return null
    return (
      <div className={`pl-${depth === 0 ? '0' : '8'} border-l border-slate-800 ml-4 mt-2 space-y-3`}>
        {subordinates.map(u => (
          <div key={u.id} className="relative mt-2">
            <div className="absolute -left-8 top-5 w-8 h-px bg-slate-800" />
            <div className="bg-slate-900 border border-slate-800 rounded p-4 inline-block min-w-[300px]">
              <div className="font-medium text-white flex items-center justify-between gap-4">
                <span>{u.name}</span>
                <Badge variant="outline" className="text-xs bg-slate-950">{u.role}</Badge>
              </div>
              <div className="text-xs text-slate-400 mt-2">{u.department}</div>
            </div>
            {renderTree(u.id, depth + 1)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <Button onClick={() => setOpen(true)} className="bg-primary text-white"><UserPlus className="w-4 h-4 mr-2" /> Add User</Button>
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 mb-6">
          <TabsTrigger value="table">User Table</TabsTrigger>
          <TabsTrigger value="hierarchy">Organisation Hierarchy</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Manager</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map(u => (
                    <tr key={u.id} className="text-slate-200">
                      <td className="p-4 font-medium">{u.name}</td>
                      <td className="p-4">{u.email}</td>
                      <td className="p-4"><Badge variant="outline" className="capitalize">{u.role}</Badge></td>
                      <td className="p-4">{u.department}</td>
                      <td className="p-4">{getManagerName(u.manager_id)}</td>
                      <td className="p-4">{format(new Date(u.created_at), 'MMM yyyy')}</td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white border border-slate-800"><Edit2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 overflow-auto">
              {admins.map(admin => (
                <div key={admin.id} className="mb-12">
                  <div className="bg-primary/10 border border-primary/30 rounded p-4 inline-block min-w-[300px] mb-2">
                    <div className="font-bold text-white flex items-center justify-between gap-4">
                      <span>{admin.name}</span>
                      <Badge className="bg-primary text-white">Admin</Badge>
                    </div>
                  </div>
                  {renderTree(admin.id)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <Input placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-slate-950 border-slate-800" />
            <Input placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-slate-950 border-slate-800" />
            <Input placeholder="Department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="bg-slate-950 border-slate-800" />
            
            <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v || 'employee'})}>
              <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select value={formData.manager_id} onValueChange={v => setFormData({...formData, manager_id: v || 'none'})}>
              <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue placeholder="Assign Manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Manager (Top Level)</SelectItem>
                {managers.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.department})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-primary text-white">Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}