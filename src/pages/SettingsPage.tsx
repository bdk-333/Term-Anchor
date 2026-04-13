import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppState } from '@/context/AppStateContext'
import { downloadBackup, importStateJson } from '@/lib/storage'
import { newId } from '@/lib/id'
import {
  MAX_CATEGORIES,
  MAX_HABITS,
  MIN_CATEGORIES,
  MIN_HABITS,
} from '@/lib/types'

type GoalDraft = {
  anchorLabel: string
  anchorDate: string
  semesterStart: string
  semesterEnd: string
}

export function SettingsPage() {
  const { state, setState, persistenceBackend } = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(() => ({
    anchorLabel: state.profile.anchorLabel,
    anchorDate: state.profile.anchorDate,
    semesterStart: state.profile.semesterStart,
    semesterEnd: state.profile.semesterEnd,
  }))
  const [goalError, setGoalError] = useState<string | null>(null)
  const [goalSavedMsg, setGoalSavedMsg] = useState<string | null>(null)

  useEffect(() => {
    setGoalDraft({
      anchorLabel: state.profile.anchorLabel,
      anchorDate: state.profile.anchorDate,
      semesterStart: state.profile.semesterStart,
      semesterEnd: state.profile.semesterEnd,
    })
  }, [
    state.profile.anchorLabel,
    state.profile.anchorDate,
    state.profile.semesterStart,
    state.profile.semesterEnd,
  ])

  if (!state.profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  function discardGoalDraft() {
    setGoalError(null)
    setGoalSavedMsg(null)
    setGoalDraft({
      anchorLabel: state.profile.anchorLabel,
      anchorDate: state.profile.anchorDate,
      semesterStart: state.profile.semesterStart,
      semesterEnd: state.profile.semesterEnd,
    })
  }

  function saveGoal() {
    setGoalSavedMsg(null)
    const { semesterStart, semesterEnd } = goalDraft
    if ((semesterStart && !semesterEnd) || (!semesterStart && semesterEnd)) {
      setGoalError('Set both term start and end, or leave both empty.')
      return
    }
    if (semesterStart && semesterEnd && semesterStart > semesterEnd) {
      setGoalError('Term end must be on or after term start.')
      return
    }
    setGoalError(null)
    setState((s) => ({
      ...s,
      profile: {
        ...s.profile,
        anchorLabel: goalDraft.anchorLabel.trim(),
        anchorDate: goalDraft.anchorDate,
        semesterStart: goalDraft.semesterStart,
        semesterEnd: goalDraft.semesterEnd,
      },
    }))
    setGoalSavedMsg('Saved.')
    window.setTimeout(() => setGoalSavedMsg(null), 2500)
  }

  function clearGoalAndTerm() {
    if (
      !window.confirm(
        'Clear anchor label, anchor date, and term dates? Your tasks, logs, and habits stay; the home countdown and term bar will be empty until you set a new goal.',
      )
    ) {
      return
    }
    setGoalError(null)
    setGoalSavedMsg(null)
    const empty: GoalDraft = {
      anchorLabel: '',
      anchorDate: '',
      semesterStart: '',
      semesterEnd: '',
    }
    setGoalDraft(empty)
    setState((s) => ({
      ...s,
      profile: {
        ...s.profile,
        ...empty,
      },
    }))
  }

  function updateCategory(id: string, label: string) {
    setState((s) => ({
      ...s,
      taskCategories: s.taskCategories.map((c) => (c.id === id ? { ...c, label } : c)),
    }))
  }

  function addCategory() {
    if (state.taskCategories.length >= MAX_CATEGORIES) return
    setState((s) => ({
      ...s,
      taskCategories: [...s.taskCategories, { id: newId(), label: 'New lane' }],
    }))
  }

  function removeCategory(id: string) {
    if (state.taskCategories.length <= MIN_CATEGORIES) return
    const remaining = state.taskCategories.filter((c) => c.id !== id)
    const fallback = remaining[0]!.id
    setState((s) => {
      const tasksByDay = { ...s.tasksByDay }
      for (const k of Object.keys(tasksByDay)) {
        const items = tasksByDay[k]!.items.map((t) =>
          t.categoryId === id ? { ...t, categoryId: fallback } : t,
        )
        tasksByDay[k] = { items }
      }
      return {
        ...s,
        taskCategories: remaining,
        tasksByDay,
      }
    })
  }

  function updateHabit(id: string, label: string) {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => (h.id === id ? { ...h, label } : h)),
    }))
  }

  function addHabit() {
    if (state.habits.length >= MAX_HABITS) return
    setState((s) => ({
      ...s,
      habits: [...s.habits, { id: newId(), label: 'New habit' }],
    }))
  }

  function removeHabit(id: string) {
    if (state.habits.length <= MIN_HABITS) return
    setState((s) => {
      const habitChecks: typeof s.habitChecks = {}
      for (const [day, checks] of Object.entries(s.habitChecks)) {
        const rest = { ...checks }
        delete rest[id]
        habitChecks[day] = rest
      }
      return {
        ...s,
        habits: s.habits.filter((h) => h.id !== id),
        habitChecks,
      }
    })
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        const next = importStateJson(text)
        setState(next)
        setImportError(null)
      } catch {
        setImportError('Could not read that file. Use a Term Anchor JSON export.')
      }
    }
    reader.readAsText(f)
  }

  const inputClass =
    'ta-glass-input w-full px-3 py-2.5 font-mono text-sm text-ta-text placeholder:text-ta-muted/70'

  return (
    <div className="max-w-2xl space-y-12 text-ta-text">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>

      <section className="ta-glass-panel ta-glass-panel--tilt-none space-y-4 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-ta-muted">Goal & term</h3>
        <p className="text-sm text-ta-muted leading-relaxed">
          Change your milestone and term window anytime — graduation, a new internship, next semester, or
          nothing at all. Clearing dates only affects the countdown and term progress on Today; the rest of
          your data is unchanged.
        </p>
        <label className="block space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ta-muted">Anchor label</span>
          <input
            className={inputClass}
            value={goalDraft.anchorLabel}
            onChange={(e) => setGoalDraft((d) => ({ ...d, anchorLabel: e.target.value }))}
            placeholder="e.g. Graduation, internship end, board exam"
          />
        </label>
        <label className="block space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ta-muted">Anchor date</span>
          <input
            type="date"
            className={inputClass}
            value={goalDraft.anchorDate}
            onChange={(e) => setGoalDraft((d) => ({ ...d, anchorDate: e.target.value }))}
          />
          <span className="text-xs text-ta-muted/90 font-sans leading-snug">
            Leave empty to hide the day countdown on Today.
          </span>
        </label>
        <label className="block space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ta-muted">Term start</span>
          <input
            type="date"
            className={inputClass}
            value={goalDraft.semesterStart}
            onChange={(e) => setGoalDraft((d) => ({ ...d, semesterStart: e.target.value }))}
          />
        </label>
        <label className="block space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ta-muted">Term end</span>
          <input
            type="date"
            className={inputClass}
            value={goalDraft.semesterEnd}
            onChange={(e) => setGoalDraft((d) => ({ ...d, semesterEnd: e.target.value }))}
          />
          <span className="text-xs text-ta-muted/90 font-sans leading-snug">
            Set both dates for the term progress bar, or clear both to hide it.
          </span>
        </label>
        {goalError ? <p className="text-sm text-ta-danger font-mono">{goalError}</p> : null}
        {goalSavedMsg ? (
          <p className="text-sm text-ta-success font-mono" role="status">
            {goalSavedMsg}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={saveGoal}
            className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md bg-ta-accent text-ta-bg shadow-[0_0_20px_-6px_rgba(232,255,71,0.45)] hover:shadow-[0_0_28px_-4px_rgba(232,255,71,0.55)] transition-shadow"
          >
            Save goal
          </button>
          <button
            type="button"
            onClick={discardGoalDraft}
            className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-white/12 text-ta-muted hover:border-white/25 hover:text-ta-text transition-colors"
          >
            Discard changes
          </button>
          <button
            type="button"
            onClick={clearGoalAndTerm}
            className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-ta-danger/40 text-ta-danger hover:bg-ta-danger/10 transition-colors"
          >
            Clear goal & term
          </button>
        </div>
      </section>

      <section className="ta-glass-panel ta-glass-panel--tilt-none space-y-4 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-ta-muted">Task lanes</h3>
        <p className="text-sm text-ta-muted leading-relaxed">
          Rename, add, or remove categories ({MIN_CATEGORIES}–{MAX_CATEGORIES}). Removing a lane moves its
          tasks to the first remaining lane.
        </p>
        <ul className="space-y-3">
          {state.taskCategories.map((c) => (
            <li key={c.id} className="flex gap-2 items-center">
              <input
                value={c.label}
                onChange={(e) => updateCategory(c.id, e.target.value)}
                className="ta-glass-input flex-1 px-3 py-2 font-mono text-sm text-ta-text"
              />
              <button
                type="button"
                disabled={state.taskCategories.length <= MIN_CATEGORIES}
                className="font-mono text-xs text-ta-danger px-2 py-2 disabled:opacity-30"
                onClick={() => removeCategory(c.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={state.taskCategories.length >= MAX_CATEGORIES}
          className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-white/12 hover:border-ta-accent/50 hover:shadow-[0_0_16px_-6px_rgba(232,255,71,0.25)] disabled:opacity-40 transition-all"
          onClick={addCategory}
        >
          Add lane
        </button>
      </section>

      <section className="ta-glass-panel ta-glass-panel--tilt-none space-y-4 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-ta-muted">Habits</h3>
        <p className="text-sm text-ta-muted leading-relaxed">
          Daily checkboxes on Today ({MIN_HABITS}–{MAX_HABITS}).
        </p>
        <ul className="space-y-3">
          {state.habits.map((h) => (
            <li key={h.id} className="flex gap-2 items-center">
              <input
                value={h.label}
                onChange={(e) => updateHabit(h.id, e.target.value)}
                className="ta-glass-input flex-1 px-3 py-2 font-mono text-sm text-ta-text"
              />
              <button
                type="button"
                disabled={state.habits.length <= MIN_HABITS}
                className="font-mono text-xs text-ta-danger px-2 py-2 disabled:opacity-30"
                onClick={() => removeHabit(h.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={state.habits.length >= MAX_HABITS}
          className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-white/12 hover:border-ta-accent/50 hover:shadow-[0_0_16px_-6px_rgba(232,255,71,0.25)] disabled:opacity-40 transition-all"
          onClick={addHabit}
        >
          Add habit
        </button>
      </section>

      <section className="ta-glass-panel ta-glass-panel--tilt-none space-y-4 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-ta-muted">Backup</h3>
        <p className="text-sm text-ta-muted leading-relaxed">
          Export your data as JSON. Store it somewhere safe. Import replaces your current saved data with
          the file contents.
        </p>
        {persistenceBackend === 'api' && (
          <p className="text-sm text-ta-muted leading-relaxed">
            With the local Term Anchor server, your data is kept in the app folder as{' '}
            <span className="font-mono text-ta-text/90">data/term-anchor-state.json</span>. Any browser you
            open to the same address shares that file, so switching browsers does not reset your progress.
          </p>
        )}
        {persistenceBackend === 'local' && (
          <p className="text-sm text-ta-muted leading-relaxed">
            This session is using browser storage only (for example static hosting or opening the built files
            without the local server). Use <span className="font-mono text-ta-text/90">Start-TermAnchor.cmd</span>{' '}
            for a disk-backed copy you can share across browsers.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => downloadBackup(state)}
            className="font-mono text-sm uppercase tracking-wider px-5 py-2.5 rounded-lg bg-ta-accent text-ta-bg shadow-[0_0_24px_-6px_rgba(232,255,71,0.5)] hover:shadow-[0_0_32px_-4px_rgba(232,255,71,0.65)] transition-shadow"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="font-mono text-sm uppercase tracking-wider px-5 py-2.5 rounded-lg border border-white/15 hover:border-ta-accent/50 hover:shadow-[0_0_20px_-6px_rgba(232,255,71,0.2)] transition-all"
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportFile}
          />
        </div>
        {importError && <p className="text-sm text-ta-danger font-mono">{importError}</p>}
      </section>
    </div>
  )
}
