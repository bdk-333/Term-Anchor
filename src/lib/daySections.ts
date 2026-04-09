import type { AppState, DaySection } from './types'
import { dailyLogMeetsSaveRule, MIN_LOG_WORDS_FOR_SAVE } from './logSections'
import { newId } from './id'

export { MIN_LOG_WORDS_FOR_SAVE, dailyLogMeetsSaveRule } from './logSections'
export type { DayLogSection } from './types'

/** Intent + legacy combined text (export / search helpers). */
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
  if (!dailyLogMeetsSaveRule(logSections)) {
    if (!logSections.length) {
      reasons.push('Add at least one daily log section.')
    } else if (!logSections.some((s) => s.title.trim().length > 0)) {
      reasons.push('Give at least one log section a section title (e.g. lecture or project name).')
    } else {
      reasons.push(
        `Complete one log section: for Default/Cornell, ${MIN_LOG_WORDS_FOR_SAVE}+ words in the note fields; for Outline, add items with enough text; for Boxed, add boxes with titles and enough text overall.`,
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
