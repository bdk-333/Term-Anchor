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
  const words = countWords(combinedSectionText(logSections))
  if (words < MIN_LOG_WORDS_FOR_SAVE) {
    reasons.push(
      `Write at least ${MIN_LOG_WORDS_FOR_SAVE} words in your daily log (section titles and details both count).`,
    )
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
