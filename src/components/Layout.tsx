import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { HeaderClock } from '@/components/HeaderClock'
import { HighPriorityReminderModal } from '@/components/HighPriorityReminderModal'
import { APP_DISPLAY_NAME } from '@/config/branding'
import { useAppState } from '@/context/AppStateContext'
import { overdueHighPriorityTasks } from '@/lib/highPriorityReminder'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  [
    'px-4 sm:px-6 py-3 font-mono text-[11px] tracking-[0.12em] uppercase transition-all border-b-2 -mb-px rounded-t-md',
    isActive
      ? 'text-ta-accent border-ta-accent bg-white/[0.06] shadow-[0_-4px_24px_-6px_rgba(232,255,71,0.15)]'
      : 'text-ta-muted border-transparent hover:text-ta-text hover:bg-white/[0.03]',
  ].join(' ')

export function Layout() {
  const { state } = useAppState()
  const overdue = useMemo(() => overdueHighPriorityTasks(state), [state])
  const overdueKey = useMemo(
    () => overdue.map(({ dayKey, task }) => `${dayKey}:${task.id}`).sort().join('|'),
    [overdue],
  )
  const prevKeyRef = useRef('')
  const dismissedRef = useRef(false)
  const [showHpModal, setShowHpModal] = useState(false)

  useEffect(() => {
    if (overdue.length === 0) {
      setShowHpModal(false)
      return
    }
    if (overdueKey !== prevKeyRef.current) {
      prevKeyRef.current = overdueKey
      dismissedRef.current = false
    }
    if (!dismissedRef.current) setShowHpModal(true)
  }, [overdueKey, overdue.length])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-[100] isolate ta-glass-header-bar">
        <div className="ta-container pt-6 sm:pt-8 pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ta-muted mb-1">
                Daily command center
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ta-text">
                {(() => {
                  const parts = APP_DISPLAY_NAME.trim().split(/\s+/)
                  const last = parts.pop() ?? APP_DISPLAY_NAME
                  const rest = parts.join(' ')
                  return rest ? (
                    <>
                      {rest} <span className="text-ta-accent">{last}</span>
                    </>
                  ) : (
                    <span className="text-ta-accent">{last}</span>
                  )
                })()}
              </h1>
            </div>
            <HeaderClock variant="header" />
          </div>
        </div>
        <div className="border-b border-white/[0.08]">
          <div className="ta-container flex flex-wrap gap-0">
            <NavLink to="/" end className={tabClass}>
              Today
            </NavLink>
            <NavLink to="/week" className={tabClass}>
              Week
            </NavLink>
            <NavLink to="/settings" className={tabClass}>
              Settings
            </NavLink>
          </div>
        </div>
      </header>
      <main className="ta-main-stack flex-1 ta-container py-8 sm:py-10 pb-16 sm:pb-20">
        <Outlet />
      </main>
      <HighPriorityReminderModal
        open={showHpModal}
        items={overdue}
        onDismiss={() => {
          dismissedRef.current = true
          setShowHpModal(false)
        }}
      />
    </div>
  )
}
