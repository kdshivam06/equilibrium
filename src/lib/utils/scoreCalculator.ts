import { differenceInDays } from "date-fns"

type ScoreGoal = {
  uom_type: "min_numeric" | "max_numeric" | "min_percent" | "max_percent" | "timeline" | "zero"
  target?: number | string | null
  target_date?: string | Date | null
}

export function calculateScore(goal: ScoreGoal, actual?: number | string | null, actualDate?: Date | string | null): number | null {
  if (!goal) return null

  if (goal.uom_type === "timeline") {
    if (!actualDate || !goal.target_date) return null
    const completionDate = actualDate instanceof Date ? actualDate : new Date(actualDate)
    const deadline = goal.target_date instanceof Date ? goal.target_date : new Date(goal.target_date)
    const daysLate = differenceInDays(completionDate, deadline)
    if (daysLate <= 0) return 100
    return Math.max(0, 100 - daysLate * 5)
  }

  if (actual === "" || actual === null || actual === undefined) return null

  const actualNum = Number(actual)
  const targetNum = Number(goal.target ?? 0)
  if (Number.isNaN(actualNum) || Number.isNaN(targetNum)) return null

  if (goal.uom_type === "zero") return actualNum === 0 ? 100 : 0

  if (targetNum === 0 && actualNum === 0) return 100
  if (targetNum === 0) return null

  if (goal.uom_type === "min_numeric" || goal.uom_type === "min_percent") {
    return Math.min(200, Math.round((actualNum / targetNum) * 100))
  }

  if (goal.uom_type === "max_numeric" || goal.uom_type === "max_percent") {
    if (actualNum === 0) return 200
    return Math.min(200, Math.round((targetNum / actualNum) * 100))
  }

  return null
}
