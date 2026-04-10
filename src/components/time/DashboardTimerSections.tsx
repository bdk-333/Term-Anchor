import { useMemo, useState } from 'react'
import { useAppState } from '@/context/AppStateContext'
import { useTimeTracker } from '@/context/TimeTrackerContext'
import { OTHERS_LANE_ID, laneLabelForId } from '@/lib/timeLane'
import { toDateKey } from '@/lib/dates'
import {
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  fetchProjects,
  fetchTasks,
  fetchTodayTotals,
  formatMinutes,
  timerEnd,
  timerPause,
  timerResume,
  updateProject,
  updateTask,
  type TimeProject,
  type TimeTask,
} from '@/lib/timeApi'

function TaskProjectSelect({
  value,
  onChange,
  projects,
  categories,
  compact,
}: {
  value: string
  onChange: (projectId: string) => void
  projects: TimeProject[]
  categories: ReadonlyArray<{ id: string; label: string }>
  compact?: boolean
}) {
  const sorted = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects],
  )
  return (
    <select
      aria-label="Project for time task"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`gs-native-select gs-native-select--plain ${compact ? 'w-full' : 'sm:w-52 sm:min-w-[12rem]'}`}
    >
      <option value="">No project (Others lane)</option>
      {sorted.map((p) => (
        <option key={p.id} value={String(p.id)}>
          {laneLabelForId(p.laneId, categories)} · {p.name}
        </option>
      ))}
    </select>
  )
}

function formatTaskOptionLabel(
  t: TimeTask,
  categories: ReadonlyArray<{ id: string; label: string }>,
): string {
  if (!t.projectId) {
    return `Others · ${t.name}`
  }
  const lane = t.projectLaneId
    ? laneLabelForId(t.projectLaneId, categories)
    : '—'
  const proj = t.projectName ?? '—'
  return `${lane} · ${proj} · ${t.name}`
}

export function DashboardTimerSections() {
  const { state } = useAppState()
  const {
    apiOk,
    persistenceBackend,
    current,
    totals,
    projects,
    tasks,
    busy,
    timeError,
    refreshAll,
    runWithBusy,
    setCurrent,
    setTotals,
    setProjects,
    setTasks,
    startTimerForNumericTaskId,
  } = useTimeTracker()

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectLaneId, setNewProjectLaneId] = useState(OTHERS_LANE_ID)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskProjectId, setNewTaskProjectId] = useState('')
  const [startTaskId, setStartTaskId] = useState('')

  const todayKey = toDateKey(new Date())
  const plannerTaskForCurrent = useMemo(() => {
    if (!current) return null
    const items = state.tasksByDay[todayKey]?.items ?? []
    return items.find((t) => t.timeTaskId === current.taskId) ?? null
  }, [current, state.tasksByDay, todayKey])

  const laneOptions = useMemo(() => {
    const opts = state.taskCategories.map((c) => ({ id: c.id, label: c.label }))
    return [...opts, { id: OTHERS_LANE_ID, label: 'Others' }]
  }, [state.taskCategories])

  const sortedTasks = useMemo(() => {
    const laneOrder = new Map<string, number>()
    state.taskCategories.forEach((c, i) => laneOrder.set(c.id, i))
    laneOrder.set(OTHERS_LANE_ID, state.taskCategories.length)
    return [...tasks].sort((a, b) => {
      const la =
        a.projectId == null ? OTHERS_LANE_ID : (a.projectLaneId ?? OTHERS_LANE_ID)
      const lb =
        b.projectId == null ? OTHERS_LANE_ID : (b.projectLaneId ?? OTHERS_LANE_ID)
      const pa = laneOrder.get(la) ?? 99
      const pb = laneOrder.get(lb) ?? 99
      if (pa !== pb) return pa - pb
      const na = a.projectName ?? ''
      const nb = b.projectName ?? ''
      if (na !== nb) return na.localeCompare(nb)
      return a.name.localeCompare(b.name)
    })
  }, [tasks, state.taskCategories])

  if (apiOk === false) {
    return (
      <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-3 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gs-muted">Time tracking</h3>
        <p className="text-sm text-gs-muted leading-relaxed">
          Run the app with the dev server (<span className="font-mono text-gs-text/90">npm start</span>) so{' '}
          <span className="font-mono text-gs-text/90">/api/time</span> is available (SQLite at{' '}
          <span className="font-mono text-gs-text/90">data/time-tracking.db</span>).
        </p>
        {persistenceBackend === 'local' && (
          <p className="text-sm text-gs-muted leading-relaxed">
            Planner data is in the browser until you use the full local app on the same origin.
          </p>
        )}
      </section>
    )
  }

  if (apiOk === null) {
    return (
      <section className="gs-glass-panel gs-glass-panel--tilt-none p-5 sm:p-6">
        <p className="font-mono text-sm text-gs-muted">Checking time API…</p>
      </section>
    )
  }

  return (
    <div className="space-y-8">
      {timeError ? (
        <p className="text-sm text-gs-danger font-mono border border-gs-danger/30 rounded-md px-3 py-2 bg-gs-danger/5">
          {timeError}
        </p>
      ) : null}

      <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-4 p-5 sm:p-6 ring-1 ring-white/[0.06]">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gs-muted">Active timer</h3>
        {current ? (
          <div className="space-y-3">
            {plannerTaskForCurrent ? (
              <p className="font-mono text-[10px] uppercase tracking-wider text-sky-300/90">
                Linked to a task in your lanes below
              </p>
            ) : null}
            <p className="text-lg font-semibold text-gs-text">
              {current.taskName}
              {current.projectName ? (
                <span className="text-gs-muted font-normal text-base"> · {current.projectName}</span>
              ) : null}
            </p>
            <p className="font-mono text-sm text-gs-accent">
              {formatMinutes(current.elapsedMinutes)} · {current.state === 'running' ? 'Running' : 'Paused'}
            </p>
            <div className="flex flex-wrap gap-2">
              {current.state === 'running' ? (
                <button
                  type="button"
                  disabled={busy}
                  className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-white/12 hover:border-gs-accent/50 disabled:opacity-40"
                  onClick={() =>
                    void runWithBusy(async () => {
                      setCurrent(await timerPause())
                      setTotals(await fetchTodayTotals())
                    })
                  }
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-white/12 hover:border-gs-accent/50 disabled:opacity-40"
                  onClick={() =>
                    void runWithBusy(async () => {
                      setCurrent(await timerResume())
                      setTotals(await fetchTodayTotals())
                    })
                  }
                >
                  Resume
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-gs-danger/40 text-gs-danger hover:bg-gs-danger/10 disabled:opacity-40"
                onClick={() =>
                  void runWithBusy(async () => {
                    await timerEnd()
                    setCurrent(null)
                    setTotals(await fetchTodayTotals())
                  })
                }
              >
                Stop
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gs-muted">
            No timer running. Use <span className="text-gs-text/90">Start timer</span> on a lane task, or start
            an ad-hoc task below.
          </p>
        )}

        <div className="pt-2 border-t border-white/[0.08] space-y-2">
          <label className="block font-mono text-[11px] uppercase tracking-widest text-gs-muted">
            Ad-hoc tasks (database only)
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              aria-label="Ad-hoc task to track"
              value={startTaskId}
              onChange={(e) => setStartTaskId(e.target.value)}
              className="gs-native-select gs-native-select--plain flex-1 min-w-[12rem]"
            >
              <option value="">Select task…</option>
              {sortedTasks.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {formatTaskOptionLabel(t, state.taskCategories)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !startTaskId}
              className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-lg bg-gs-accent text-gs-bg disabled:opacity-40 shadow-[0_0_20px_-6px_rgba(232,255,71,0.45)]"
              onClick={() => {
                const id = Number(startTaskId)
                if (!Number.isFinite(id)) return
                void startTimerForNumericTaskId(id)
              }}
            >
              Start
            </button>
          </div>
          <p className="text-xs text-gs-muted leading-relaxed">
            Starting another task stops the previous one at the current minute.
          </p>
        </div>
      </section>

      <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-4 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gs-muted">Tracked time today</h3>
        {totals ? (
          <div className="space-y-3">
            <p className="font-mono text-sm text-gs-accent">
              Total · {formatMinutes(totals.overallMinutes)} · {totals.dateKey}
            </p>
            {totals.taskTotals.length === 0 ? (
              <p className="text-sm text-gs-muted">No minutes logged yet today.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {totals.taskTotals.map((row) => (
                  <li
                    key={row.taskId}
                    className="flex justify-between gap-4 border-b border-white/[0.06] pb-2 last:border-0"
                  >
                    <span>
                      {row.taskName}
                      {row.projectName ? (
                        <span className="text-gs-muted"> · {row.projectName}</span>
                      ) : null}
                    </span>
                    <span className="font-mono text-gs-text/90 shrink-0">{formatMinutes(row.minutes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-gs-muted">Loading totals…</p>
        )}
      </section>

      <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-4 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gs-muted">Tasks (time database)</h3>
        <p className="text-xs text-gs-muted leading-relaxed max-w-2xl">
          Most entries have <span className="text-gs-text/85">no project</span> — they belong to the{' '}
          <span className="text-gs-text/85">Others</span> lane for tracking. Optionally attach a project (scoped
          to a lane below) after you create it.
        </p>
        <ul className="space-y-3">
          {sortedTasks.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
              <input
                defaultValue={t.name}
                key={`${t.id}-${t.updated_at}-name`}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (!name || name === t.name) return
                  void runWithBusy(async () => {
                    const next = await updateTask(t.id, name, t.projectId)
                    setTasks((list) => list.map((x) => (x.id === next.id ? next : x)))
                  })
                }}
                className="gs-glass-input flex-1 min-w-0 px-3 py-2 font-mono text-sm text-gs-text"
              />
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto sm:min-w-[14rem]">
                <TaskProjectSelect
                  key={`tp-${t.id}-${t.projectId ?? 'none'}-${t.updated_at}`}
                  value={t.projectId == null ? '' : String(t.projectId)}
                  projects={projects}
                  categories={state.taskCategories}
                  compact
                  onChange={(v) => {
                    const pid = v === '' ? null : Number(v)
                    void runWithBusy(async () => {
                      const next = await updateTask(t.id, t.name, pid)
                      setTasks((list) => list.map((x) => (x.id === next.id ? next : x)))
                    })
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  className="font-mono text-xs text-gs-danger px-2 py-2 shrink-0 disabled:opacity-30 self-end sm:self-auto"
                  onClick={() =>
                    void runWithBusy(async () => {
                      await deleteTask(t.id)
                      await refreshAll()
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="pt-2 border-t border-white/[0.08] space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gs-muted">Add task</p>
          <div className="flex flex-col gap-2">
            <input
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="Task name"
              className="gs-glass-input w-full px-3 py-2 font-mono text-sm text-gs-text"
            />
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
              <TaskProjectSelect
                value={newTaskProjectId}
                onChange={setNewTaskProjectId}
                projects={projects}
                categories={state.taskCategories}
              />
              <button
                type="button"
                disabled={busy || !newTaskName.trim()}
                className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-white/12 hover:border-gs-accent/50 disabled:opacity-40 sm:ml-auto"
                onClick={() =>
                  void runWithBusy(async () => {
                    const pid = newTaskProjectId === '' ? null : Number(newTaskProjectId)
                    await createTask(newTaskName, pid)
                    setNewTaskName('')
                    setNewTaskProjectId('')
                    setTasks(await fetchTasks())
                  })
                }
              >
                Add task
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-4 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gs-muted">Projects (time database)</h3>
        <p className="text-xs text-gs-muted leading-relaxed max-w-2xl">
          Each project sits under one <span className="text-gs-text/85">lane</span> (same names as your task
          lanes on Today, plus <span className="text-gs-text/85">Others</span>). Tasks in the list above can
          reference these projects; unassigned tasks stay in the Others lane.
        </p>
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
              <input
                defaultValue={p.name}
                key={`${p.id}-${p.updated_at}-n`}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (!name || name === p.name) return
                  void runWithBusy(async () => {
                    const next = await updateProject(p.id, name, p.laneId)
                    setProjects((list) => list.map((x) => (x.id === next.id ? next : x)))
                    setTasks(await fetchTasks())
                  })
                }}
                className="gs-glass-input flex-1 min-w-[8rem] px-3 py-2 font-mono text-sm text-gs-text"
              />
              <select
                aria-label={`Lane for project ${p.name}`}
                defaultValue={p.laneId}
                key={`${p.id}-${p.updated_at}-lane`}
                className="gs-native-select gs-native-select--plain sm:w-48"
                onChange={(e) => {
                  const laneId = e.target.value
                  void runWithBusy(async () => {
                    const next = await updateProject(p.id, p.name, laneId)
                    setProjects((list) => list.map((x) => (x.id === next.id ? next : x)))
                    setTasks(await fetchTasks())
                  })
                }}
              >
                {laneOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                className="font-mono text-xs text-gs-danger px-2 py-2 disabled:opacity-30"
                onClick={() =>
                  void runWithBusy(async () => {
                    await deleteProject(p.id)
                    await refreshAll()
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="pt-2 border-t border-white/[0.08] space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gs-muted">Add project</p>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap sm:items-center">
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              className="gs-glass-input flex-1 min-w-[10rem] px-3 py-2 font-mono text-sm text-gs-text"
            />
            <select
              aria-label="Lane for new project"
              value={newProjectLaneId}
              onChange={(e) => setNewProjectLaneId(e.target.value)}
              className="gs-native-select gs-native-select--plain sm:w-48"
            >
              {laneOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  Lane: {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !newProjectName.trim()}
              className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-white/12 hover:border-gs-accent/50 disabled:opacity-40"
              onClick={() =>
                void runWithBusy(async () => {
                  await createProject(newProjectName, newProjectLaneId)
                  setNewProjectName('')
                  setNewProjectLaneId(OTHERS_LANE_ID)
                  setProjects(await fetchProjects())
                })
              }
            >
              Add project
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
