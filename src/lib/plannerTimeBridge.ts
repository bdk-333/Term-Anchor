import type { AppState, TaskItem } from '@/lib/types'
import { createProject, createTask, fetchProjects, fetchTasks } from '@/lib/timeApi'

export function findPlannerTask(
  state: AppState,
  taskId: string,
): { dateKey: string; task: TaskItem } | null {
  for (const [dk, bucket] of Object.entries(state.tasksByDay ?? {})) {
    const hit = bucket?.items?.find((t) => t.id === taskId)
    if (hit) return { dateKey: dk, task: hit }
  }
  return null
}

export function patchPlannerTaskInState(
  state: AppState,
  taskId: string,
  patch: Partial<TaskItem>,
): AppState {
  const tasksByDay = { ...state.tasksByDay }
  for (const dk of Object.keys(tasksByDay)) {
    const items = tasksByDay[dk]?.items ?? []
    const ix = items.findIndex((t) => t.id === taskId)
    if (ix === -1) continue
    const next = items.map((t, i) => (i === ix ? { ...t, ...patch } : t))
    return { ...state, tasksByDay: { ...tasksByDay, [dk]: { items: next } } }
  }
  return state
}

/**
 * Resolves a numeric time-tracker task id for a planner row (creates project + task if needed).
 */
export async function ensureTimeTaskForPlanner(params: {
  text: string
  categoryLabel: string
  existingTimeTaskId?: number | null
}): Promise<number> {
  const { text, categoryLabel, existingTimeTaskId } = params
  const tasks = await fetchTasks()
  if (existingTimeTaskId != null && tasks.some((t) => t.id === existingTimeTaskId)) {
    return existingTimeTaskId
  }
  const projects = await fetchProjects()
  const label = categoryLabel.trim() || 'Tasks'
  let proj = projects.find((p) => p.name === label)
  if (!proj) {
    proj = await createProject(label)
  }
  const name = text.trim() || 'Task'
  const created = await createTask(name, proj.id)
  return created.id
}
