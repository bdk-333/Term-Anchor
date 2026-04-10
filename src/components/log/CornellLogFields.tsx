import { useCallback, useEffect, useRef, useState } from 'react'
import { getCornellRows } from '@/lib/logSections'
import { newId } from '@/lib/id'
import type { CornellCueNoteRow, DayLogSection } from '@/lib/types'

type Props = {
  section: DayLogSection
  onChange: (patch: Partial<DayLogSection>) => void
}

const PCT_MIN = 15
const PCT_MAX = 70

/** Linked cue (–) / notes (*) rows; draggable column split; shared vertical resize. */
export function CornellLogFields({ section, onChange }: Props) {
  const rows = getCornellRows(section)
  const pctFromParent = section.cornellCueColumnPct ?? 35
  const [pct, setPct] = useState(() => Math.min(PCT_MAX, Math.max(PCT_MIN, pctFromParent)))
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPct(Math.min(PCT_MAX, Math.max(PCT_MIN, pctFromParent)))
  }, [pctFromParent, section.id])

  const commitRows = useCallback(
    (next: CornellCueNoteRow[]) => {
      onChange({
        cornellRows: next,
        cornellCues: '',
        cornellNotes: '',
      })
    },
    [onChange],
  )

  const onDragMove = useRef<(e: MouseEvent) => void>(() => {})
  const endDrag = useRef<() => void>(() => {})

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const el = wrapRef.current
      if (!el) return
      const onMove = (ev: MouseEvent) => {
        const rect = el.getBoundingClientRect()
        const x = ev.clientX - rect.left
        let next = (x / rect.width) * 100
        next = Math.min(PCT_MAX, Math.max(PCT_MIN, next))
        setPct(next)
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        setPct((p) => {
          const clamped = Math.min(PCT_MAX, Math.max(PCT_MIN, p))
          onChange({ cornellCueColumnPct: clamped })
          return clamped
        })
      }
      onDragMove.current = onMove
      endDrag.current = onUp
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [onChange],
  )

  function updateRow(id: string, patch: Partial<CornellCueNoteRow>) {
    commitRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function addRow() {
    commitRows([...rows, { id: newId(), cue: '', notes: '' }])
  }

  function removeRow(id: string) {
    if (rows.length <= 1) return
    commitRows(rows.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-rose-400/20 bg-gradient-to-br from-rose-500/[0.07] to-black/25 p-1">
        <p className="font-mono text-[10px] uppercase tracking-wider text-rose-200/85 px-3 pt-2 pb-1">
          Cues & notes · drag the center bar for column width; drag the bottom-right corner of each cue or
          notes box to change its height
        </p>
        <div
          ref={wrapRef}
          className="relative mx-2 mb-2 rounded-md border border-white/[0.08] bg-black/25 min-h-[200px] max-h-[min(72vh,840px)] resize-y overflow-auto"
        >
          <div
            className="grid min-h-[160px]"
            style={{
              gridTemplateColumns: `minmax(0, ${pct}%) 6px minmax(0, 1fr)`,
            }}
          >
            {rows.map((row, i) => (
              <div key={row.id} className="contents">
                <div
                  className={`flex gap-1.5 items-start px-2 py-2.5 min-h-0 min-w-0 border-r border-white/[0.10] ${
                    i > 0 ? 'border-t border-white/[0.08]' : ''
                  }`}
                  style={{ gridColumn: 1, gridRow: i + 1 }}
                >
                  <span
                    className="mt-2 font-sans text-rose-200/90 select-none shrink-0 w-3 text-center"
                    aria-hidden
                  >
                    -
                  </span>
                  <textarea
                    value={row.cue}
                    onChange={(e) => updateRow(row.id, { cue: e.target.value })}
                    placeholder="Short cue"
                    rows={3}
                    className="gs-glass-input box-border w-full min-h-[3.25rem] min-w-0 px-2 py-1.5 text-sm text-gs-text resize-y font-sans leading-snug bg-black/15 border-white/10"
                    aria-label={`Cue ${i + 1}`}
                  />
                </div>

                <div
                  className={`flex gap-1.5 items-start px-2 py-2.5 min-h-0 min-w-0 ${
                    i > 0 ? 'border-t border-white/[0.08]' : ''
                  }`}
                  style={{ gridColumn: 3, gridRow: i + 1 }}
                >
                  <span
                    className="mt-2 font-sans text-sky-300/85 select-none shrink-0 w-3 text-center"
                    aria-hidden
                  >
                    *
                  </span>
                  <textarea
                    value={row.notes}
                    onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                    placeholder="Notes for this cue (use * at line starts if you like)"
                    rows={6}
                    className="gs-glass-input box-border w-full min-h-[5.5rem] min-w-0 px-2 py-1.5 text-sm text-gs-text resize-y font-sans leading-relaxed bg-black/10 border-white/10"
                    aria-label={`Notes for cue ${i + 1}`}
                  />
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      className="font-mono text-xs text-gs-danger/90 hover:text-gs-danger shrink-0 self-start pt-1 px-0.5"
                      onClick={() => removeRow(row.id)}
                      aria-label={`Remove row ${i + 1}`}
                    >
                      ×
                    </button>
                  ) : (
                    <span className="w-5 shrink-0" aria-hidden />
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              aria-label="Resize cues and notes column widths"
              className="cursor-col-resize bg-white/[0.06] hover:bg-gs-accent/20 border-x border-white/10 hover:border-gs-accent/35 z-10 min-h-[120px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
              style={{ gridColumn: 2, gridRow: '1 / -1' }}
              onMouseDown={startDrag}
            />
          </div>

          <div className="px-2 py-2 border-t border-white/[0.08] bg-black/20">
            <button
              type="button"
              onClick={addRow}
              className="font-mono text-[10px] uppercase tracking-wider text-gs-accent/90 hover:text-gs-accent border border-dashed border-gs-accent/35 rounded-md px-3 py-1.5 w-full sm:w-auto"
            >
              + Add cue & notes row
            </button>
          </div>
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
