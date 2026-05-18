import os

base_dir = "c:/Shivam/equilibrium/equilibrium-portal/src"

folders = [
    "app/(auth)/login",
    "app/(dashboard)/employee/goals/create",
    "app/(dashboard)/employee/achievements",
    "app/(dashboard)/manager/review/[employeeId]",
    "app/(dashboard)/manager/checkins",
    "app/(dashboard)/admin/cycles",
    "app/(dashboard)/admin/users",
    "app/(dashboard)/admin/goals",
    "app/(dashboard)/admin/audit",
    "app/(dashboard)/admin/escalations",
    "app/(dashboard)/admin/analytics",
    "app/(dashboard)/admin/reports",
    "components/layout",
    "components/goals",
    "components/charts",
    "components/shared",
    "lib/utils",
    "hooks"
]

for folder in folders:
    os.makedirs(os.path.join(base_dir, folder), exist_ok=True)

pages = [
    ("app/(auth)/login/page.tsx", "export default function LoginPage() { return <div className='p-8'>Login Page</div>; }"),
    ("app/(dashboard)/layout.tsx", "export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <div className='min-h-screen bg-background text-foreground flex flex-col'>{children}</div>; }"),
    ("app/(dashboard)/employee/page.tsx", "export default function EmployeeDashboard() { return <div className='p-8'>Employee Dashboard</div>; }"),
    ("app/(dashboard)/employee/goals/page.tsx", "export default function GoalsPage() { return <div className='p-8'>Goals Page</div>; }"),
    ("app/(dashboard)/employee/goals/create/page.tsx", "export default function CreateGoalPage() { return <div className='p-8'>Create Goal</div>; }"),
    ("app/(dashboard)/employee/achievements/page.tsx", "export default function AchievementsPage() { return <div className='p-8'>Achievements</div>; }"),
    ("app/(dashboard)/manager/page.tsx", "export default function ManagerDashboard() { return <div className='p-8'>Manager Dashboard</div>; }"),
    ("app/(dashboard)/manager/review/[employeeId]/page.tsx", "export default function ReviewEmployeePage() { return <div className='p-8'>Review Employee</div>; }"),
    ("app/(dashboard)/manager/checkins/page.tsx", "export default function CheckinsPage() { return <div className='p-8'>Checkins</div>; }"),
    ("app/(dashboard)/admin/page.tsx", "export default function AdminDashboard() { return <div className='p-8'>Admin Dashboard</div>; }"),
    ("app/(dashboard)/admin/cycles/page.tsx", "export default function AdminCycles() { return <div className='p-8'>Cycles</div>; }"),
    ("app/(dashboard)/admin/users/page.tsx", "export default function AdminUsers() { return <div className='p-8'>Users</div>; }"),
    ("app/(dashboard)/admin/goals/page.tsx", "export default function AdminGoals() { return <div className='p-8'>Goals</div>; }"),
    ("app/(dashboard)/admin/audit/page.tsx", "export default function AdminAudit() { return <div className='p-8'>Audit Logs</div>; }"),
    ("app/(dashboard)/admin/escalations/page.tsx", "export default function AdminEscalations() { return <div className='p-8'>Escalations</div>; }"),
    ("app/(dashboard)/admin/analytics/page.tsx", "export default function AdminAnalytics() { return <div className='p-8'>Analytics</div>; }"),
    ("app/(dashboard)/admin/reports/page.tsx", "export default function AdminReports() { return <div className='p-8'>Reports</div>; }"),
    ("components/layout/Sidebar.tsx", "export const Sidebar = () => <aside>Sidebar</aside>;"),
    ("components/layout/Topbar.tsx", "export const Topbar = () => <header>Topbar</header>;"),
    ("components/layout/DemoSwitcher.tsx", "export const DemoSwitcher = () => <div>Demo Switcher</div>;"),
    ("components/goals/GoalCard.tsx", "export const GoalCard = () => <div>GoalCard</div>;"),
    ("components/goals/WeightageBar.tsx", "export const WeightageBar = () => <div>WeightageBar</div>;"),
    ("components/goals/GoalStatusBadge.tsx", "export const GoalStatusBadge = () => <div>GoalStatusBadge</div>;"),
    ("components/charts/AchievementTrend.tsx", "export const AchievementTrend = () => <div>AchievementTrend</div>;"),
    ("components/charts/CompletionHeatmap.tsx", "export const CompletionHeatmap = () => <div>CompletionHeatmap</div>;"),
    ("components/charts/GoalDistribution.tsx", "export const GoalDistribution = () => <div>GoalDistribution</div>;"),
    ("components/charts/ManagerEffectiveness.tsx", "export const ManagerEffectiveness = () => <div>ManagerEffectiveness</div>;"),
    ("components/shared/EmptyState.tsx", "export const EmptyState = () => <div>EmptyState</div>;"),
    ("components/shared/LoadingSkeleton.tsx", "export const LoadingSkeleton = () => <div>LoadingSkeleton</div>;"),
    ("components/shared/ExportButton.tsx", "export const ExportButton = () => <button>Export</button>;"),
    ("lib/utils/scoreCalculator.ts", "export const calculateScore = () => 0;"),
    ("lib/utils/exportUtils.ts", "export const exportData = () => {};"),
    ("hooks/useGoals.ts", "export const useGoals = () => [];"),
    ("hooks/useAchievements.ts", "export const useAchievements = () => [];"),
    ("hooks/useCurrentUser.ts", "export const useCurrentUser = () => ({});"),
]

for file_path, content in pages:
    full_path = os.path.join(base_dir, file_path)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Structure generated successfully!")
