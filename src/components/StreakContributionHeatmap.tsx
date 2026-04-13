import { format } from 'date-fns'
import { useMemo } from 'react'
import {
  buildStreakHeatmapMonthBlock,
  getFiveMonthHeatmapStarts,
  type StreakHeatmapCell,
} from '@/lib/streakHeatmap'
import type { AppState } from '@/lib/types'

/** Match streak pips (orange #ff6b35) — darker → brighter with glow on high levels. */
const HEAT_CLASS: Record<number, string> = {
  0: 'bg-white/[0.08] ring-1 ring-inset ring-white/[0.06]',
  1: 'bg-[#2a1408]/95 ring-1 ring-inset ring-orange-900/40',
  2: 'bg-[#4a1f0d] ring-1 ring-inset ring-[#ff6b35]/25',
  3: 'bg-[#7a3015] ring-1 ring-inset ring-[#ff6b35]/35',
  4: 'bg-[#ff6b35] shadow-[0_0_10px_rgba(255,107,53,0.55)]',
  5: 'bg-[#ff8f5c] shadow-[0_0_14px_rgba(255,107,53,0.85),0_0_22px_rgba(255,140,80,0.35)]',
}

const PADDING_CLASS = 'bg-white/[0.05] ring-1 ring-inset ring-white/[0.05]'

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

function cellClass(cell: StreakHeatmapCell): string {
  if (!cell.inDisplayMonth) return PADDING_CLASS
  return HEAT_CLASS[cell.level] ?? HEAT_CLASS[0]
}

function MonthBlock({
  state,
  today,
  monthStart,
}: {
  state: AppState
  today: Date
  monthStart: Date
}) {
  const { columns, monthLabel } = useMemo(
    () => buildStreakHeatmapMonthBlock(state, today, monthStart),
    [state, today, monthStart],
  )

  return (
    <div className="flex flex-col items-center shrink-0 rounded-lg border border-white/[0.08] bg-black/20 px-1.5 pt-1.5 pb-2 sm:px-2 sm:pt-2 sm:pb-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.2em] text-ta-muted/95 mb-2 w-full text-center">
        {monthLabel}
      </p>
      <div className="flex gap-[3px] sm:gap-1">
        {columns.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] sm:gap-1 shrink-0">
            {week.map((cell) => {
              const d = new Date(`${cell.dateKey}T12:00:00`)
              const dateStr = format(d, 'MMM d, yyyy')
              const tip = cell.inDisplayMonth
                ? `${dateStr} · ${cell.doneCount} done${cell.saved ? ' · day saved' : ''}`
                : `${dateStr} (outside this month)`
              return (
                <div
                  key={cell.dateKey}
                  title={tip}
                  className={[
                    'w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm shrink-0 transition-transform hover:scale-110 hover:z-10',
                    cellClass(cell),
                    cell.isToday && cell.inDisplayMonth
                      ? 'ring-2 ring-ta-accent/90 ring-offset-1 ring-offset-black/50'
                      : '',
                  ].join(' ')}
                  role="img"
                  aria-label={tip}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

type Props = {
  state: AppState
  todayKey: string
}

/**
 * Trailing calendar months as separated contribution blocks, orange heat like streak pips.
 */
export function StreakContributionHeatmap({ state, todayKey }: Props) {
  const today = useMemo(() => new Date(`${todayKey}T12:00:00`), [todayKey])
  const monthStarts = useMemo(() => getFiveMonthHeatmapStarts(today), [today])

  return (
    <div className="w-full min-w-0 border-t border-white/[0.08] pt-4 mt-1">
      <p className="font-mono text-[10px] text-ta-muted mb-3 leading-relaxed">
        Five months · this month in the center, two before and two after · each block is one calendar month ·
        color = tasks marked <span className="text-ta-text/85">done</span> that day (0–5; brightest is 5+).
      </p>
      <div className="flex gap-2 sm:gap-3 items-stretch min-w-0">
        <div
          className="flex flex-col justify-between shrink-0 pt-9 pb-2 text-[9px] font-mono text-ta-muted/90 uppercase tracking-tighter select-none"
          aria-hidden
        >
          {WEEKDAY_LETTERS.map((l, i) => (
            <span key={`${l}-${i}`} className="h-3 sm:h-3.5 flex items-center justify-end pr-0.5">
              {l}
            </span>
          ))}
        </div>
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="flex flex-row flex-wrap items-end gap-1.5 sm:gap-2 justify-start pb-1">
            {monthStarts.map((ms) => (
              <MonthBlock key={monthBlockKey(ms)} state={state} today={today} monthStart={ms} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 mt-4">
        <span className="font-mono text-[9px] text-ta-muted">Less</span>
        <div className="flex gap-1">
          {([0, 1, 2, 3, 4, 5] as const).map((lv) => (
            <div
              key={lv}
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm ${HEAT_CLASS[lv]}`}
              title={`${lv === 5 ? '5+' : lv} tasks done`}
            />
          ))}
        </div>
        <span className="font-mono text-[9px] text-ta-muted">More</span>
      </div>
    </div>
  )
}

function monthBlockKey(d: Date): string {
  return format(d, 'yyyy-MM')
}
