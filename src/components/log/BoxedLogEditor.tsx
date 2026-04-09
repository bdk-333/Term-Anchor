import { useMemo, useState } from 'react'
import type { BoxNode } from '@/lib/types'
import { emptyBoxNode } from '@/lib/logSections'

function collectIds(nodes: BoxNode[]): string[] {
  const out: string[] = []
  for (const b of nodes) {
    out.push(b.id, ...collectIds(b.children))
  }
  return out
}

function pathTo(nodes: BoxNode[], targetId: string, acc: string[] = []): string[] {
  for (const b of nodes) {
    if (b.id === targetId) return [...acc, b.id]
    const p = pathTo(b.children, targetId, [...acc, b.id])
    if (p.length) return p
  }
  return []
}

function getNode(nodes: BoxNode[], id: string): BoxNode | null {
  for (const b of nodes) {
    if (b.id === id) return b
    const f = getNode(b.children, id)
    if (f) return f
  }
  return null
}

function buildActiveZone(roots: BoxNode[], focusId: string | null): Set<string> {
  if (!focusId) return new Set(collectIds(roots))
  const path = pathTo(roots, focusId)
  if (!path.length) return new Set(collectIds(roots))
  const zone = new Set(path)
  const focusNode = getNode(roots, focusId)
  if (focusNode) {
    for (const id of collectIds(focusNode.children)) zone.add(id)
  }
  return zone
}

function mapBoxTree(nodes: BoxNode[], id: string, fn: (b: BoxNode) => BoxNode): BoxNode[] {
  return nodes.map((b) => {
    if (b.id === id) return fn(b)
    return { ...b, children: mapBoxTree(b.children, id, fn) }
  })
}

function removeBox(nodes: BoxNode[], id: string): BoxNode[] {
  return nodes
    .filter((b) => b.id !== id)
    .map((b) => ({ ...b, children: removeBox(b.children, id) }))
}

function addChildBox(nodes: BoxNode[], parentId: string): BoxNode[] {
  return nodes.map((b) => {
    if (b.id === parentId) return { ...b, children: [...b.children, emptyBoxNode()] }
    return { ...b, children: addChildBox(b.children, parentId) }
  })
}

function BoxCard({
  box,
  roots,
  focusId,
  setFocusId,
  onPatch,
  onRemove,
  onAddChild,
  depth,
}: {
  box: BoxNode
  roots: BoxNode[]
  focusId: string | null
  setFocusId: (id: string) => void
  onPatch: (id: string, patch: Partial<BoxNode>) => void
  onRemove: (id: string) => void
  onAddChild: (parentId: string) => void
  depth: number
}) {
  const zone = useMemo(() => buildActiveZone(roots, focusId), [roots, focusId])
  const dim = !zone.has(box.id)
  return (
    <div
      className={`rounded-lg border p-3 space-y-2 transition-opacity ${
        dim ? 'opacity-40 border-white/[0.06]' : 'opacity-100 border-[#39ff14]/25 shadow-[0_0_20px_-12px_rgba(57,255,20,0.35)]'
      }`}
      style={{ marginLeft: depth ? Math.min(depth * 12, 48) : 0 }}
    >
      <div className="flex items-start justify-between gap-2">
        <input
          value={box.title}
          onChange={(e) => onPatch(box.id, { title: e.target.value })}
          onFocus={() => setFocusId(box.id)}
          placeholder="Box title (required)"
          className="gs-glass-input flex-1 px-2 py-1.5 text-sm font-medium text-gs-text"
        />
        <button
          type="button"
          onClick={() => onRemove(box.id)}
          className="font-mono text-[10px] text-gs-danger shrink-0"
        >
          ×
        </button>
      </div>
      <textarea
        value={box.body ?? ''}
        onChange={(e) => onPatch(box.id, { body: e.target.value })}
        onFocus={() => setFocusId(box.id)}
        placeholder="Notes inside this box…"
        rows={3}
        className="gs-glass-input w-full px-2 py-1.5 text-sm text-gs-text resize-y font-sans"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setFocusId(box.id)
            onAddChild(box.id)
          }}
          className="font-mono text-[10px] uppercase text-[#6dff6d] hover:text-[#9fff9f]"
        >
          + Inner box
        </button>
      </div>
      {box.children.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          {box.children.map((ch) => (
            <BoxCard
              key={ch.id}
              box={ch}
              roots={roots}
              focusId={focusId}
              setFocusId={setFocusId}
              onPatch={onPatch}
              onRemove={onRemove}
              onAddChild={onAddChild}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type Props = {
  root: BoxNode[]
  onChangeRoot: (next: BoxNode[]) => void
}

export function BoxedLogEditor({ root, onChangeRoot }: Props) {
  const [focusId, setFocusId] = useState<string | null>(null)

  function onPatch(id: string, patch: Partial<BoxNode>) {
    onChangeRoot(mapBoxTree(root, id, (b) => ({ ...b, ...patch })))
  }
  function onRemove(id: string) {
    onChangeRoot(removeBox(root, id))
    if (focusId === id) setFocusId(null)
  }
  function onAddChild(parentId: string) {
    onChangeRoot(addChildBox(root, parentId))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const n = emptyBoxNode()
            onChangeRoot([...root, n])
            setFocusId(n.id)
          }}
          className="font-mono text-[10px] uppercase px-3 py-1.5 rounded-md border border-[#39ff14]/35 text-[#7fff7f]"
        >
          + Level-1 box
        </button>
        <span className="font-mono text-[10px] text-gs-muted">Click a box to focus; others dim slightly.</span>
      </div>
      {root.length === 0 ? (
        <p className="text-xs text-gs-muted">Add a top-level box. Each box needs a title.</p>
      ) : (
        <div className="space-y-3">
          {root.map((b) => (
            <BoxCard
              key={b.id}
              box={b}
              roots={root}
              focusId={focusId}
              setFocusId={setFocusId}
              onPatch={onPatch}
              onRemove={onRemove}
              onAddChild={onAddChild}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
