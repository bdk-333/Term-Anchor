import type { BoxNode, DayLogSection, OutlineNode } from './types'
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

export function emptyLogSection(noteMode: DayLogSection['noteMode'] = 'default'): DayLogSection {
  return {
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
    case 'cornell':
      return (
        countWords(s.cornellCues ?? '') +
        countWords(s.cornellNotes ?? '') +
        countWords(s.cornellSummary ?? '')
      )
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
      const hasNotes = !!(s.cornellNotes ?? '').trim()
      const hasCues = !!(s.cornellCues ?? '').trim()
      return hasNotes || hasCues
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
  return {
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
    cornellCues: '',
    cornellNotes: '',
    cornellSummary: '',
    outlineTopListType: 'unordered',
    outlineRoot: [],
    boxedRoot: [],
    attachments: [],
  }
}
