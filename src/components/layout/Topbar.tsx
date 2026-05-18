"use client"

import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_ITEMS: Record<string, { label: string; href: string; icon: string }[]> = {
  employee: [
    { label: "My Goals", href: "/employee/goals", icon: "target" },
    { label: "Achievement Tracking", href: "/employee/achievements", icon: "bar_chart" },
  ],
  manager: [
    { label: "Team Dashboard", href: "/manager", icon: "groups" },
    { label: "Quarterly Check-ins", href: "/manager/checkins", icon: "schedule" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: "dashboard" },
    { label: "Cycle Management", href: "/admin/cycles", icon: "update" },
    { label: "All Goals", href: "/admin/goals", icon: "list_alt" },
    { label: "User Management", href: "/admin/users", icon: "manage_accounts" },
    { label: "Reports & Exports", href: "/admin/reports", icon: "analytics" },
    { label: "Audit Trail", href: "/admin/audit", icon: "security" },
    { label: "Escalations", href: "/admin/escalations", icon: "warning" },
    { label: "Analytics", href: "/admin/analytics", icon: "monitoring" },
  ],
}

export function Topbar() {
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        supabase.from("users").select("id, name, role").eq("auth_id", data.user.id).single().then(({ data: uData }) => {
          if (uData) {
            setUserId(uData.id)
            setRole(uData.role)
            setUserName(uData.name || "")
          }
        })
      }
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const navItems = role ? NAV_ITEMS[role] || [] : []

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface-container-low border-b border-outline-variant shadow-[0_0_15px_rgba(255,76,131,0.1)] h-16 flex justify-between items-center px-6 glass-panel">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-headline font-black tracking-tighter text-2xl text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            AtomQuest
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && item.href !== "/manager" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "font-headline font-bold tracking-tight text-sm transition-all duration-300 active:scale-95 px-3 py-1.5 flex items-center gap-2 rounded",
                    isActive
                      ? "text-primary border-b-2 border-primary bg-primary/10"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/10 hover:text-primary"
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center bg-surface-container h-9 px-3 rounded-lg border border-outline-variant w-64 mr-2">
            <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2">search</span>
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none focus:ring-0 text-xs w-full placeholder:text-on-surface-variant/50 text-on-surface font-label uppercase tracking-widest"
            />
          </div>

          <button className="p-2 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer active:scale-95 relative">
            <span className="material-symbols-outlined text-primary">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary-container rounded-full border border-background"></span>
          </button>
          
          <button className="p-2 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer active:scale-95 hidden sm:block">
            <span className="material-symbols-outlined text-primary">settings</span>
          </button>

          {role && (
            <div className="flex items-center gap-3 border-l border-outline-variant pl-4 ml-2">
              <div className="hidden sm:block text-right">
                <p className="font-headline font-semibold text-sm text-on-surface leading-tight">{userName}</p>
                <p className="font-label text-[10px] uppercase tracking-widest text-primary">{role}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-surface-container-high border border-primary flex items-center justify-center overflow-hidden">
                <span className="font-headline font-bold text-sm text-primary">{userName?.charAt(0)?.toUpperCase()}</span>
              </div>
            </div>
          )}

          {role && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-error/10 hover:text-error text-on-surface-variant transition-colors cursor-pointer active:scale-95 ml-2"
              title="Sign Out"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          )}
          
          <button
            className="lg:hidden p-2 text-on-surface-variant"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown */}
      {mobileOpen && (
        <div className="lg:hidden fixed top-16 left-0 right-0 z-30 bg-surface-container-low border-b border-outline-variant px-4 py-3 space-y-1 shadow-2xl animate-fade-in glass-panel">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-headline font-bold transition-colors",
                  isActive
                    ? "bg-primary/20 text-primary border-l-4 border-primary"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
                )}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}