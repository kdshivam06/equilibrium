"use client"

import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function OnboardingTour() {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  
  useEffect(() => {
    const checkTour = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        const { data: userData } = await supabase.from('users').select('*').eq('auth_id', data.user.id).single()
        if (userData) {
          setUserId(userData.id)
          setRole(userData.role)
          const tourDone = localStorage.getItem(`equilibrium_tour_done_${userData.id}`)
          if (!tourDone) {
            setOpen(true)
          }
        }
      }
    }
    checkTour()
  }, [])

  const employeeSteps = [
    { title: "My Goals", desc: "Start here to create your goals for FY2025. You can define targets, thrust areas, and weights." },
    { title: "Weightage Budget", desc: "Keep track of your 100% budget. All active goals must sum to exactly 100%." },
    { title: "Submit for Review", desc: "Submit when ready for manager review. Once approved, goals are locked." }
  ]

  const managerSteps = [
    { title: "Pending Approvals", desc: "Click here to review team goals. You can approve them or send them back for rework." },
    { title: "Inline Editing", desc: "You can edit targets directly before approving to speed up the process." },
    { title: "Quarterly Check-ins", desc: "Add check-in comments each quarter to provide continuous feedback." }
  ]

  const adminSteps = [
    { title: "Overview Dashboard", desc: "Monitor org-wide goal progress, completion funnels, and recent activity here." },
    { title: "Cycle Management", desc: "Activate check-in windows from Cycle Management. Locked cycles prevent overlap." }
  ]

  const steps = role === 'admin' ? adminSteps : role === 'manager' ? managerSteps : employeeSteps

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    setOpen(false)
    if (userId) {
      localStorage.setItem(`equilibrium_tour_done_${userId}`, "true")
    }
  }

  if (!open || steps.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleComplete() }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">{steps[step].title}</DialogTitle>
          <DialogDescription className="text-slate-400 pt-2 text-base">
            {steps[step].desc}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-2 w-2 rounded-full ${i === step ? 'bg-primary' : 'bg-slate-700'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={handleComplete}>Skip</Button>
            <Button onClick={handleNext} className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
              {step === steps.length - 1 ? 'Get Started' : 'Next →'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
