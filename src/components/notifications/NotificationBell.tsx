"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, Check, X, Target, FileText, AlertTriangle, MessageSquare, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!userId) return

    fetchNotifications()

    const channel = supabase
      .channel('realtime:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)
    if (data) setNotifications(data)
  }

  const markAsRead = async (id: string, link: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setOpen(false)
    if (link) router.push(link)
  }

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'goal_submitted': return <FileText className="w-4 h-4 text-blue-500" />
      case 'goal_approved': return <Check className="w-4 h-4 text-success" />
      case 'goal_rework': return <AlertTriangle className="w-4 h-4 text-warning" />
      case 'checkin_reminder': return <Target className="w-4 h-4 text-primary" />
      case 'escalation_alert': return <AlertTriangle className="w-4 h-4 text-destructive" />
      case 'checkin_comment': return <MessageSquare className="w-4 h-4 text-purple-500" />
      default: return <Info className="w-4 h-4 text-slate-400" />
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="relative w-10 h-10 flex items-center justify-center rounded-md hover:bg-slate-800 transition-colors">
        <Bell className="w-5 h-5 text-slate-300" />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full text-[10px]">
            {unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-slate-900 border-slate-800 shadow-xl" align="end">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h4 className="font-semibold text-white">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-auto p-0 text-xs text-primary hover:text-primary/80 hover:bg-transparent">
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
          ) : (
            <div className="flex flex-col">
              {notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => markAsRead(n.id, n.link)}
                  className={`p-4 flex gap-3 cursor-pointer transition-colors border-b border-slate-800/50 last:border-0 hover:bg-slate-800/50 ${!n.is_read ? 'bg-slate-800/20' : ''}`}
                >
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm ${!n.is_read ? 'text-white font-medium' : 'text-slate-300'}`}>{n.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(n.created_at))} ago</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-2 border-t border-slate-800">
          <Button variant="ghost" className="w-full text-xs text-slate-400 hover:text-white" onClick={() => { setOpen(false); router.push('/notifications') }}>
            View all notifications →
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
