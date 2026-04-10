import { OTHERS_LANE_ID } from '@/lib/timeLane'

export type TimeProject = {
  id: number
  name: string
  /** Planner lane id or `__others__` for the Others bucket */
  laneId: string
  created_at: string
  updated_at: string
}

/** SQLite / JSON may expose `lane_id`; missing lane must not hide projects in pickers. */
function normalizeTimeProject(raw: Record<string, unknown>): TimeProject {
  const id = Number(raw.id)
  const name = String(raw.name ?? '')
  const laneRaw = raw.laneId ?? raw.lane_id
  const laneId =
    typeof laneRaw === 'string' && laneRaw.trim()
      ? laneRaw.trim()
      : OTHERS_LANE_ID
  return {
    id: Number.isFinite(id) ? id : 0,
    name,
    laneId,
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
  }
}

export type TimeTask = {
  id: number
  name: string
  projectId: number | null
  projectName: string | null
  /** Set when `projectId` is set; which planner lane the project belongs to */
  projectLaneId?: string | null
  created_at: string
  updated_at: string
}

export type TimerCurrent = {
  entryId: number
  taskId: number
  taskName: string
  projectId: number | null
  projectName: string | null
  state: 'running' | 'paused'
  startedMinute: number
  pausedTotalMinutes: number
  pausedStartedMinute: number | null
  dateKey: string
  elapsedMinutes: number
} | null

export type TodayTotals = {
  dateKey: string
  overallMinutes: number
  taskTotals: Array<{
    taskId: number
    taskName: string
    projectId: number | null
    projectName: string
    minutes: number
  }>
  projectTotals: Array<{
    projectId: number | null
    projectName: string
    minutes: number
  }>
  taskPerProjectTotals: Array<{
    projectId: number | null
    projectName: string
    taskId: number
    taskName: string
    minutes: number
  }>
}

async function readErrorMessage(r: Response): Promise<string> {
  try {
    const t = await r.text()
    if (!t) return r.statusText || `HTTP ${r.status}`
    const j = JSON.parse(t) as { message?: string }
    if (typeof j.message === 'string' && j.message) return j.message
    return t
  } catch {
    return r.statusText || `HTTP ${r.status}`
  }
}

async function jsonRes<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(await readErrorMessage(r))
  const t = await r.text()
  if (!t) return {} as T
  return JSON.parse(t) as T
}

export async function timeApiReachable(): Promise<boolean> {
  try {
    const r = await fetch('/api/time/timer/current', { cache: 'no-store' })
    return r.ok
  } catch {
    return false
  }
}

export async function fetchProjects(): Promise<TimeProject[]> {
  const j = await jsonRes<{ projects: Record<string, unknown>[] }>(
    await fetch('/api/time/projects', { cache: 'no-store' }),
  )
  const list = j.projects ?? []
  return list.map((row) => normalizeTimeProject(row))
}

export async function createProject(name: string, laneId: string): Promise<TimeProject> {
  const j = await jsonRes<{ project: TimeProject }>(
    await fetch('/api/time/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, laneId }),
    }),
  )
  return normalizeTimeProject(j.project as Record<string, unknown>)
}

export async function updateProject(
  id: number,
  name: string,
  laneId?: string,
): Promise<TimeProject> {
  const j = await jsonRes<{ project: TimeProject }>(
    await fetch(`/api/time/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ...(laneId !== undefined ? { laneId } : {}) }),
    }),
  )
  return normalizeTimeProject(j.project as Record<string, unknown>)
}

export async function deleteProject(id: number): Promise<void> {
  const r = await fetch(`/api/time/projects/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(await readErrorMessage(r))
}

export async function fetchTasks(): Promise<TimeTask[]> {
  const j = await jsonRes<{ tasks: TimeTask[] }>(await fetch('/api/time/tasks', { cache: 'no-store' }))
  return j.tasks ?? []
}

export async function createTask(name: string, projectId: number | null): Promise<TimeTask> {
  const j = await jsonRes<{ task: TimeTask }>(
    await fetch('/api/time/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, projectId }),
    }),
  )
  return j.task
}

export async function updateTask(
  id: number,
  name: string,
  projectId: number | null,
): Promise<TimeTask> {
  const j = await jsonRes<{ task: TimeTask }>(
    await fetch(`/api/time/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, projectId }),
    }),
  )
  return j.task
}

export async function deleteTask(id: number): Promise<void> {
  const r = await fetch(`/api/time/tasks/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(await readErrorMessage(r))
}

export async function fetchTimerCurrent(): Promise<TimerCurrent> {
  const j = await jsonRes<{ current: TimerCurrent }>(
    await fetch('/api/time/timer/current', { cache: 'no-store' }),
  )
  return j.current ?? null
}

export async function fetchTodayTotals(): Promise<TodayTotals> {
  return jsonRes<TodayTotals>(await fetch('/api/time/timer/totals/today', { cache: 'no-store' }))
}

export async function timerStart(taskId: number): Promise<TimerCurrent> {
  const j = await jsonRes<{ current: TimerCurrent }>(
    await fetch('/api/time/timer/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    }),
  )
  return j.current ?? null
}

export async function timerPause(): Promise<TimerCurrent> {
  const j = await jsonRes<{ current: TimerCurrent }>(
    await fetch('/api/time/timer/pause', { method: 'POST' }),
  )
  return j.current ?? null
}

export async function timerResume(): Promise<TimerCurrent> {
  const j = await jsonRes<{ current: TimerCurrent }>(
    await fetch('/api/time/timer/resume', { method: 'POST' }),
  )
  return j.current ?? null
}

export async function timerEnd(): Promise<void> {
  const r = await fetch('/api/time/timer/end', { method: 'POST' })
  if (!r.ok) throw new Error(await readErrorMessage(r))
}

export function formatMinutes(m: number): string {
  const n = Math.max(0, Math.floor(m))
  const h = Math.floor(n / 60)
  const min = n % 60
  if (h <= 0) return `${min}m`
  return `${h}h ${min}m`
}
