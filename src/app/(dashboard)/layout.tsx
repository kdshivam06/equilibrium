import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Topbar } from "@/components/layout/Topbar";
import { OnboardingTour } from "@/components/layout/OnboardingTour";

export default function DashboardLayout({ children }: { children: React.ReactNode }) { 
  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col'>
      <Topbar />
      <OnboardingTour />
      <TooltipProvider>
        <div className="animate-fade-in flex-1 flex flex-col">
          {children}
        </div>
      </TooltipProvider>
      <Toaster position="top-right" />
    </div>
  ); 
}