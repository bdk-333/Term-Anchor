import { useEffect, useState } from 'react'
import { useTimeTrackerOptional } from '@/context/TimeTrackerContext'
import { formatMinutes } from '@/lib/timeApi'

type Variant = 'header' | 'fixed'

/**
 * Local live clock — Outfit + soft gradient. When a time-tracker session is active, shows task + elapsed beside the clock.
 */
export function HeaderClock({ variant = 'header' }: { variant?: Variant }) {
  const [t, setT] = useState(() => new Date())
  const tt = useTimeTrackerOptional()
  const current = tt?.apiOk === true ? tt.current : null

  useEffect(() => {
    const id = window.setInterval(() => setT(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const clockStr = t.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  const clockBlock = (
    <div className="ta-header-clock-inner text-right">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ta-muted/80 mb-0.5">Local</p>
      <p
        className="ta-header-clock-digits ta-header-clock-hm tabular-nums tracking-[0.02em] leading-none"
        title={t.toLocaleString()}
      >
        {clockStr}
      </p>
    </div>
  )

  const trackingBlock =
    current != null ? (
      <div className="min-w-0 flex-1 sm:max-w-[min(100%,20rem)] text-left sm:text-right order-2 sm:order-1">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ta-accent/90 mb-0.5">Tracking</p>
        <p className="text-sm font-semibold text-ta-text leading-snug truncate" title={current.taskName}>
          {current.taskName}
          {current.projectName ? (
            <span className="text-ta-muted font-normal"> · {current.projectName}</span>
          ) : null}
        </p>
        <p className="font-mono text-[11px] text-ta-accent mt-0.5">
          {formatMinutes(current.elapsedMinutes)} · {current.state === 'running' ? 'running' : 'paused'}
        </p>
      </div>
    ) : null

  const inner =
    current != null ? (
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-end gap-3 sm:gap-5 w-full">
        {trackingBlock}
        <div className="shrink-0 order-1 sm:order-2 self-end sm:self-end">{clockBlock}</div>
      </div>
    ) : (
      clockBlock
    )

  if (variant === 'fixed') {
    return (
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[200] pointer-events-none select-none">
        <div className="pointer-events-auto rounded-xl border border-white/[0.07] bg-[#12121a]/75 px-3 py-2 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          {inner}
        </div>
      </div>
    )
  }

  return (
    <div className="shrink-0 self-start sm:self-end w-full sm:w-auto mt-1 sm:mt-0">{inner}</div>
  )
}
