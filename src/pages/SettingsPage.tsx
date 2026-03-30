import { useRef, useState } from 'react'
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

export function SettingsPage() {
  const { state, setState } = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  if (!state.profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />
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

  return (
    <div className="max-w-2xl space-y-12 text-gs-text">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>

      <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-4 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gs-muted">Task lanes</h3>
        <p className="text-sm text-gs-muted leading-relaxed">
          Rename, add, or remove categories ({MIN_CATEGORIES}–{MAX_CATEGORIES}). Removing a lane moves its
          tasks to the first remaining lane.
        </p>
        <ul className="space-y-3">
          {state.taskCategories.map((c) => (
            <li key={c.id} className="flex gap-2 items-center">
              <input
                value={c.label}
                onChange={(e) => updateCategory(c.id, e.target.value)}
                className="gs-glass-input flex-1 px-3 py-2 font-mono text-sm text-gs-text"
              />
              <button
                type="button"
                disabled={state.taskCategories.length <= MIN_CATEGORIES}
                className="font-mono text-xs text-gs-danger px-2 py-2 disabled:opacity-30"
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
          className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-white/12 hover:border-gs-accent/50 hover:shadow-[0_0_16px_-6px_rgba(232,255,71,0.25)] disabled:opacity-40 transition-all"
          onClick={addCategory}
        >
          Add lane
        </button>
      </section>

      <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-4 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gs-muted">Habits</h3>
        <p className="text-sm text-gs-muted leading-relaxed">
          Daily checkboxes on Today ({MIN_HABITS}–{MAX_HABITS}).
        </p>
        <ul className="space-y-3">
          {state.habits.map((h) => (
            <li key={h.id} className="flex gap-2 items-center">
              <input
                value={h.label}
                onChange={(e) => updateHabit(h.id, e.target.value)}
                className="gs-glass-input flex-1 px-3 py-2 font-mono text-sm text-gs-text"
              />
              <button
                type="button"
                disabled={state.habits.length <= MIN_HABITS}
                className="font-mono text-xs text-gs-danger px-2 py-2 disabled:opacity-30"
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
          className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-md border border-white/12 hover:border-gs-accent/50 hover:shadow-[0_0_16px_-6px_rgba(232,255,71,0.25)] disabled:opacity-40 transition-all"
          onClick={addHabit}
        >
          Add habit
        </button>
      </section>

      <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-4 p-5 sm:p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gs-muted">Backup</h3>
        <p className="text-sm text-gs-muted leading-relaxed">
          Export your data as JSON. Store it somewhere safe. Import replaces everything in this browser
          with the file contents.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => downloadBackup(state)}
            className="font-mono text-sm uppercase tracking-wider px-5 py-2.5 rounded-lg bg-gs-accent text-gs-bg shadow-[0_0_24px_-6px_rgba(232,255,71,0.5)] hover:shadow-[0_0_32px_-4px_rgba(232,255,71,0.65)] transition-shadow"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="font-mono text-sm uppercase tracking-wider px-5 py-2.5 rounded-lg border border-white/15 hover:border-gs-accent/50 hover:shadow-[0_0_20px_-6px_rgba(232,255,71,0.2)] transition-all"
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
        {importError && <p className="text-sm text-gs-danger font-mono">{importError}</p>}
      </section>
    </div>
  )
}
