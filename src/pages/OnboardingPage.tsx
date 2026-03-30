import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAppState } from '@/context/AppStateContext'

const steps = ['Anchor & term', 'Optional context', 'Ready']

const inputClass =
  'gs-glass-input w-full px-3 py-2.5 font-mono text-sm text-gs-text placeholder:text-gs-muted/70 placeholder:font-sans'

export function OnboardingPage() {
  const { state, setState } = useAppState()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const [anchorLabel, setAnchorLabel] = useState(state.profile.anchorLabel || 'Graduation')
  const [anchorDate, setAnchorDate] = useState(state.profile.anchorDate || '')
  const [semesterStart, setSemesterStart] = useState(state.profile.semesterStart || '')
  const [semesterEnd, setSemesterEnd] = useState(state.profile.semesterEnd || '')
  const [displayName, setDisplayName] = useState(state.profile.displayName || '')
  const [degreeFocus, setDegreeFocus] = useState(state.profile.degreeFocus || '')
  const [jobTarget, setJobTarget] = useState(state.profile.jobTarget || '')
  const [commuteMinutes, setCommuteMinutes] = useState(
    state.profile.commuteMinutes != null ? String(state.profile.commuteMinutes) : '',
  )
  const [weekendNotes, setWeekendNotes] = useState(state.profile.weekendNotes || '')

  if (state.profile.onboardingComplete) {
    return <Navigate to="/" replace />
  }

  const step1Valid = Boolean(anchorDate && semesterStart && semesterEnd && anchorLabel.trim())

  function finish() {
    setState((s) => ({
      ...s,
      profile: {
        ...s.profile,
        anchorLabel: anchorLabel.trim(),
        anchorDate,
        semesterStart,
        semesterEnd,
        displayName: displayName.trim() || undefined,
        degreeFocus: degreeFocus.trim() || undefined,
        jobTarget: jobTarget.trim() || undefined,
        commuteMinutes: commuteMinutes.trim() ? Number(commuteMinutes) : undefined,
        weekendNotes: weekendNotes.trim() || undefined,
        onboardingComplete: true,
      },
    }))
    navigate('/', { replace: true })
  }

  return (
    <div className="gs-onboarding-shell gs-container max-w-lg">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted mb-8">
        Setup · local only, your device
      </p>
      <div className="flex gap-2 mb-10">
        {steps.map((label, i) => (
          <div
            key={label}
            className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? 'bg-gs-accent2' : 'bg-gs-border'}`}
            title={label}
          />
        ))}
      </div>

      {step === 0 && (
        <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-8 p-6 sm:p-7">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gs-text">Anchor & this term</h2>
            <p className="text-gs-muted text-sm leading-relaxed">
              Pick any milestone that matters right now — graduation, end of semester, internship wrap,
              or a big exam. The term dates power your progress bar.
            </p>
          </div>
          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-gs-muted">
              Anchor label
            </span>
            <input
              className={inputClass}
              value={anchorLabel}
              onChange={(e) => setAnchorLabel(e.target.value)}
              placeholder="Example: Spring graduation, thesis defense, or last day of internship."
            />
          </label>
          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-gs-muted">
              Anchor date
            </span>
            <input
              type="date"
              className={inputClass}
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
            />
            <span className="text-xs text-gs-muted/90 font-sans leading-snug block mt-1">
              Choose the calendar day of that milestone so the countdown stays accurate.
            </span>
          </label>
          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-gs-muted">
              Term start
            </span>
            <input
              type="date"
              className={inputClass}
              value={semesterStart}
              onChange={(e) => setSemesterStart(e.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-gs-muted">
              Term end
            </span>
            <input
              type="date"
              className={inputClass}
              value={semesterEnd}
              onChange={(e) => setSemesterEnd(e.target.value)}
            />
            <span className="text-xs text-gs-muted/90 font-sans leading-snug block mt-1">
              Example: Use the first day of classes and the last day of finals for a full-term progress bar.
            </span>
          </label>
          <button
            type="button"
            disabled={!step1Valid}
            className="w-full py-3.5 rounded-lg font-mono text-sm uppercase tracking-wider bg-gs-accent text-gs-bg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 transition-opacity shadow-[0_0_24px_-6px_rgba(232,255,71,0.55)]"
            onClick={() => setStep(1)}
          >
            Continue
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-8 p-6 sm:p-7">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gs-text">Optional context</h2>
            <p className="text-gs-muted text-sm leading-relaxed">
              Skip anything you like. This stays on your device and helps future features (like commute
              planning) feel personal.
            </p>
          </div>
          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-gs-muted">
              What to call you (optional)
            </span>
            <input
              className={inputClass}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Example: You can enter your first name or any nickname you like."
            />
          </label>
          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-gs-muted">
              Degree / focus (optional)
            </span>
            <input
              className={inputClass}
              value={degreeFocus}
              onChange={(e) => setDegreeFocus(e.target.value)}
              placeholder="Example: I am studying data science and focusing on machine learning for health."
            />
          </label>
          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-gs-muted">
              Role or goal (optional)
            </span>
            <input
              className={inputClass}
              value={jobTarget}
              onChange={(e) => setJobTarget(e.target.value)}
              placeholder="Example: I want a summer internship as a software engineer at a product company."
            />
          </label>
          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-gs-muted">
              Typical commute (minutes, optional)
            </span>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={commuteMinutes}
              onChange={(e) => setCommuteMinutes(e.target.value)}
              placeholder="Example: 35"
            />
            <span className="text-xs text-gs-muted/90 font-sans leading-snug block mt-1">
              Rough one-way minutes to campus or your main study spot; you can leave this blank.
            </span>
          </label>
          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-gs-muted">
              Weekend / home notes (optional)
            </span>
            <textarea
              className={`${inputClass} min-h-[100px] resize-y font-sans`}
              value={weekendNotes}
              onChange={(e) => setWeekendNotes(e.target.value)}
              placeholder="Example: My roommates are loud on Saturday night, so I plan quiet work for Sunday morning instead."
            />
          </label>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 py-3.5 rounded-lg font-mono text-sm uppercase tracking-wider border border-gs-border text-gs-muted hover:text-gs-text hover:border-gs-muted transition-colors"
              onClick={() => setStep(0)}
            >
              Back
            </button>
            <button
              type="button"
              className="flex-1 py-3.5 rounded-lg font-mono text-sm uppercase tracking-wider bg-gs-accent text-gs-bg hover:opacity-95 transition-opacity"
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="gs-glass-panel gs-glass-panel--tilt-none space-y-8 p-6 sm:p-7">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gs-text">You are set</h2>
            <p className="text-gs-muted text-sm leading-relaxed">
              Data lives in your browser only. Use Settings anytime to export a backup JSON file.
            </p>
          </div>
          <ul className="font-mono text-xs text-gs-muted space-y-3 gs-glass-input p-5 rounded-lg">
            <li>
              <span className="text-gs-accent">Anchor:</span> {anchorLabel} · {anchorDate || '—'}
            </li>
            <li>
              <span className="text-gs-accent2">Term:</span> {semesterStart || '—'} →{' '}
              {semesterEnd || '—'}
            </li>
          </ul>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 py-3.5 rounded-lg font-mono text-sm uppercase tracking-wider border border-gs-border text-gs-muted hover:text-gs-text transition-colors"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              type="button"
              className="flex-1 py-3.5 rounded-lg font-mono text-sm uppercase tracking-wider bg-gs-accent text-gs-bg hover:opacity-95 transition-opacity"
              onClick={finish}
            >
              Open Today
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
