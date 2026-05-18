"use client"

import { createClient } from "@/lib/supabase/client"
import { clearDemoRole, setDemoRole } from "@/lib/demo/demoClient"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast, Toaster } from "sonner"

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    clearDemoRole()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    // Role-based redirect
    const { data: userData } = await supabase.from("users").select("role").eq("auth_id", (await supabase.auth.getUser()).data.user?.id).single()
    if (userData?.role === "admin") router.push("/admin")
    else if (userData?.role === "manager") router.push("/manager")
    else router.push("/employee/goals")
    router.refresh()
  }

  const handleQuickLogin = async (demoEmail: string) => {
    setLoading(true)
    const role = demoEmail.startsWith("admin")
      ? "admin"
      : demoEmail.startsWith("manager")
        ? "manager"
        : "employee"

    setDemoRole(role)
    toast.success(`Demo mode: signed in as ${role}`)
    if (role === "admin") router.push("/admin")
    else if (role === "manager") router.push("/manager")
    else router.push("/employee/goals")
    router.refresh()
  }

  return (
    <main className="flex w-full h-screen overflow-hidden">
      <Toaster position="top-right" theme="dark" />
      
      {/* Left Panel: Brand & Visuals (60%) */}
      <section className="hidden lg:flex w-[60%] relative flex-col justify-between p-12 border-r border-[#5b3f44]/30" style={{ background: '#101129' }}>
        {/* Background overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-background/80 mix-blend-multiply z-10" />
          <div className="absolute inset-0 scanline-bg z-20 pointer-events-none opacity-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent,rgba(16,17,41,0.5),#101129)] z-10" />
          {/* Decorative circles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-[#ff4c83]/10 opacity-40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-[#24ffcd]/10 opacity-30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-[#e3c630]/10 opacity-20" />
          {/* Gradient blurs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#ff4c83]/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-[#24ffcd]/5 rounded-full blur-[80px]" />
        </div>

        {/* Content */}
        <div className="relative z-30 flex flex-col h-full max-w-2xl">
          {/* Logo */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-4xl text-[#ffb1c0] neon-text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              <h1 className="font-headline font-bold text-5xl tracking-tight text-[#e2dfff]">AtomQuest</h1>
            </div>
            <p className="font-label text-[#24ffcd] neon-text-secondary text-lg uppercase tracking-widest mt-4 border-l-2 border-[#24ffcd] pl-4 py-1 bg-gradient-to-r from-[#24ffcd]/10 to-transparent">
              Goal Setting & Performance Governance Portal
            </p>
          </div>

          {/* Features */}
          <div className="my-auto space-y-8">
            <div className="flex items-start gap-4 group">
              <div className="p-3 rounded bg-[#1d1d36] border neon-border-primary text-[#ffb1c0] transition-all duration-300 group-hover:scale-105 group-hover:bg-[#ff4c83]/10">
                <span className="material-symbols-outlined">balance</span>
              </div>
              <div>
                <h3 className="font-headline font-semibold text-xl text-[#e2dfff] group-hover:text-[#ffb1c0] transition-colors">Balanced Weightage Constraint Validation</h3>
                <p className="text-[#e4bdc3] mt-1 text-sm leading-relaxed">Algorithmic checks ensure departmental OKRs align perfectly within the 100% distribution threshold.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 group">
              <div className="p-3 rounded bg-[#1d1d36] border neon-border-secondary text-[#24ffcd] transition-all duration-300 group-hover:scale-105 group-hover:bg-[#24ffcd]/10">
                <span className="material-symbols-outlined">bar_chart</span>
              </div>
              <div>
                <h3 className="font-headline font-semibold text-xl text-[#e2dfff] group-hover:text-[#24ffcd] transition-colors">Granular Performance Analytics Sparklines</h3>
                <p className="text-[#e4bdc3] mt-1 text-sm leading-relaxed">Real-time telemetry on quarterly goal progression with embedded trend visualizations.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 group">
              <div className="p-3 rounded bg-[#1d1d36] border neon-border-tertiary text-[#e3c630] transition-all duration-300 group-hover:scale-105 group-hover:bg-[#e3c630]/10">
                <span className="material-symbols-outlined">security</span>
              </div>
              <div>
                <h3 className="font-headline font-semibold text-xl text-[#e2dfff] group-hover:text-[#e3c630] transition-colors">Supabase Row-Level Security Enforced</h3>
                <p className="text-[#e4bdc3] mt-1 text-sm leading-relaxed">Enterprise-grade data isolation ensuring multi-tenant hierarchical access compliance.</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pb-8">
            <p className="font-label text-xs text-[#e4bdc3] uppercase tracking-widest flex items-center gap-2">
              <span className="w-8 h-[1px] bg-[#5b3f44]" />
              Powered by Atomberg Technologies Engineering
            </p>
          </div>
        </div>
      </section>

      {/* Right Panel: Login Flow (40%) */}
      <section className="w-full lg:w-[40%] flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto" style={{ background: '#0b0b24' }}>
        {/* Ambient glow */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#ff4c83]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <span className="material-symbols-outlined text-3xl text-[#ffb1c0] neon-text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <h1 className="font-headline font-bold text-3xl tracking-tight text-[#e2dfff]">AtomQuest</h1>
          </div>

          {/* Login Card */}
          <div className="bg-[#1d1d36] border border-[#ab888e]/30 rounded-xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ffb1c0] via-[#24ffcd] to-transparent opacity-50" />
            
            <div className="mb-8">
              <h2 className="font-headline text-3xl font-bold text-[#e2dfff] mb-2">Welcome Back</h2>
              <p className="text-[#e4bdc3] text-sm font-label uppercase tracking-wide">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email */}
              <div className="space-y-1 relative group">
                <label className="font-label text-xs uppercase tracking-widest text-[#e4bdc3] group-focus-within:text-[#ffb1c0] transition-colors" htmlFor="email">Corporate Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#e4bdc3] group-focus-within:text-[#ffb1c0]">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="employee@atomquest.com"
                    className="block w-full pl-10 pr-3 py-3 bg-[#101129] border-0 border-b-2 border-[#5b3f44] text-[#e2dfff] focus:ring-0 focus:border-[#ffb1c0] focus:bg-[#101129]/80 transition-all placeholder:text-[#e4bdc3]/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1 relative group">
                <div className="flex justify-between items-center">
                  <label className="font-label text-xs uppercase tracking-widest text-[#e4bdc3] group-focus-within:text-[#ffb1c0] transition-colors" htmlFor="password">Access Key</label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#e4bdc3] group-focus-within:text-[#ffb1c0]">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-3 bg-[#101129] border-0 border-b-2 border-[#5b3f44] text-[#e2dfff] focus:ring-0 focus:border-[#ffb1c0] focus:bg-[#101129]/80 transition-all placeholder:text-[#e4bdc3]/50"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#e4bdc3] hover:text-[#e2dfff] transition-colors">
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-[#101129] border border-[#ffb1c0] text-[#ffb1c0] font-headline font-bold uppercase tracking-widest text-sm neon-border-primary neon-hover-primary transition-all duration-300 mt-4 group disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Authenticate Subroutine"}
                {!loading && <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>}
              </button>
            </form>
          </div>

          {/* Hackathon Quick Switcher */}
          <div className="bg-[#1d1d36]/50 border border-[#5b3f44]/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#e3c630] neon-text-tertiary text-[20px]">terminal</span>
              <h3 className="font-label text-xs font-bold text-[#e2dfff] uppercase tracking-widest">Hackathon Quick Switcher</h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleQuickLogin("employee@equilibrium.com")}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#101129] border border-[#ab888e]/30 hover:border-[#24ffcd]/50 text-left transition-all duration-200 group hover:bg-[#24ffcd]/5 disabled:opacity-50"
              >
                <div className="p-1.5 rounded bg-[#32324d] text-[#e4bdc3] group-hover:text-[#24ffcd] group-hover:bg-[#24ffcd]/10 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
                <div>
                  <p className="font-label text-[10px] uppercase tracking-wider text-[#e4bdc3]">Act as Employee</p>
                  <p className="text-sm text-[#e2dfff] group-hover:text-[#24ffcd] transition-colors">Arjun Kumar</p>
                </div>
              </button>
              <button
                onClick={() => handleQuickLogin("manager@equilibrium.com")}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#101129] border border-[#ab888e]/30 hover:border-[#ffb1c0]/50 text-left transition-all duration-200 group hover:bg-[#ffb1c0]/5 disabled:opacity-50"
              >
                <div className="p-1.5 rounded bg-[#32324d] text-[#e4bdc3] group-hover:text-[#ffb1c0] group-hover:bg-[#ffb1c0]/10 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                </div>
                <div>
                  <p className="font-label text-[10px] uppercase tracking-wider text-[#e4bdc3]">Act as Manager</p>
                  <p className="text-sm text-[#e2dfff] group-hover:text-[#ffb1c0] transition-colors">Priya Patel</p>
                </div>
              </button>
              <button
                onClick={() => handleQuickLogin("admin@equilibrium.com")}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#101129] border border-[#ab888e]/30 hover:border-[#e3c630]/50 text-left transition-all duration-200 group hover:bg-[#e3c630]/5 disabled:opacity-50"
              >
                <div className="p-1.5 rounded bg-[#32324d] text-[#e4bdc3] group-hover:text-[#e3c630] group-hover:bg-[#e3c630]/10 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                </div>
                <div>
                  <p className="font-label text-[10px] uppercase tracking-wider text-[#e4bdc3]">Act as Admin</p>
                  <p className="text-sm text-[#e2dfff] group-hover:text-[#e3c630] transition-colors">Rahul Sharma</p>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="font-label text-xs text-[#e4bdc3]">
              Secured by <span className="text-[#24ffcd] neon-text-secondary">Supabase Auth</span>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
