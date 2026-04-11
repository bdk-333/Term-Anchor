import { useDroppable } from '@dnd-kit/core'
import { addDays, format, isSameMonth } from 'date-fns'
import { toDateKey } from '@/lib/dates'
import { useMemo } from 'react'
import {
  calendarDropId,
  chunkIntoWeeks,
  getMonthGridRange,
  laneBarClassForCategory,
  MAX_LANE_BARS_PER_CELL,
  tasksForLaneBars,
  weekKeyForDateKey,
} from '@/lib/weekCalendar'
import type { TaskCategory, TaskItem } from '@/lib/types'

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

function MonthDayCell({
  dateKey,
  viewMonth,
  isToday,
  isInCurrentWeek,
  isSelected,
  items,
  categories,
  onOpenDay,
}: {
  dateKey: string
  viewMonth: Date
  isToday: boolean
  isInCurrentWeek: boolean
  isSelected: boolean
  items: TaskItem[]
  categories: TaskCategory[]
  onOpenDay: (dateKey: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: calendarDropId(dateKey) })
  const d = new Date(`${dateKey}T12:00:00`)
  const inMonth = isSameMonth(d, viewMonth)
  const bars = tasksForLaneBars(items).slice(0, MAX_LANE_BARS_PER_CELL)
  const overflow = Math.max(0, items.length - MAX_LANE_BARS_PER_CELL)

  const aria = `${format(d, 'EEEE, MMMM d')}${items.length ? `, ${items.length} tasks` : ', no tasks'}`

  return (
    <div ref={setNodeRef} className={`min-h-0 flex-1 ${isInCurrentWeek ? 'bg-white/[0.045]' : ''}`}>
      <button
        type="button"
        onClick={() => onOpenDay(dateKey)}
        aria-label={aria}
        className={[
          'w-full h-full min-h-[5.5rem] sm:min-h-[6.25rem] flex flex-col items-stretch rounded-xl border px-1.5 pt-1.5 pb-1.5 text-left transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-accent/50',
          inMonth ? 'border-white/[0.1] bg-black/20' : 'border-transparent bg-transparent opacity-45',
          isToday ? 'ring-1 ring-white/35 shadow-[0_0_20px_-8px_rgba(255,255,255,0.2)]' : '',
          isSelected ? 'ring-2 ring-gs-accent/45 border-gs-accent/30' : '',
          isOver ? 'border-gs-accent/50 bg-gs-accent/[0.07]' : 'hover:border-white/20 hover:bg-white/[0.04]',
        ].join(' ')}
      >
        <div className="flex justify-center mb-0.5">
          <span
            className={[
              'inline-flex min-w-[1.65rem] h-7 items-center justify-center font-mono text-sm font-semibold tabular-nums',
              isToday
                ? 'rounded-md bg-white text-gs-bg shadow-sm'
                : inMonth
                  ? 'text-gs-text'
                  : 'text-gs-muted',
            ].join(' ')}
          >
            {d.getDate()}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 flex-1 justify-end mt-auto px-0.5">
          {bars.map((t) => (
            <div
              key={t.id}
              className={`h-1 w-full rounded-full shrink-0 ${laneBarClassForCategory(t.categoryId, categories)}`}
              title={t.text}
              aria-hidden
            />
          ))}
          {overflow > 0 ? (
            <p className="font-mono text-[8px] text-gs-muted text-center leading-none pt-0.5">+{overflow}</p>
          ) : null}
        </div>
      </button>
    </div>
  )
}

type Props = {
  viewMonth: Date
  todayKey: string
  /** When set, that day shows selected ring on the grid. */
  selectedDateKey: string | null
  tasksByDay: Record<string, { items: TaskItem[] } | undefined>
  taskCategories: TaskCategory[]
  onOpenDay: (dateKey: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onThisMonth: () => void
}

export function WeekMonthCalendar({
  viewMonth,
  todayKey,
  selectedDateKey,
  tasksByDay,
  taskCategories,
  onOpenDay,
  onPrevMonth,
  onNextMonth,
  onThisMonth,
}: Props) {
  const { cellDateKeys } = useMemo(() => getMonthGridRange(viewMonth), [viewMonth])
  const weeks = useMemo(() => chunkIntoWeeks(cellDateKeys), [cellDateKeys])
  const todayWeekKey = weekKeyForDateKey(todayKey)
  const title = format(viewMonth, 'LLLL yyyy')
  const shortTitle = format(viewMonth, 'MMM yyyy').toUpperCase()

  return (
    <section className="gs-glass-panel gs-glass-panel--tilt-none overflow-hidden border border-white/[0.08]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-4 py-3 border-b border-white/[0.08]">
        <h3 className="font-mono text-lg sm:text-xl font-bold tracking-tight text-gs-text">{shortTitle}</h3>
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={onPrevMonth}
            className="px-3 py-2 rounded-lg border border-white/12 text-gs-muted hover:text-gs-text hover:border-white/25 transition-colors"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onThisMonth}
            className="px-3 py-2 rounded-lg border border-white/12 text-gs-muted hover:text-gs-accent hover:border-gs-accent/35 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="px-3 py-2 rounded-lg border border-white/12 text-gs-muted hover:text-gs-text hover:border-white/25 transition-colors"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Calendar {title}
      </p>

      <div className="grid grid-cols-7 gap-0 px-1 sm:px-2 pt-2 pb-1 border-b border-white/[0.06]">
        {WEEKDAY_LETTERS.map((l, i) => (
          <div
            key={`${l}-${i}`}
            className="text-center font-mono text-[10px] uppercase tracking-widest text-gs-muted py-1"
          >
            {l}
          </div>
        ))}
      </div>

      <div className="p-1 sm:p-2 space-y-0.5">
        {weeks.map((row, wi) => {
          const rowInThisWeek = row.some((k) => weekKeyForDateKey(k) === todayWeekKey)
          return (
            <div
              key={wi}
              className={[
                'grid grid-cols-7 gap-0.5 sm:gap-1 rounded-xl',
                rowInThisWeek ? 'ring-1 ring-gs-accent/20 bg-gs-accent/[0.04]' : '',
              ].join(' ')}
            >
              {row.map((dateKey) => {
                const items = tasksByDay[dateKey]?.items ?? []
                return (
                  <MonthDayCell
                    key={dateKey}
                    dateKey={dateKey}
                    viewMonth={viewMonth}
                    isToday={dateKey === todayKey}
                    isInCurrentWeek={rowInThisWeek}
                    isSelected={selectedDateKey === dateKey}
                    items={items}
                    categories={taskCategories}
                    onOpenDay={onOpenDay}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** First day after the month grid (for “Beyond” strip). */
export function firstDateKeyAfterMonthGrid(viewMonth: Date): string {
  const { gridEnd } = getMonthGridRange(viewMonth)
  return toDateKey(addDays(gridEnd, 1))
}
