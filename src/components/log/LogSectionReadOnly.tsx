import { getCornellRows } from '@/lib/logSections'
import type { BoxNode, DayLogSection, OutlineNode } from '@/lib/types'

function OutlineRead({ nodes, listType }: { nodes: OutlineNode[]; listType: 'ordered' | 'unordered' }) {
  const Tag = listType === 'ordered' ? 'ol' : 'ul'
  if (!nodes.length) return null
  return (
    <Tag className={listType === 'ordered' ? 'list-decimal pl-5 space-y-2' : 'list-disc pl-5 space-y-2'}>
      {nodes.map((n) => (
        <li key={n.id} className="text-sm text-ta-text">
          {n.title ? <p className="font-medium text-ta-text mb-1">{n.title}</p> : null}
          {n.body.trim() ? (
            <p className="text-ta-muted whitespace-pre-wrap leading-relaxed">{n.body}</p>
          ) : null}
          {n.children.length > 0 && (
            <OutlineRead nodes={n.children} listType={n.childrenListType} />
          )}
        </li>
      ))}
    </Tag>
  )
}

function BoxRead({ nodes, depth = 0 }: { nodes: BoxNode[]; depth?: number }) {
  if (!nodes.length) return null
  return (
    <div className="space-y-3" style={{ marginLeft: depth ? 12 : 0 }}>
      {nodes.map((b) => (
        <div
          key={b.id}
          className="rounded-lg border border-white/12 bg-black/20 p-3 space-y-2"
        >
          <p className="font-mono text-sm font-semibold text-ta-accent">{b.title || '—'}</p>
          {b.body?.trim() ? (
            <p className="text-sm text-ta-muted whitespace-pre-wrap leading-relaxed">{b.body}</p>
          ) : null}
          {b.children.length > 0 && <BoxRead nodes={b.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  )
}

export function LogSectionReadOnly({ section }: { section: DayLogSection }) {
  const atts = section.attachments ?? []
  return (
    <div className="ta-glass-panel ta-glass-panel--tilt-none p-4 border border-white/[0.06] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-wider text-ta-muted">
          {section.noteMode} · {section.title.trim() || 'Untitled section'}
        </p>
      </div>

      {section.noteMode === 'default' && (
        <p className="text-sm text-ta-muted whitespace-pre-wrap leading-relaxed">
          {section.details?.trim() || '—'}
        </p>
      )}

      {section.noteMode === 'cornell' && (() => {
        const cornellRows = getCornellRows(section)
        const pct = Math.min(70, Math.max(15, section.cornellCueColumnPct ?? 35))
        return (
          <div className="space-y-3">
            <div className="rounded-lg border border-rose-400/20 bg-rose-500/[0.06] overflow-hidden">
              <p className="font-mono text-[10px] uppercase text-rose-200/80 px-3 pt-2 pb-1">Cues & notes</p>
              <div className="divide-y divide-white/[0.08] border-t border-white/[0.08]">
                {cornellRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid gap-2 px-3 py-2.5 text-sm"
                    style={{
                      gridTemplateColumns: `minmax(0, ${pct}%) minmax(0, 1fr)`,
                    }}
                  >
                    <div className="flex gap-2 items-start min-w-0 border-r border-white/[0.08] pr-3">
                      <span className="text-rose-200/90 shrink-0 font-sans" aria-hidden>
                        -
                      </span>
                      <p className="text-ta-text whitespace-pre-wrap leading-relaxed min-w-0">
                        {row.cue.trim() ? row.cue : '—'}
                      </p>
                    </div>
                    <div className="flex gap-2 items-start min-w-0">
                      <span className="text-sky-300/85 shrink-0 font-sans" aria-hidden>
                        *
                      </span>
                      <p className="text-ta-muted whitespace-pre-wrap leading-relaxed min-w-0">
                        {row.notes.trim() ? row.notes : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-sky-400/20 bg-sky-500/[0.06] p-2">
              <p className="font-mono text-[10px] uppercase text-sky-200/80 mb-1">Summary</p>
              <p className="text-sm text-ta-muted whitespace-pre-wrap">{section.cornellSummary?.trim() || '—'}</p>
            </div>
          </div>
        )
      })()}

      {section.noteMode === 'outline' && (
        <OutlineRead
          nodes={section.outlineRoot ?? []}
          listType={section.outlineTopListType ?? 'unordered'}
        />
      )}

      {section.noteMode === 'boxed' && <BoxRead nodes={section.boxedRoot ?? []} />}

      {atts.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
          {atts.map((a) =>
            a.kind === 'image' && a.data ? (
              <img key={a.id} src={a.data} alt="" className="max-h-32 rounded border border-white/10" />
            ) : (
              <a
                key={a.id}
                href={a.href}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-ta-accent underline break-all"
              >
                {a.label || a.href}
              </a>
            ),
          )}
        </div>
      )}
    </div>
  )
}
