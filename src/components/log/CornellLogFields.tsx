import type { DayLogSection } from '@/lib/types'

type Props = {
  section: DayLogSection
  onChange: (patch: Partial<DayLogSection>) => void
}

/** Cornell layout: cues column (left), notes (right), summary band (bottom). */
export function CornellLogFields({ section, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,32%)_minmax(0,1fr)] gap-3 min-h-[220px]">
        <div className="rounded-lg border border-rose-400/25 bg-rose-500/[0.08] p-3 flex flex-col min-h-[180px]">
          <label className="font-mono text-[10px] uppercase tracking-wider text-rose-200/90 mb-2">
            Cues · keywords · questions
          </label>
          <textarea
            value={section.cornellCues ?? ''}
            onChange={(e) => onChange({ cornellCues: e.target.value })}
            placeholder="Main ideas, study prompts, diagrams…"
            className="gs-glass-input flex-1 min-h-[120px] w-full px-2 py-2 text-sm text-gs-text resize-y font-sans leading-relaxed bg-black/20 border-white/10"
          />
        </div>
        <div className="rounded-lg border border-white/12 bg-white/[0.04] p-3 flex flex-col min-h-[180px]">
          <label className="font-mono text-[10px] uppercase tracking-wider text-gs-muted mb-2">
            Notes · during class / session
          </label>
          <textarea
            value={section.cornellNotes ?? ''}
            onChange={(e) => onChange({ cornellNotes: e.target.value })}
            placeholder="Lecture notes, concise sentences, lists…"
            className="gs-glass-input flex-1 min-h-[120px] w-full px-2 py-2 text-sm text-gs-text resize-y font-sans leading-relaxed"
          />
        </div>
      </div>
      <div className="rounded-lg border border-sky-400/25 bg-sky-500/[0.08] p-3">
        <label className="font-mono text-[10px] uppercase tracking-wider text-sky-200/90 mb-2 block">
          Summary · main ideas after review
        </label>
        <textarea
          value={section.cornellSummary ?? ''}
          onChange={(e) => onChange({ cornellSummary: e.target.value })}
          placeholder="Top-level takeaways, quick reference…"
          rows={3}
          className="gs-glass-input w-full px-2 py-2 text-sm text-gs-text resize-y font-sans leading-relaxed bg-black/20 border-white/10 min-h-[72px]"
        />
      </div>
    </div>
  )
}
