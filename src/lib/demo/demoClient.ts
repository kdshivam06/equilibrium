"use client"

import { calculateScore } from "@/lib/utils/scoreCalculator"

type DemoRole = "employee" | "manager" | "admin"
type Row = Record<string, any>
type Store = Record<string, Row[]>

const STORAGE_KEY = "equilibrium-demo-store"
const ROLE_KEY = "equilibrium-demo-role"

const ids = {
  admin: "demo-admin",
  manager: "demo-manager",
  employee: "demo-employee",
  employee2: "demo-employee-2",
  employee3: "demo-employee-3",
  cycleGoal: "demo-cycle-goal",
  cycleQ1: "demo-cycle-q1",
  cycleQ2: "demo-cycle-q2",
  cycleQ3: "demo-cycle-q3",
  cycleQ4: "demo-cycle-q4",
}

function now() {
  return new Date().toISOString()
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function seedStore(): Store {
  const users = [
    { id: ids.admin, auth_id: "demo-admin-auth", name: "Rahul Sharma", email: "admin@equilibrium.com", role: "admin", department: "Human Resources", manager_id: null, is_active: true, created_at: now(), updated_at: now() },
    { id: ids.manager, auth_id: "demo-manager-auth", name: "Priya Patel", email: "manager@equilibrium.com", role: "manager", department: "Sales", manager_id: null, is_active: true, created_at: now(), updated_at: now() },
    { id: ids.employee, auth_id: "demo-employee-auth", name: "Arjun Kumar", email: "employee@equilibrium.com", role: "employee", department: "Sales", manager_id: ids.manager, is_active: true, created_at: now(), updated_at: now() },
    { id: ids.employee2, auth_id: "demo-employee-2-auth", name: "Meera Nair", email: "meera@equilibrium.com", role: "employee", department: "Sales", manager_id: ids.manager, is_active: true, created_at: now(), updated_at: now() },
    { id: ids.employee3, auth_id: "demo-employee-3-auth", name: "Kabir Sethi", email: "kabir@equilibrium.com", role: "employee", department: "Engineering", manager_id: ids.manager, is_active: true, created_at: now(), updated_at: now() },
  ]

  const goalCycles = [
    { id: ids.cycleGoal, year: 2025, phase: "goal_setting", phase_label: "Goal Setting - FY2025", window_open: "2025-05-01", window_close: "2025-06-30", is_active: true, created_at: now() },
    { id: ids.cycleQ1, year: 2025, phase: "q1", phase_label: "Q1 Check-in - July 2025", window_open: "2025-07-01", window_close: "2025-07-31", is_active: true, created_at: now() },
    { id: ids.cycleQ2, year: 2025, phase: "q2", phase_label: "Q2 Check-in - October 2025", window_open: "2025-10-01", window_close: "2025-10-31", is_active: false, created_at: now() },
    { id: ids.cycleQ3, year: 2025, phase: "q3", phase_label: "Q3 Check-in - January 2026", window_open: "2026-01-01", window_close: "2026-01-31", is_active: false, created_at: now() },
    { id: ids.cycleQ4, year: 2025, phase: "q4", phase_label: "Q4 / Annual - March-April 2026", window_open: "2026-03-01", window_close: "2026-04-30", is_active: false, created_at: now() },
  ]

  const goals = [
    { id: "goal-1", employee_id: ids.employee, cycle_id: ids.cycleGoal, thrust_area: "Revenue Growth", title: "Achieve Q1 Sales Target of INR 50L", description: "Build pipeline coverage and close strategic enterprise accounts.", uom_type: "min_numeric", target: 5000000, target_date: null, weightage: 30, status: "approved", is_locked: true, is_shared: false, shared_from_goal_id: null, primary_owner_id: ids.employee, created_at: now(), updated_at: now() },
    { id: "goal-2", employee_id: ids.employee, cycle_id: ids.cycleGoal, thrust_area: "Customer Experience", title: "Maintain NPS Score Above 75", description: "Improve response quality and close feedback loops.", uom_type: "min_numeric", target: 75, target_date: null, weightage: 20, status: "approved", is_locked: true, is_shared: false, shared_from_goal_id: null, primary_owner_id: ids.employee, created_at: now(), updated_at: now() },
    { id: "goal-3", employee_id: ids.employee, cycle_id: ids.cycleGoal, thrust_area: "Cost Optimisation", title: "Reduce Customer Acquisition Cost by 15%", description: "Lower paid acquisition dependency through referral and partner channels.", uom_type: "max_percent", target: 15, target_date: null, weightage: 20, status: "approved", is_locked: true, is_shared: false, shared_from_goal_id: null, primary_owner_id: ids.employee, created_at: now(), updated_at: now() },
    { id: "goal-4", employee_id: ids.employee, cycle_id: ids.cycleGoal, thrust_area: "Safety & Compliance", title: "Zero Compliance Violations", description: "No policy breaches in customer data handling.", uom_type: "zero", target: 0, target_date: null, weightage: 15, status: "approved", is_locked: true, is_shared: false, shared_from_goal_id: null, primary_owner_id: ids.employee, created_at: now(), updated_at: now() },
    { id: "goal-5", employee_id: ids.employee, cycle_id: ids.cycleGoal, thrust_area: "Digital Transformation", title: "CRM Migration Completion", description: "Complete migration before the Q2 operating review.", uom_type: "timeline", target: null, target_date: "2025-09-30", weightage: 15, status: "approved", is_locked: true, is_shared: false, shared_from_goal_id: null, primary_owner_id: ids.employee, created_at: now(), updated_at: now() },
    { id: "goal-6", employee_id: ids.employee2, cycle_id: ids.cycleGoal, thrust_area: "Revenue Growth", title: "Grow channel revenue by INR 30L", description: "Expand distributor-led revenue in priority regions.", uom_type: "min_numeric", target: 3000000, target_date: null, weightage: 50, status: "submitted", is_locked: false, is_shared: false, shared_from_goal_id: null, primary_owner_id: ids.employee2, created_at: now(), updated_at: now() },
    { id: "goal-7", employee_id: ids.employee2, cycle_id: ids.cycleGoal, thrust_area: "Quality", title: "Reduce order defects below 2%", description: "Partner with operations on defect prevention.", uom_type: "max_percent", target: 2, target_date: null, weightage: 50, status: "submitted", is_locked: false, is_shared: false, shared_from_goal_id: null, primary_owner_id: ids.employee2, created_at: now(), updated_at: now() },
    { id: "goal-8", employee_id: ids.employee3, cycle_id: ids.cycleGoal, thrust_area: "Innovation", title: "Launch self-serve analytics pilot", description: "Release pilot dashboards for two departments.", uom_type: "timeline", target: null, target_date: "2025-10-15", weightage: 60, status: "draft", is_locked: false, is_shared: false, shared_from_goal_id: null, primary_owner_id: ids.employee3, created_at: now(), updated_at: now() },
  ]

  const achievements = goals.slice(0, 5).map((goal, index) => {
    const actual = [2000000, 78, 5, 0, null][index]
    const actualDate = index === 4 ? "2025-09-20" : "2025-07-15"
    return {
      id: `ach-${index + 1}`,
      goal_id: goal.id,
      cycle_id: ids.cycleQ1,
      quarter: "q1",
      actual,
      actual_date: actualDate,
      progress_status: ["on_track", "completed", "on_track", "completed", "on_track"][index],
      computed_score: calculateScore(goal as any, actual, actualDate),
      employee_notes: `Q1 update for ${goal.title}`,
      submitted_at: now(),
      updated_at: now(),
    }
  })

  return {
    users,
    goal_cycles: goalCycles,
    goals,
    achievements,
    checkins: [
      { id: "checkin-1", goal_id: "goal-1", manager_id: ids.manager, quarter: "q1", comment: "Good early progress. Pipeline conversion needs focus for Q2.", rating: "meets", created_at: now() },
      { id: "checkin-2", goal_id: "goal-2", manager_id: ids.manager, quarter: "q1", comment: "Strong customer handling and clear feedback closure.", rating: "exceeds", created_at: now() },
    ],
    audit_logs: [
      { id: "audit-1", goal_id: "goal-1", user_id: ids.employee, user_name: "Arjun Kumar", user_role: "employee", action: "create", entity_type: "goal", field_changed: "title", old_value: null, new_value: "Achieve Q1 Sales Target of INR 50L", created_at: now() },
      { id: "audit-2", goal_id: "goal-1", user_id: ids.manager, user_name: "Priya Patel", user_role: "manager", action: "goals_approved", entity_type: "employee_cycle", field_changed: "status", old_value: "submitted", new_value: "approved", created_at: now() },
      { id: "audit-3", goal_id: "goal-3", user_id: ids.admin, user_name: "Rahul Sharma", user_role: "admin", action: "admin_unlock", entity_type: "goal", field_changed: "is_locked", old_value: "true", new_value: "exception handled", created_at: now() },
    ],
    escalation_rules: [
      { id: "rule-1", rule_type: "goal_not_submitted", rule_label: "Goals Not Submitted After Cycle Opens", days_threshold: 7, level2_after_days: 2, level3_after_days: 4, is_active: true, created_at: now() },
      { id: "rule-2", rule_type: "goal_not_approved", rule_label: "Goals Pending Approval Too Long", days_threshold: 5, level2_after_days: 2, level3_after_days: 3, is_active: true, created_at: now() },
      { id: "rule-3", rule_type: "checkin_not_done", rule_label: "Quarterly Check-in Overdue", days_threshold: 10, level2_after_days: 3, level3_after_days: 5, is_active: true, created_at: now() },
    ],
    escalation_events: [
      { id: "esc-1", rule_id: "rule-2", user_id: ids.employee2, goal_id: "goal-6", current_level: 1, is_resolved: false, resolved_by: null, resolved_at: null, resolution_note: null, last_notified_at: now(), created_at: now() },
    ],
    notifications: [
      { id: "notif-1", user_id: ids.manager, title: "Goals pending approval", message: "Meera Nair submitted goals for review.", type: "approval", is_read: false, link: "/manager", created_at: now() },
      { id: "notif-2", user_id: ids.employee, title: "Q1 check-in open", message: "Log your actual achievements for Q1.", type: "checkin", is_read: false, link: "/employee/achievements", created_at: now() },
    ],
  }
}

function getStore(): Store {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw) return JSON.parse(raw)
  const seeded = seedStore()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

function saveStore(store: Store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function setDemoRole(role: DemoRole) {
  window.localStorage.setItem(ROLE_KEY, role)
  document.cookie = `demo-role=${role}; path=/; max-age=604800; SameSite=Lax`
  getStore()
}

export function clearDemoRole() {
  window.localStorage.removeItem(ROLE_KEY)
  document.cookie = "demo-role=; path=/; max-age=0; SameSite=Lax"
}

export function getDemoRole(): DemoRole | null {
  if (typeof window === "undefined") return null
  const localRole = window.localStorage.getItem(ROLE_KEY) as DemoRole | null
  if (localRole) return localRole
  const cookieRole = document.cookie.match(/(?:^|;\s*)demo-role=(employee|manager|admin)/)?.[1] as DemoRole | undefined
  return cookieRole || null
}

function authIdForRole(role: DemoRole) {
  return `demo-${role}-auth`
}

class DemoQuery {
  private filters: Array<(row: Row) => boolean> = []
  private sorters: Array<{ field: string; ascending: boolean }> = []
  private maxRows: number | null = null
  private singleRow = false
  private mutation: null | { type: "insert" | "update" | "upsert"; payload: any; options?: any } = null
  private selectedRows: Row[] | null = null

  constructor(private table: string) {}

  select(_columns = "*") {
    return this
  }

  eq(field: string, value: any) {
    this.filters.push(row => row[field] === value)
    return this
  }

  neq(field: string, value: any) {
    this.filters.push(row => row[field] !== value)
    return this
  }

  in(field: string, values: any[]) {
    this.filters.push(row => values.includes(row[field]))
    return this
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.sorters.push({ field, ascending: options?.ascending !== false })
    return this
  }

  limit(count: number) {
    this.maxRows = count
    return this
  }

  single() {
    this.singleRow = true
    return this
  }

  insert(payload: any) {
    this.mutation = { type: "insert", payload }
    return this
  }

  update(payload: any) {
    this.mutation = { type: "update", payload }
    return this
  }

  upsert(payload: any, options?: any) {
    this.mutation = { type: "upsert", payload, options }
    return this
  }

  then(resolve: (value: any) => void, reject: (reason?: any) => void) {
    this.execute().then(resolve, reject)
  }

  private execute() {
    try {
      const store = getStore()
      store[this.table] ||= []
      let rows = store[this.table]

      if (this.mutation?.type === "insert") {
        const incoming = (Array.isArray(this.mutation.payload) ? this.mutation.payload : [this.mutation.payload]).map(row => ({
          id: row.id || uid(this.table),
          created_at: row.created_at || now(),
          updated_at: row.updated_at || now(),
          ...row,
        }))
        store[this.table] = [...rows, ...incoming]
        this.selectedRows = incoming
        saveStore(store)
      }

      if (this.mutation?.type === "update") {
        const updated: Row[] = []
        store[this.table] = rows.map(row => {
          if (this.filters.every(filter => filter(row))) {
            const next = { ...row, ...this.mutation?.payload, updated_at: now() }
            updated.push(next)
            return next
          }
          return row
        })
        this.selectedRows = updated
        saveStore(store)
      }

      if (this.mutation?.type === "upsert") {
        const incoming = Array.isArray(this.mutation.payload) ? this.mutation.payload : [this.mutation.payload]
        const conflict: string[] = String(this.mutation.options?.onConflict || "id").split(",").map((field: string) => field.trim())
        const upserted: Row[] = []

        incoming.forEach(item => {
          const existingIndex = store[this.table].findIndex(row => conflict.every(field => row[field] === item[field]))
          if (existingIndex >= 0) {
            store[this.table][existingIndex] = { ...store[this.table][existingIndex], ...item, updated_at: now() }
            upserted.push(store[this.table][existingIndex])
          } else {
            const next = { id: item.id || uid(this.table), created_at: item.created_at || now(), updated_at: item.updated_at || now(), ...item }
            store[this.table].push(next)
            upserted.push(next)
          }
        })
        this.selectedRows = upserted
        saveStore(store)
      }

      rows = this.selectedRows || store[this.table] || []
      let data = rows.filter(row => this.filters.every(filter => filter(row)))

      if (this.table === "escalation_events") {
        const users = store.users || []
        data = data.map(row => ({ ...row, users: users.find(user => user.id === row.user_id) }))
      }

      this.sorters.forEach(sorter => {
        data = [...data].sort((a, b) => {
          const av = a[sorter.field] ?? ""
          const bv = b[sorter.field] ?? ""
          return sorter.ascending ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
        })
      })

      if (this.maxRows !== null) data = data.slice(0, this.maxRows)
      return Promise.resolve({ data: this.singleRow ? (data[0] || null) : data, error: null })
    } catch (error) {
      return Promise.resolve({ data: this.singleRow ? null : [], error })
    }
  }
}

export function createDemoClient() {
  const role = getDemoRole() || "employee"
  const authUser = { id: authIdForRole(role), email: `${role}@equilibrium.com` }

  return {
    auth: {
      getSession: async () => ({ data: { session: { user: authUser } }, error: null }),
      getUser: async () => ({ data: { user: authUser }, error: null }),
      signInWithPassword: async () => ({ data: { user: authUser, session: { user: authUser } }, error: null }),
      signOut: async () => {
        clearDemoRole()
        return { error: null }
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: (table: string) => new DemoQuery(table),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => ({ unsubscribe: () => {} }),
    }),
    removeChannel: () => {},
  }
}
