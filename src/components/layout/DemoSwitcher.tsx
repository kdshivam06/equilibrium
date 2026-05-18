"use client"

import { setDemoRole } from "@/lib/demo/demoClient"
import { useRouter } from "next/navigation"

const destinations = {
  employee: "/employee/goals",
  manager: "/manager",
  admin: "/admin",
} as const

export function DemoSwitcher({ role }: { role: "employee" | "manager" | "admin" }) {
  const router = useRouter()

  return (
    <select
      aria-label="Switch demo role"
      value={role}
      onChange={(event) => {
        const nextRole = event.target.value as keyof typeof destinations
        setDemoRole(nextRole)
        router.push(destinations[nextRole])
        router.refresh()
      }}
      className="h-9 rounded border border-outline-variant bg-surface-container px-2 text-xs font-label uppercase tracking-widest text-on-surface-variant outline-none transition-colors hover:border-primary focus:border-primary"
    >
      <option value="employee">Employee</option>
      <option value="manager">Manager</option>
      <option value="admin">Admin</option>
    </select>
  )
}
