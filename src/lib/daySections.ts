import type { AppState, DaySection } from './types'
import { newId } from './id'

export const MIN_LOG_WORDS_FOR_SAVE = 5

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length
}

/** All titles and details for a day's sections, for word count / display. */
export function combinedSectionText(sections: DaySection[] | undefined): string {
  if (!sections?.length) return ''
  return sections.map((s) => `${s.title}\n${s.details}`).join('\n')
}

/** One section with a non-empty title and enough words in details only (not title). */
export function dailyLogMeetsSaveRule(sections: DaySection[] | undefined): boolean {
  if (!sections?.length) return false
  return sections.some(
    (s) => s.title.trim().length > 0 && countWords(s.details) >= MIN_LOG_WORDS_FOR_SAVE,
  )
}

export function todayTasksDoneCount(state: AppState, todayKey: string): number {
  const items = state.tasksByDay[todayKey]?.items ?? []
  return items.filter((t) => t.done).length
}

export function canSaveToday(
  state: AppState,
  todayKey: string,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (todayTasksDoneCount(state, todayKey) < 1) {
    reasons.push('Mark at least one task as done in today’s lanes.')
  }
  const logSections = state.dayLogSections[todayKey] ?? []
  if (!dailyLogMeetsSaveRule(logSections)) {
    if (!logSections.length) {
      reasons.push('Add at least one daily log section.')
    } else if (!logSections.some((s) => s.title.trim().length > 0)) {
      reasons.push('Give at least one log section a title (broad focus).')
    } else {
      reasons.push(
        `Write at least ${MIN_LOG_WORDS_FOR_SAVE} words in the details of a section that has a title (title words don’t count).`,
      )
    }
  }
  return { ok: reasons.length === 0, reasons }
}

export function emptySection(): DaySection {
  return { id: newId(), title: '', details: '' }
}

export function migrateLegacyDayStringMap(
  map: Record<string, string> | undefined,
): Record<string, DaySection[]> {
  const out: Record<string, DaySection[]> = {}
  for (const [day, text] of Object.entries(map ?? {})) {
    const t = text.trim()
    out[day] = t ? [{ id: newId(), title: '', details: text }] : []
  }
  return out
}
