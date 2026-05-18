"use client"

import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AlertTriangle, Bell, Check, FileText, Info, MessageSquare, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"

type PortalNotification = {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  link?: string | null
  created_at: string
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<PortalNotification[]>([])
  const [open, setOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!userId) return

    async function fetchNotifications() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)
      if (data) setNotifications(data as PortalNotification[])
    }

    fetchNotifications()

    const channel = supabase
      .channel("realtime:notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications(prev => [payload.new as PortalNotification, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = async (id: string, link?: string | null) => {
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
      case "goal_submitted": return <FileText className="h-4 w-4 text-blue-500" />
      case "goal_approved": return <Check className="h-4 w-4 text-success" />
      case "goal_rework": return <AlertTriangle className="h-4 w-4 text-warning" />
      case "checkin_reminder": return <Target className="h-4 w-4 text-primary" />
      case "escalation_alert": return <AlertTriangle className="h-4 w-4 text-destructive" />
      case "checkin_comment": return <MessageSquare className="h-4 w-4 text-purple-500" />
      default: return <Info className="h-4 w-4 text-slate-400" />
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="relative flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-surface-variant" aria-label="Notifications">
        <Bell className="h-5 w-5 text-primary" />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]">
            {unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 border-slate-800 bg-slate-900 p-0 shadow-xl" align="end">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <h4 className="font-semibold text-white">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-auto p-0 text-xs text-primary hover:bg-transparent hover:text-primary/80">
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
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id, n.link)}
                  className={`flex gap-3 border-b border-slate-800/50 p-4 text-left transition-colors last:border-0 hover:bg-slate-800/50 ${!n.is_read ? "bg-slate-800/20" : ""}`}
                >
                  <span className="mt-0.5">{getIcon(n.type)}</span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className={`block text-sm ${!n.is_read ? "font-medium text-white" : "text-slate-300"}`}>{n.title}</span>
                    <span className="line-clamp-2 block text-xs text-slate-400">{n.message}</span>
                    <span className="block text-[10px] text-slate-500">{formatDistanceToNow(new Date(n.created_at))} ago</span>
                  </span>
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-slate-800 p-2 text-center text-[11px] uppercase tracking-widest text-slate-500">
          Role-based alerts and deep links
        </div>
      </PopoverContent>
    </Popover>
  )
}
