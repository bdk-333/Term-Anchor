import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { GlassStatCard } from '@/components/GlassStatCard'
import { useAppState } from '@/context/AppStateContext'
import { daysUntil, semesterProgress, toDateKey } from '@/lib/dates'
import { newId } from '@/lib/id'
import type { AppState } from '@/lib/types'
import { streakCount, streakPips } from '@/lib/streak'

const LANE_TITLE = [
  'text-gs-lane-0',
  'text-gs-lane-1',
  'text-gs-lane-2',
  'text-gs-lane-3',
] as const
const LANE_DOT = ['bg-gs-lane-0', 'bg-gs-lane-1', 'bg-gs-lane-2', 'bg-gs-lane-3'] as const

function countTasksDone(s: AppState): number {
  let n = 0
  for (const { items } of Object.values(s.tasksByDay)) {
    for (const t of items) {
      if (t.done) n++
    }
  }
  return n
}

export function DashboardPage() {
  const { state, setState } = useAppState()
  const today = new Date()
  const todayKey = toDateKey(today)

  const profile = state.profile
  if (!profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  const rawItems = state.tasksByDay[todayKey]?.items
  const byCat = useMemo(() => {
    const list = rawItems ?? []
    const m = new Map<string, typeof list>()
    for (const c of state.taskCategories) m.set(c.id, [])
    for (const t of list) {
      if (m.has(t.categoryId)) m.get(t.categoryId)!.push(t)
    }
    return m
  }, [rawItems, state.taskCategories])

  const bucket = rawItems ?? []

  const until = profile.anchorDate ? daysUntil(profile.anchorDate, today) : null
  const daysLeftDisplay = until != null ? Math.max(0, until) : null
  const progress =
    profile.semesterStart && profile.semesterEnd
      ? semesterProgress(profile.semesterStart, profile.semesterEnd, today)
      : 0

  const streak = streakCount(state, today)
  const pips = streakPips(state, today)

  const daysLogged = useMemo(
    () => Object.values(state.daySaved).filter(Boolean).length,
    [state.daySaved],
  )
  const tasksDone = useMemo(() => countTasksDone(state), [state.tasksByDay])

  const streakDesc =
    streak === 0
      ? 'day streak — start today'
      : streak === 1
        ? 'day streak — keep going'
        : 'day streak — don’t break it'

  const intention = state.dayIntent[todayKey] ?? ''
  const log = state.dayLog[todayKey] ?? ''
  const dayMarked = !!state.daySaved[todayKey]

  function patchTodayTasks(items: typeof bucket) {
    setState((s) => ({
      ...s,
      tasksByDay: {
        ...s.tasksByDay,
        [todayKey]: { items },
      },
    }))
  }

  function addTask(categoryId: string, text: string) {
    const t = text.trim()
    if (!t) return
    patchTodayTasks([
      ...bucket,
      { id: newId(), categoryId, text: t, done: false },
    ])
  }

  function toggleTask(id: string) {
    patchTodayTasks(bucket.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function removeTask(id: string) {
    patchTodayTasks(bucket.filter((t) => t.id !== id))
  }

  function setIntention(v: string) {
    setState((s) => ({
      ...s,
      dayIntent: { ...s.dayIntent, [todayKey]: v },
    }))
  }

  function setLog(v: string) {
    setState((s) => ({
      ...s,
      dayLog: { ...s.dayLog, [todayKey]: v },
    }))
  }

  function saveDay() {
    setState((s) => ({
      ...s,
      daySaved: { ...s.daySaved, [todayKey]: true },
    }))
  }

  function toggleHabit(habitId: string) {
    setState((s) => {
      const day = s.habitChecks[todayKey] ?? {}
      const next = { ...day, [habitId]: !day[habitId] }
      return {
        ...s,
        habitChecks: { ...s.habitChecks, [todayKey]: next },
      }
    })
  }

  const greeting = profile.displayName?.trim()
    ? `Today — ${profile.displayName}`
    : 'Today'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
      <div className="space-y-10">
        <header className="gs-glass-panel gs-glass-panel--tilt-none flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 p-5 sm:p-6 mb-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted mb-2">
              {today.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gs-text">
              {greeting}
            </h2>
            {profile.degreeFocus && (
              <p className="font-mono text-xs text-gs-accent2/90 mt-3 leading-relaxed max-w-md">
                {profile.degreeFocus}
              </p>
            )}
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="font-mono text-4xl sm:text-5xl font-bold text-gs-accent leading-none">
              {daysLeftDisplay ?? '—'}
            </span>
            <p className="font-mono text-[11px] uppercase tracking-wider text-gs-muted mt-2">
              days to {profile.anchorLabel || 'anchor'}
            </p>
            <div className="mt-4 h-1.5 w-40 max-w-full rounded-full bg-black/30 sm:ml-auto overflow-hidden ring-1 ring-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gs-accent to-[#c8e830] transition-all duration-500 shadow-[0_0_12px_rgba(232,255,71,0.45)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-mono text-[10px] text-gs-muted mt-1.5">Term progress</p>
          </div>
        </header>

        <div className="gs-stat-grid grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <GlassStatCard label="Days left" value={daysLeftDisplay ?? '—'} variant="lime" />
          <GlassStatCard label="Days logged" value={daysLogged} variant="cyan" />
          <GlassStatCard label="Tasks done" value={tasksDone} variant="white" />
          <GlassStatCard label="Streak" value={streak} variant="red" />
        </div>

        <section
          className="gs-glass-streak flex flex-wrap items-center gap-4 sm:gap-5 p-4 sm:p-5"
          aria-label="Streak"
        >
          <span className="gs-fire-emoji select-none shrink-0" title="Streak" aria-hidden="true">
            🔥
          </span>
          <div className="flex-1 min-w-[140px]">
            <p className="font-mono text-2xl sm:text-[1.75rem] font-bold text-gs-accent2 drop-shadow-[0_0_14px_rgba(255,107,53,0.45)]">
              {streak}
            </p>
            <p className="font-mono text-[11px] text-gs-muted mt-1">{streakDesc}</p>
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto sm:shrink-0 justify-between sm:justify-end">
            {pips.map((hot, i) => (
              <div
                key={i}
                className={`gs-streak-pip ${hot ? 'gs-streak-pip--hot' : 'gs-streak-pip--off'}`}
                title={hot ? 'Day saved' : 'Not marked'}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted mb-4">
            Task lanes
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {state.taskCategories.map((cat, idx) => {
              const ti = idx % 4
              return (
                <div
                  key={cat.id}
                  className="gs-glass-panel p-4 flex flex-col min-h-[200px]"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h4
                      className={`font-mono text-xs font-bold uppercase tracking-[0.1em] ${LANE_TITLE[ti]}`}
                    >
                      {cat.label}
                    </h4>
                    <span className={`h-2 w-2 rounded-full shrink-0 ${LANE_DOT[ti]}`} aria-hidden />
                  </div>
                  <ul className="space-y-2 flex-1 mb-3">
                    {(byCat.get(cat.id) ?? []).map((t) => (
                      <li key={t.id} className="flex items-start gap-2 group">
                        <button
                          type="button"
                          onClick={() => toggleTask(t.id)}
                          className={`mt-0.5 w-4 h-4 shrink-0 rounded border font-mono text-[10px] leading-4 ${
                            t.done
                              ? 'bg-gs-success border-gs-success text-gs-bg'
                              : 'border-gs-muted bg-gs-surface-muted/50'
                          }`}
                          aria-label={t.done ? 'Mark incomplete' : 'Mark done'}
                        >
                          {t.done ? '✓' : ''}
                        </button>
                        <span
                          className={`text-sm flex-1 leading-snug ${t.done ? 'text-gs-muted line-through' : 'text-gs-text'}`}
                        >
                          {t.text}
                        </span>
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 text-gs-muted hover:text-gs-danger font-mono text-xs"
                          onClick={() => removeTask(t.id)}
                          aria-label="Remove task"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const fd = new FormData(e.currentTarget)
                      const text = String(fd.get('task') || '')
                      addTask(cat.id, text)
                      e.currentTarget.reset()
                    }}
                    className="flex gap-2"
                  >
                    <input
                      name="task"
                      placeholder="Example: Draft my resume bullet points for one project."
                      className="gs-glass-input flex-1 px-2 py-2 font-mono text-xs text-gs-text placeholder:text-gs-muted/80 placeholder:font-sans"
                    />
                    <button
                      type="submit"
                      className="font-mono text-xs uppercase px-3 py-2 border border-gs-accent/50 text-gs-accent rounded-md bg-white/[0.04] hover:bg-gs-accent/10 hover:shadow-[0_0_16px_-4px_rgba(232,255,71,0.4)] transition-all"
                    >
                      Add
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        </section>

        <section className="space-y-5">
          <label className="block space-y-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted">
              Today&apos;s intention
            </span>
            <textarea
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              rows={3}
              className="gs-glass-input w-full px-3 py-2.5 text-sm text-gs-text resize-y font-sans leading-relaxed"
              placeholder="Example: Today I will finish my lab write-up and send two thoughtful job applications."
            />
          </label>
          <label className="block space-y-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted">
              Daily log / reflection
            </span>
            <textarea
              value={log}
              onChange={(e) => setLog(e.target.value)}
              rows={4}
              className="gs-glass-input w-full px-3 py-2.5 text-sm text-gs-text resize-y font-sans leading-relaxed"
              placeholder="Example: I shipped the first draft of my project, but I got distracted after lunch. Tomorrow I will block two hours before noon."
            />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={saveDay}
              className="gs-glass-btn-primary font-mono text-sm uppercase tracking-wider px-6 py-3 text-white"
            >
              Save today
            </button>
            {dayMarked && (
              <span className="font-mono text-xs text-gs-success">This day is marked complete.</span>
            )}
          </div>
        </section>
      </div>

      <aside className="lg:border-l border-gs-border/80 lg:pl-8 space-y-5">
        <div className="gs-glass-panel gs-glass-panel--tilt-none p-5">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted mb-4">
            Habits
          </h3>
          <ul className="space-y-3">
            {state.habits.map((h) => {
              const checked = !!(state.habitChecks[todayKey]?.[h.id])
              return (
                <li key={h.id}>
                  <label className="gs-habit-label group">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHabit(h.id)}
                    />
                    <span className="gs-habit-box" aria-hidden />
                    <span
                      className={`text-sm leading-snug flex-1 ${checked ? 'text-gs-muted line-through' : 'text-gs-text'}`}
                    >
                      {h.label}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          <p className="font-mono text-[10px] text-gs-muted leading-relaxed mt-5">
            Edit labels in Settings. Lightweight reminders only.
          </p>
        </div>
      </aside>
    </div>
  )
}
