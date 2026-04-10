import { useMemo, useState } from 'react'
import { useAppState } from '@/context/AppStateContext'
import { useTimeTracker } from '@/context/TimeTrackerContext'
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
} from '@/lib/timeApi'

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
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskProjectId, setNewTaskProjectId] = useState('')
  const [startTaskId, setStartTaskId] = useState('')

  const todayKey = toDateKey(new Date())
  const plannerTaskForCurrent = useMemo(() => {
    if (!current) return null
    const items = state.tasksByDay[todayKey]?.items ?? []
    return items.find((t) => t.timeTaskId === current.taskId) ?? null
  }, [current, state.tasksByDay, todayKey])

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const pa = a.projectName ?? ''
      const pb = b.projectName ?? ''
      if (pa !== pb) return pa.localeCompare(pb)
      return a.name.localeCompare(b.name)
    })
  }, [tasks])

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
                  {t.projectName ? `${t.projectName} — ` : ''}
                  {t.name}
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
        <h3 className="font-mono text-xs uppercase tracking-widest text-gs-muted">Projects (time DB)</h3>
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id} className="flex gap-2 items-center">
              <input
                defaultValue={p.name}
                key={`${p.id}-${p.updated_at}`}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (!name || name === p.name) return
                  void runWithBusy(async () => {
                    const next = await updateProject(p.id, name)
                    setProjects((list) => list.map((x) => (x.id === next.id ? next : x)))
                    setTasks(await fetchTasks())
                  })
                }}
                className="gs-glass-input flex-1 px-3 py-2 font-mono text-sm text-gs-text"
              />
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
        <div className="flex gap-2 flex-wrap">
          <input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="New project name"
            className="gs-glass-input flex-1 min-w-[10rem] px-3 py-2 font-mono text-sm text-gs-text"
          />
          <button
            type="button"
            disabled={busy || !newProjectName.trim()}
            className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-white/12 hover:border-gs-accent/50 disabled:opacity-40"
            onClick={() =>
              void runWithBusy(async () => {
                await createProject(newProjectName)
                setNewProjectName('')
                setProjects(await fetchProjects())
              })
            }
          >
            Add project
          </button>
        </div>
      </section>

      <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-4 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gs-muted">Tasks (time DB)</h3>
        <ul className="space-y-3">
          {sortedTasks.map((t) => (
            <li key={t.id} className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                defaultValue={t.name}
                key={`${t.id}-${t.updated_at}`}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (!name || name === t.name) return
                  void runWithBusy(async () => {
                    const next = await updateTask(t.id, name, t.projectId)
                    setTasks((list) => list.map((x) => (x.id === next.id ? next : x)))
                  })
                }}
                className="gs-glass-input flex-1 px-3 py-2 font-mono text-sm text-gs-text"
              />
              <select
                aria-label={`Project for task ${t.name}`}
                key={`${t.id}-${t.projectId}-${t.updated_at}`}
                defaultValue={t.projectId == null ? '' : String(t.projectId)}
                onChange={(e) => {
                  const v = e.target.value
                  const pid = v === '' ? null : Number(v)
                  void runWithBusy(async () => {
                    const next = await updateTask(t.id, t.name, pid)
                    setTasks((list) => list.map((x) => (x.id === next.id ? next : x)))
                  })
                }}
                className="gs-native-select gs-native-select--plain sm:w-44 sm:min-w-[11rem]"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                className="font-mono text-xs text-gs-danger px-2 py-2 sm:self-auto self-end disabled:opacity-30"
                onClick={() =>
                  void runWithBusy(async () => {
                    await deleteTask(t.id)
                    await refreshAll()
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <input
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder="New task name"
            className="gs-glass-input flex-1 min-w-[10rem] px-3 py-2 font-mono text-sm text-gs-text"
          />
          <select
            aria-label="Project for new task"
            value={newTaskProjectId}
            onChange={(e) => setNewTaskProjectId(e.target.value)}
            className="gs-native-select gs-native-select--plain sm:w-44 sm:min-w-[11rem]"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !newTaskName.trim()}
            className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-white/12 hover:border-gs-accent/50 disabled:opacity-40"
            onClick={() =>
              void runWithBusy(async () => {
                const pid = newTaskProjectId === '' ? null : Number(newTaskProjectId)
                await createTask(newTaskName, pid)
                setNewTaskName('')
                setTasks(await fetchTasks())
              })
            }
          >
            Add task
          </button>
        </div>
      </section>
    </div>
  )
}
