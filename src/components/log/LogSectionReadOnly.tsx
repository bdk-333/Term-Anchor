import type { BoxNode, DayLogSection, OutlineNode } from '@/lib/types'

function OutlineRead({ nodes, listType }: { nodes: OutlineNode[]; listType: 'ordered' | 'unordered' }) {
  const Tag = listType === 'ordered' ? 'ol' : 'ul'
  if (!nodes.length) return null
  return (
    <Tag className={listType === 'ordered' ? 'list-decimal pl-5 space-y-2' : 'list-disc pl-5 space-y-2'}>
      {nodes.map((n) => (
        <li key={n.id} className="text-sm text-gs-text">
          {n.title ? <p className="font-medium text-gs-text mb-1">{n.title}</p> : null}
          {n.body.trim() ? (
            <p className="text-gs-muted whitespace-pre-wrap leading-relaxed">{n.body}</p>
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
          <p className="font-mono text-sm font-semibold text-gs-accent">{b.title || '—'}</p>
          {b.body?.trim() ? (
            <p className="text-sm text-gs-muted whitespace-pre-wrap leading-relaxed">{b.body}</p>
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
    <div className="gs-glass-panel gs-glass-panel--tilt-none p-4 border border-white/[0.06] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-wider text-gs-muted">
          {section.noteMode} · {section.title.trim() || 'Untitled section'}
        </p>
      </div>

      {section.noteMode === 'default' && (
        <p className="text-sm text-gs-muted whitespace-pre-wrap leading-relaxed">
          {section.details?.trim() || '—'}
        </p>
      )}

      {section.noteMode === 'cornell' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,32%)_1fr] gap-3">
            <div className="rounded-lg border border-rose-400/20 bg-rose-500/[0.06] p-2">
              <p className="font-mono text-[10px] uppercase text-rose-200/80 mb-1">Cues</p>
              <p className="text-sm text-gs-muted whitespace-pre-wrap">{section.cornellCues?.trim() || '—'}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <p className="font-mono text-[10px] uppercase text-gs-muted mb-1">Notes</p>
              <p className="text-sm text-gs-muted whitespace-pre-wrap">{section.cornellNotes?.trim() || '—'}</p>
            </div>
          </div>
          <div className="rounded-lg border border-sky-400/20 bg-sky-500/[0.06] p-2">
            <p className="font-mono text-[10px] uppercase text-sky-200/80 mb-1">Summary</p>
            <p className="text-sm text-gs-muted whitespace-pre-wrap">{section.cornellSummary?.trim() || '—'}</p>
          </div>
        </div>
      )}

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
                className="text-xs text-gs-accent underline break-all"
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
