import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAppState } from '@/context/AppStateContext'
import { daysUntil, semesterProgress, weekStartKey } from '@/lib/dates'
import type { TaskItem } from '@/lib/types'
import { isValidDateKey, streakCount, streakPips } from '@/lib/streak'

const LANE_TITLE = [
  'text-gs-lane-0',
  'text-gs-lane-1',
  'text-gs-lane-2',
  'text-gs-lane-3',
] as const
const LANE_DOT = ['bg-gs-lane-0', 'bg-gs-lane-1', 'bg-gs-lane-2', 'bg-gs-lane-3'] as const

function localNoon(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`)
}

export function DaySnapshotPage() {
  const { dateKey = '' } = useParams<{ dateKey: string }>()
  const { state } = useAppState()

  const profile = state.profile
  if (!profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  if (!dateKey || !isValidDateKey(dateKey) || !state.daySaved[dateKey]) {
    return <Navigate to="/week" replace />
  }

  const viewed = localNoon(dateKey)
  const wk = weekStartKey(viewed)
  const weekIntent = state.weekIntentByWeekStart[wk] ?? ''
  const rawItems = state.tasksByDay[dateKey]?.items ?? []

  const byCat = useMemo(() => {
    const m = new Map<string, TaskItem[]>()
    for (const c of state.taskCategories) m.set(c.id, [])
    for (const t of rawItems) {
      if (m.has(t.categoryId)) m.get(t.categoryId)!.push(t)
    }
    return m
  }, [rawItems, state.taskCategories])

  const intentionSections = state.dayIntentSections[dateKey] ?? []
  const logSections = state.dayLogSections[dateKey] ?? []

  const until = profile.anchorDate ? daysUntil(profile.anchorDate, viewed) : null
  const daysLeftDisplay = until != null ? Math.max(0, until) : null
  const progress =
    profile.semesterStart && profile.semesterEnd
      ? semesterProgress(profile.semesterStart, profile.semesterEnd, viewed)
      : 0

  const streak = streakCount(state, viewed)
  const pips = streakPips(state, viewed)

  const streakDesc =
    streak === 0
      ? 'no streak through this day'
      : streak === 1
        ? 'day streak through this day'
        : 'day streak through this day'

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/week"
            className="font-mono text-[11px] uppercase tracking-wider text-gs-accent hover:text-gs-text mb-3 inline-block"
          >
            ← Back to week
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted mb-2">
            Logged day snapshot
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gs-text">
            {viewed.toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h2>
          <p className="font-mono text-xs text-gs-muted mt-2">
            Read-only — how this day looked when saved. Week intention below is for the calendar week that
            contains this date (may have been empty then).
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <span className="font-mono text-3xl sm:text-4xl font-bold text-gs-accent leading-none">
            {daysLeftDisplay ?? '—'}
          </span>
          <p className="font-mono text-[11px] uppercase tracking-wider text-gs-muted mt-2">
            days to {profile.anchorLabel || 'anchor'} (as of this date)
          </p>
          <div className="mt-3 h-1.5 w-36 max-w-full rounded-full bg-black/30 sm:ml-auto overflow-hidden ring-1 ring-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gs-accent to-[#c8e830] transition-all duration-500 shadow-[0_0_12px_rgba(232,255,71,0.45)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-gs-muted mt-1.5">Term progress (as of this date)</p>
        </div>
      </div>

      <section
        className="gs-glass-streak flex flex-wrap items-center gap-4 sm:gap-5 p-4 sm:p-5"
        aria-label="Streak on this day"
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

      <section className="gs-glass-panel gs-glass-panel--tilt-none p-5 sm:p-6 space-y-2">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted">
          Week intention (this week)
        </h3>
        {weekIntent.trim() ? (
          <p className="text-sm text-gs-text leading-relaxed whitespace-pre-wrap font-sans">{weekIntent}</p>
        ) : (
          <p className="text-sm text-gs-muted italic font-sans">Empty for this week.</p>
        )}
      </section>

      <section>
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted mb-4">Task lanes</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {state.taskCategories.map((cat, idx) => {
            const ti = idx % 4
            const list = byCat.get(cat.id) ?? []
            return (
              <div key={cat.id} className="gs-glass-panel p-4 flex flex-col min-h-[160px]">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4
                    className={`font-mono text-xs font-bold uppercase tracking-[0.1em] ${LANE_TITLE[ti]}`}
                  >
                    {cat.label}
                  </h4>
                  <span className={`h-2 w-2 rounded-full shrink-0 ${LANE_DOT[ti]}`} aria-hidden />
                </div>
                <ul className="space-y-2">
                  {list.map((t) => (
                    <li key={t.id} className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 w-4 h-4 shrink-0 rounded border font-mono text-[10px] leading-4 text-center ${
                          t.done
                            ? 'bg-gs-success border-gs-success text-gs-bg'
                            : 'border-gs-muted bg-gs-surface-muted/50'
                        }`}
                      >
                        {t.done ? '✓' : ''}
                      </span>
                      <span
                        className={`text-sm flex-1 leading-snug ${t.done ? 'text-gs-muted line-through' : 'text-gs-text'}`}
                      >
                        {t.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted mb-4">
            Day intention
          </h3>
          {intentionSections.length === 0 ? (
            <p className="text-sm text-gs-muted">No intention sections.</p>
          ) : (
            <ul className="space-y-4">
              {intentionSections.map((s, idx) => (
                <li
                  key={s.id}
                  className="gs-glass-panel gs-glass-panel--tilt-none p-4 border border-white/[0.06]"
                >
                  <p className="font-mono text-[10px] uppercase text-gs-muted mb-2">Section {idx + 1}</p>
                  <p className="text-sm font-medium text-gs-text">{s.title.trim() || '—'}</p>
                  {s.details.trim() ? (
                    <p className="text-sm text-gs-muted mt-2 whitespace-pre-wrap leading-relaxed">
                      {s.details}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted mb-4">Daily log</h3>
          {logSections.length === 0 ? (
            <p className="text-sm text-gs-muted">No log sections.</p>
          ) : (
            <ul className="space-y-4">
              {logSections.map((s, idx) => (
                <li
                  key={s.id}
                  className="gs-glass-panel gs-glass-panel--tilt-none p-4 border border-white/[0.06]"
                >
                  <p className="font-mono text-[10px] uppercase text-gs-muted mb-2">Section {idx + 1}</p>
                  <p className="text-sm font-medium text-gs-text">{s.title.trim() || '—'}</p>
                  {s.details.trim() ? (
                    <p className="text-sm text-gs-muted mt-2 whitespace-pre-wrap leading-relaxed">
                      {s.details}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="gs-glass-panel gs-glass-panel--tilt-none p-5">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted mb-4">Habits</h3>
        <ul className="space-y-2">
          {state.habits.map((h) => {
            const checked = !!(state.habitChecks[dateKey]?.[h.id])
            return (
              <li key={h.id} className="flex items-center gap-2 text-sm">
                <span className={checked ? 'text-gs-success' : 'text-gs-muted'}>{checked ? '✓' : '○'}</span>
                <span className={checked ? 'text-gs-muted line-through' : 'text-gs-text'}>{h.label}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
