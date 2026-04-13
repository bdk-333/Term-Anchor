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
import { useRef } from 'react'
import { BoxedLogEditor } from '@/components/log/BoxedLogEditor'
import { CornellLogFields } from '@/components/log/CornellLogFields'
import { OutlineLogEditor } from '@/components/log/OutlineLogEditor'
import { emptyLogSection } from '@/lib/logSections'
import { newId } from '@/lib/id'
import type { DayLogSection, LogAttachment, NoteMode } from '@/lib/types'

const MAX_SECTIONS = 12
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const MODE_OPTIONS: { value: NoteMode; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'cornell', label: 'Cornell' },
  { value: 'outline', label: 'Outline' },
  { value: 'boxed', label: 'Boxed' },
]

function LogSectionBody({
  section,
  onChange,
}: {
  section: DayLogSection
  onChange: (next: DayLogSection) => void
}) {
  const patch = (p: Partial<DayLogSection>) => onChange({ ...section, ...p })

  switch (section.noteMode) {
    case 'default':
      return (
        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ta-muted">
            Details
          </span>
          <textarea
            value={section.details ?? ''}
            onChange={(e) => patch({ details: e.target.value })}
            rows={6}
            placeholder="Paragraphs, bullets, context…"
            className="ta-glass-input w-full px-3 py-2.5 text-sm text-ta-text resize-y font-sans leading-relaxed min-h-[120px]"
          />
        </label>
      )
    case 'cornell':
      return <CornellLogFields section={section} onChange={patch} />
    case 'outline':
      return (
        <OutlineLogEditor
          topListType={section.outlineTopListType ?? 'unordered'}
          onTopListType={(t) => patch({ outlineTopListType: t })}
          root={section.outlineRoot ?? []}
          onChangeRoot={(outlineRoot) => patch({ outlineRoot })}
        />
      )
    case 'boxed':
      return (
        <BoxedLogEditor
          root={section.boxedRoot ?? []}
          onChangeRoot={(boxedRoot) => patch({ boxedRoot })}
        />
      )
    default:
      return null
  }
}

function AttachmentsBlock({
  attachments,
  onChange,
}: {
  attachments: LogAttachment[]
  onChange: (next: LogAttachment[]) => void
}) {
  const imgRef = useRef<HTMLInputElement>(null)

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    e.target.value = ''
    if (!files?.length) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_IMAGE_BYTES) continue
      const reader = new FileReader()
      reader.onload = () => {
        const data = String(reader.result ?? '')
        onChange([...attachments, { id: newId(), kind: 'image', data }])
      }
      reader.readAsDataURL(file)
    }
  }

  function addLink() {
    const href = window.prompt('Link URL (https://…)')
    if (!href?.trim()) return
    const label = window.prompt('Optional label') ?? ''
    onChange([...attachments, { id: newId(), kind: 'link', href: href.trim(), label: label.trim() }])
  }

  function remove(id: string) {
    onChange(attachments.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-2 border-t border-white/[0.06] pt-3 mt-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-ta-muted">Attachments</span>
      <div className="flex flex-wrap gap-2">
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          title="Upload images"
          aria-label="Upload images"
          onChange={onPickImage}
        />
        <button
          type="button"
          onClick={() => imgRef.current?.click()}
          className="font-mono text-[10px] uppercase px-2 py-1 rounded border border-white/15 text-ta-muted hover:border-ta-accent/40"
        >
          + Image
        </button>
        <button
          type="button"
          onClick={addLink}
          className="font-mono text-[10px] uppercase px-2 py-1 rounded border border-white/15 text-ta-muted hover:border-ta-accent/40"
        >
          + Link
        </button>
      </div>
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="relative group rounded border border-white/10 bg-black/20 p-1 max-w-[140px]"
            >
              {a.kind === 'image' && a.data ? (
                <img src={a.data} alt="" className="max-h-20 w-full object-cover rounded" />
              ) : (
                <a
                  href={a.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-ta-accent break-all line-clamp-3"
                >
                  {a.label || a.href}
                </a>
              )}
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-ta-bg text-ta-danger text-xs opacity-0 group-hover:opacity-100 border border-white/20"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SortableLogCard({
  section,
  onChange,
  onRemove,
}: {
  section: DayLogSection
  onChange: (next: DayLogSection) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function setMode(mode: NoteMode) {
    if (mode === section.noteMode) return
    onChange({
      ...emptyLogSection(mode),
      id: section.id,
      title: section.title,
      attachments: section.attachments ?? [],
    })
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`ta-glass-panel ta-glass-panel--tilt-none p-4 space-y-3 border border-white/[0.06] ${
        isDragging ? 'opacity-60 ring-1 ring-ta-accent/40' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing font-mono text-ta-muted touch-none px-1"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          ⋮⋮
        </button>
        <select
          value={section.noteMode}
          onChange={(e) => setMode(e.target.value as NoteMode)}
          aria-label="Note-taking method"
          className="ta-native-select text-xs max-w-[160px]"
        >
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="font-mono text-xs text-ta-muted hover:text-ta-danger ml-auto"
        >
          Remove
        </button>
      </div>
      <label className="block space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ta-muted">
          Section title
        </span>
        <input
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          placeholder="e.g. Lec 3, RAG project…"
          className="ta-glass-input w-full px-3 py-2 text-sm text-ta-text font-sans"
        />
      </label>
      <LogSectionBody section={section} onChange={onChange} />
      <AttachmentsBlock
        attachments={section.attachments ?? []}
        onChange={(attachments) => onChange({ ...section, attachments })}
      />
    </li>
  )
}

type Props = {
  label: string
  sections: DayLogSection[]
  onChange: (next: DayLogSection[]) => void
  addSectionLabel: string
  sideBySide: boolean
  onSideBySideChange: (v: boolean) => void
}

export function LogSectionsEditor({
  label,
  sections,
  onChange,
  addSectionLabel,
  sideBySide,
  onSideBySideChange,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onChange(arrayMove(sections, oldIndex, newIndex))
  }

  function addSection() {
    if (sections.length >= MAX_SECTIONS) return
    onChange([...sections, emptyLogSection()])
  }

  const list = (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ul
          className={
            sideBySide && sections.length > 0
              ? 'grid grid-cols-1 xl:grid-cols-2 gap-4 items-start'
              : 'space-y-4'
          }
        >
          {sections.map((s) => (
            <SortableLogCard
              key={s.id}
              section={s}
              onChange={(next) => onChange(sections.map((x) => (x.id === s.id ? next : x)))}
              onRemove={() => onChange(sections.filter((x) => x.id !== s.id))}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ta-muted">{label}</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 font-mono text-[10px] text-ta-muted cursor-pointer">
            <input
              type="checkbox"
              checked={sideBySide}
              onChange={(e) => onSideBySideChange(e.target.checked)}
              className="rounded border-white/20"
            />
            Side-by-side (2 columns on wide screens)
          </label>
          <button
            type="button"
            onClick={addSection}
            disabled={sections.length >= MAX_SECTIONS}
            className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-white/12 hover:border-ta-accent/50 hover:shadow-[0_0_16px_-6px_rgba(232,255,71,0.25)] disabled:opacity-35 transition-all"
          >
            {addSectionLabel}
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-ta-muted leading-relaxed">
          No log sections yet. Add one and pick a note-taking method per section.
        </p>
      ) : (
        list
      )}
    </div>
  )
}
