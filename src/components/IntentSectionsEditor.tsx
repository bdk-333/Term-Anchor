import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DaySection } from '@/lib/types'
import { emptySection } from '@/lib/daySections'

const MAX_SECTIONS = 12

function SortableIntentItem({
  section,
  onPatch,
  onRemove,
  titlePlaceholder,
  detailsPlaceholder,
}: {
  section: DaySection
  onPatch: (id: string, patch: Partial<Pick<DaySection, 'title' | 'details'>>) => void
  onRemove: (id: string) => void
  titlePlaceholder: string
  detailsPlaceholder: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`ta-glass-panel ta-glass-panel--tilt-none p-4 space-y-3 border border-white/[0.06] ${
        isDragging ? 'opacity-60 ring-1 ring-ta-accent/40' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing font-mono text-ta-muted touch-none px-1"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          ⋮⋮
        </button>
        <button
          type="button"
          onClick={() => onRemove(section.id)}
          className="font-mono text-xs text-ta-muted hover:text-ta-danger ml-auto"
        >
          Remove
        </button>
      </div>
      <label className="block space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ta-muted">
          Title / broad focus
        </span>
        <input
          value={section.title}
          onChange={(e) => onPatch(section.id, { title: e.target.value })}
          placeholder={titlePlaceholder}
          className="ta-glass-input w-full px-3 py-2 text-sm text-ta-text font-sans"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ta-muted">
          Details (paragraphs, bullets, extra context)
        </span>
        <textarea
          value={section.details}
          onChange={(e) => onPatch(section.id, { details: e.target.value })}
          rows={4}
          placeholder={detailsPlaceholder}
          className="ta-glass-input w-full px-3 py-2.5 text-sm text-ta-text resize-y font-sans leading-relaxed min-h-[100px]"
        />
      </label>
    </li>
  )
}

type Props = {
  label: string
  sections: DaySection[]
  onChange: (next: DaySection[]) => void
  titlePlaceholder: string
  detailsPlaceholder: string
  addSectionLabel: string
}

export function IntentSectionsEditor({
  label,
  sections,
  onChange,
  titlePlaceholder,
  detailsPlaceholder,
  addSectionLabel,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function patchSection(id: string, patch: Partial<Pick<DaySection, 'title' | 'details'>>) {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function removeSection(id: string) {
    onChange(sections.filter((s) => s.id !== id))
  }

  function addSection() {
    if (sections.length >= MAX_SECTIONS) return
    onChange([...sections, emptySection()])
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onChange(arrayMove(sections, oldIndex, newIndex))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ta-muted">{label}</span>
        <button
          type="button"
          onClick={addSection}
          disabled={sections.length >= MAX_SECTIONS}
          className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-white/12 hover:border-ta-accent/50 hover:shadow-[0_0_16px_-6px_rgba(232,255,71,0.25)] disabled:opacity-35 transition-all"
        >
          {addSectionLabel}
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-ta-muted leading-relaxed">
          No sections yet. Add one for a broad focus (title) and optional details.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-4">
              {sections.map((s) => (
                <SortableIntentItem
                  key={s.id}
                  section={s}
                  onPatch={patchSection}
                  onRemove={removeSection}
                  titlePlaceholder={titlePlaceholder}
                  detailsPlaceholder={detailsPlaceholder}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
