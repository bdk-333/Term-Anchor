import type { BoxNode, CornellCueNoteRow, DayLogSection, OutlineNode } from './types'
import { newId } from './id'

export const MIN_LOG_WORDS_FOR_SAVE = 5

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length
}

export function emptyOutlineNode(): OutlineNode {
  return { id: newId(), body: '', childrenListType: 'unordered', children: [] }
}

export function emptyBoxNode(): BoxNode {
  return { id: newId(), title: '', body: '', children: [] }
}

function emptyCornellRow(): CornellCueNoteRow {
  return { id: newId(), cue: '', notes: '' }
}

export function emptyLogSection(noteMode: DayLogSection['noteMode'] = 'default'): DayLogSection {
  const base: DayLogSection = {
    id: newId(),
    noteMode,
    title: '',
    details: '',
    cornellCues: '',
    cornellNotes: '',
    cornellSummary: '',
    outlineTopListType: 'unordered',
    outlineRoot: [],
    boxedRoot: [],
    attachments: [],
  }
  if (noteMode === 'cornell') {
    base.cornellRows = [emptyCornellRow()]
    base.cornellCueColumnPct = 35
  }
  return base
}

function normalizeCornellRows(s: DayLogSection): CornellCueNoteRow[] {
  const raw = s.cornellRows
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((r) => ({
      id: typeof r.id === 'string' && r.id ? r.id : newId(),
      cue: typeof r.cue === 'string' ? r.cue : '',
      notes: typeof r.notes === 'string' ? r.notes : '',
    }))
  }
  const cue = s.cornellCues?.trim() ?? ''
  const notes = s.cornellNotes?.trim() ?? ''
  return [{ id: newId(), cue, notes }]
}

/** Resolved Cornell rows (migrates legacy single cues/notes block). */
export function getCornellRows(s: DayLogSection): CornellCueNoteRow[] {
  return normalizeCornellRows(s)
}

function cornellRowsWordCount(rows: CornellCueNoteRow[]): number {
  let n = 0
  for (const r of rows) {
    n += countWords(r.cue ?? '')
    n += countWords(r.notes ?? '')
  }
  return n
}

function countOutlineWords(nodes: OutlineNode[] | undefined): number {
  if (!nodes?.length) return 0
  let n = 0
  for (const node of nodes) {
    n += countWords(node.title ?? '')
    n += countWords(node.body)
    n += countOutlineWords(node.children)
  }
  return n
}

function countBoxWords(nodes: BoxNode[] | undefined): number {
  if (!nodes?.length) return 0
  let n = 0
  for (const box of nodes) {
    n += countWords(box.title)
    n += countWords(box.body ?? '')
    n += countBoxWords(box.children)
  }
  return n
}

function allBoxesTitled(nodes: BoxNode[] | undefined): boolean {
  if (!nodes?.length) return false
  for (const b of nodes) {
    if (!b.title.trim()) return false
    if (b.children?.length && !allBoxesTitled(b.children)) return false
  }
  return true
}

export function logSectionContentWords(s: DayLogSection): number {
  switch (s.noteMode) {
    case 'default':
      return countWords(s.details ?? '')
    case 'cornell': {
      const rows = normalizeCornellRows(s)
      return cornellRowsWordCount(rows) + countWords(s.cornellSummary ?? '')
    }
    case 'outline':
      return countOutlineWords(s.outlineRoot)
    case 'boxed':
      return countBoxWords(s.boxedRoot)
    default:
      return 0
  }
}

/** True if this log section satisfies “meaningful content” for save rules. */
export function logSectionMeetsSaveRule(s: DayLogSection): boolean {
  if (!s.title.trim()) return false
  const words = logSectionContentWords(s)
  if (words < MIN_LOG_WORDS_FOR_SAVE) return false

  switch (s.noteMode) {
    case 'default':
      return true
    case 'cornell': {
      const rows = normalizeCornellRows(s)
      return rows.some((r) => r.cue.trim() || r.notes.trim())
    }
    case 'outline':
      return (s.outlineRoot?.length ?? 0) > 0
    case 'boxed':
      return (s.boxedRoot?.length ?? 0) > 0 && allBoxesTitled(s.boxedRoot)
    default:
      return false
  }
}

export function dailyLogMeetsSaveRule(sections: DayLogSection[] | undefined): boolean {
  if (!sections?.length) return false
  return sections.some(logSectionMeetsSaveRule)
}

export function normalizeLogSection(s: DayLogSection): DayLogSection {
  const mode = s.noteMode ?? 'default'
  const base = {
    ...emptyLogSection(mode),
    id: s.id,
    title: s.title ?? '',
    noteMode: mode,
    details: s.details ?? '',
    cornellCues: s.cornellCues ?? '',
    cornellNotes: s.cornellNotes ?? '',
    cornellSummary: s.cornellSummary ?? '',
    outlineTopListType: s.outlineTopListType ?? 'unordered',
    outlineRoot: Array.isArray(s.outlineRoot) ? s.outlineRoot : [],
    boxedRoot: Array.isArray(s.boxedRoot) ? s.boxedRoot : [],
    attachments: Array.isArray(s.attachments) ? s.attachments : [],
  }
  if (mode === 'cornell') {
    base.cornellRows = normalizeCornellRows(s)
    const p = s.cornellCueColumnPct
    base.cornellCueColumnPct =
      typeof p === 'number' && Number.isFinite(p) ? Math.min(70, Math.max(15, p)) : 35
    base.cornellCues = ''
    base.cornellNotes = ''
  }
  return base
}

/** v2 shape: { id, title, details } without noteMode */
export function migrateV2LogSectionToV3(raw: unknown): DayLogSection {
  if (!raw || typeof raw !== 'object') return emptyLogSection()
  const o = raw as Record<string, unknown>
  if (o.noteMode && typeof o.noteMode === 'string') {
    return normalizeLogSection(o as unknown as DayLogSection)
  }
  return {
    id: typeof o.id === 'string' ? o.id : newId(),
    noteMode: 'default',
    title: typeof o.title === 'string' ? o.title : '',
    details: typeof o.details === 'string' ? o.details : '',
    cornellRows: [],
    cornellCueColumnPct: 35,
    cornellCues: '',
    cornellNotes: '',
    cornellSummary: '',
    outlineTopListType: 'unordered',
    outlineRoot: [],
    boxedRoot: [],
    attachments: [],
  }
}
