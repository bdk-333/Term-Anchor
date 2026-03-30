import type { DaySection } from '@/lib/types'
import { emptySection } from '@/lib/daySections'

const MAX_SECTIONS = 12

type Props = {
  label: string
  sections: DaySection[]
  onChange: (next: DaySection[]) => void
  titlePlaceholder: string
  detailsPlaceholder: string
  addSectionLabel: string
}

export function DaySectionsEditor({
  label,
  sections,
  onChange,
  titlePlaceholder,
  detailsPlaceholder,
  addSectionLabel,
}: Props) {
  function updateSection(id: string, patch: Partial<Pick<DaySection, 'title' | 'details'>>) {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function removeSection(id: string) {
    onChange(sections.filter((s) => s.id !== id))
  }

  function addSection() {
    if (sections.length >= MAX_SECTIONS) return
    onChange([...sections, emptySection()])
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted">
          {label}
        </span>
        <button
          type="button"
          onClick={addSection}
          disabled={sections.length >= MAX_SECTIONS}
          className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-white/12 hover:border-gs-accent/50 hover:shadow-[0_0_16px_-6px_rgba(232,255,71,0.25)] disabled:opacity-35 transition-all"
        >
          {addSectionLabel}
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-gs-muted leading-relaxed">
          No sections yet. Add one for a broad focus (title) and optional details.
        </p>
      ) : (
        <ul className="space-y-4">
          {sections.map((s, idx) => (
            <li
              key={s.id}
              className="gs-glass-panel gs-glass-panel--tilt-none p-4 space-y-3 border border-white/[0.06]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-gs-muted">
                  Section {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeSection(s.id)}
                  className="font-mono text-xs text-gs-muted hover:text-gs-danger"
                >
                  Remove
                </button>
              </div>
              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-gs-muted">
                  Title / broad focus
                </span>
                <input
                  value={s.title}
                  onChange={(e) => updateSection(s.id, { title: e.target.value })}
                  placeholder={titlePlaceholder}
                  className="gs-glass-input w-full px-3 py-2 text-sm text-gs-text font-sans"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-gs-muted">
                  Details (paragraphs, bullets, extra context)
                </span>
                <textarea
                  value={s.details}
                  onChange={(e) => updateSection(s.id, { details: e.target.value })}
                  rows={4}
                  placeholder={detailsPlaceholder}
                  className="gs-glass-input w-full px-3 py-2.5 text-sm text-gs-text resize-y font-sans leading-relaxed min-h-[100px]"
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
