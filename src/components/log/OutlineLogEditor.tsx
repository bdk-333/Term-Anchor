import type { OutlineNode } from '@/lib/types'
import { emptyOutlineNode } from '@/lib/logSections'

function updateNodeById(
  nodes: OutlineNode[],
  id: string,
  fn: (n: OutlineNode) => OutlineNode,
): OutlineNode[] {
  return nodes.map((n) => {
    if (n.id === id) return fn(n)
    if (n.children.length)
      return { ...n, children: updateNodeById(n.children, id, fn) }
    return n
  })
}

function removeNodeById(nodes: OutlineNode[], id: string): OutlineNode[] {
  const out: OutlineNode[] = []
  for (const n of nodes) {
    if (n.id === id) continue
    out.push({
      ...n,
      children: n.children.length ? removeNodeById(n.children, id) : [],
    })
  }
  return out
}

function insertSiblingAfter(
  nodes: OutlineNode[],
  afterId: string,
  newNode: OutlineNode,
): OutlineNode[] {
  const idx = nodes.findIndex((n) => n.id === afterId)
  if (idx >= 0) {
    const next = [...nodes]
    next.splice(idx + 1, 0, newNode)
    return next
  }
  return nodes.map((n) => ({
    ...n,
    children: insertSiblingAfter(n.children, afterId, newNode),
  }))
}

function insertChild(nodes: OutlineNode[], parentId: string, newNode: OutlineNode): OutlineNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: [...n.children, newNode] }
    return { ...n, children: insertChild(n.children, parentId, newNode) }
  })
}

function OutlineRow({
  node,
  depth,
  onUpdate,
  onRemove,
  onAddSibling,
  onAddChild,
}: {
  node: OutlineNode
  depth: number
  onUpdate: (id: string, patch: Partial<OutlineNode>) => void
  onRemove: (id: string) => void
  onAddSibling: (afterId: string) => void
  onAddChild: (parentId: string) => void
}) {
  const ListTag = node.childrenListType === 'ordered' ? 'ol' : 'ul'
  return (
    <li className="mt-2">
      <div
        className="rounded-md border border-white/[0.08] bg-black/20 p-2 space-y-2"
        style={{ marginLeft: depth === 0 ? 0 : 8 }}
      >
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={node.title ?? ''}
            onChange={(e) => onUpdate(node.id, { title: e.target.value })}
            placeholder="Optional title"
            className="ta-glass-input flex-1 min-w-[120px] px-2 py-1 text-xs text-ta-text font-sans"
          />
          <select
            value={node.childrenListType}
            onChange={(e) =>
              onUpdate(node.id, {
                childrenListType: e.target.value as 'ordered' | 'unordered',
              })
            }
            aria-label="List type for nested items"
            className="ta-native-select text-xs max-w-[140px]"
          >
            <option value="unordered">Nested: bullets</option>
            <option value="ordered">Nested: numbered</option>
          </select>
        </div>
        <textarea
          value={node.body}
          onChange={(e) => onUpdate(node.id, { body: e.target.value })}
          placeholder="Item text"
          rows={2}
          className="ta-glass-input w-full px-2 py-1.5 text-sm text-ta-text resize-y font-sans"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAddSibling(node.id)}
            className="font-mono text-[10px] uppercase text-ta-muted hover:text-ta-accent"
          >
            + Sibling
          </button>
          <button
            type="button"
            onClick={() => onAddChild(node.id)}
            className="font-mono text-[10px] uppercase text-ta-muted hover:text-ta-accent"
          >
            + Nested
          </button>
          <button
            type="button"
            onClick={() => onRemove(node.id)}
            className="font-mono text-[10px] uppercase text-ta-danger/80 hover:text-ta-danger ml-auto"
          >
            Remove
          </button>
        </div>
        {node.children.length > 0 && (
          <ListTag
            className={`pl-4 space-y-1 ${node.childrenListType === 'ordered' ? 'list-decimal' : 'list-disc'}`}
          >
            {node.children.map((ch) => (
              <OutlineRow
                key={ch.id}
                node={ch}
                depth={depth + 1}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onAddSibling={onAddSibling}
                onAddChild={onAddChild}
              />
            ))}
          </ListTag>
        )}
      </div>
    </li>
  )
}

type Props = {
  topListType: 'ordered' | 'unordered'
  onTopListType: (t: 'ordered' | 'unordered') => void
  root: OutlineNode[]
  onChangeRoot: (next: OutlineNode[]) => void
}

export function OutlineLogEditor({ topListType, onTopListType, root, onChangeRoot }: Props) {
  function onUpdate(id: string, patch: Partial<OutlineNode>) {
    onChangeRoot(updateNodeById(root, id, (n) => ({ ...n, ...patch })))
  }
  function onRemove(id: string) {
    onChangeRoot(removeNodeById(root, id))
  }
  function onAddSibling(afterId: string) {
    onChangeRoot(insertSiblingAfter(root, afterId, emptyOutlineNode()))
  }
  function onAddChild(parentId: string) {
    onChangeRoot(insertChild(root, parentId, emptyOutlineNode()))
  }

  const ListTag = topListType === 'ordered' ? 'ol' : 'ul'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase text-ta-muted">Top level</span>
        <select
          value={topListType}
          onChange={(e) => onTopListType(e.target.value as 'ordered' | 'unordered')}
          aria-label="Top-level list type"
          className="ta-native-select text-xs"
        >
          <option value="unordered">Bullets</option>
          <option value="ordered">Numbered</option>
        </select>
        <button
          type="button"
          onClick={() => onChangeRoot([...root, emptyOutlineNode()])}
          className="font-mono text-[10px] uppercase px-2 py-1 rounded border border-white/15 text-ta-muted hover:border-ta-accent/40"
        >
          + Top item
        </button>
      </div>
      {root.length === 0 ? (
        <p className="text-xs text-ta-muted">Add a top-level outline item to begin.</p>
      ) : (
        <ListTag className={topListType === 'ordered' ? 'list-decimal pl-5 space-y-2' : 'list-disc pl-5 space-y-2'}>
          {root.map((n) => (
            <OutlineRow
              key={n.id}
              node={n}
              depth={0}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddSibling={onAddSibling}
              onAddChild={onAddChild}
            />
          ))}
        </ListTag>
      )}
    </div>
  )
}
