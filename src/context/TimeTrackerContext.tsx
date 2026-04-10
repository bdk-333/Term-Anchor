import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAppState } from '@/context/AppStateContext'
import type { PersistenceBackend } from '@/lib/persistence'
import {
  ensureTimeTaskForPlanner,
  findPlannerTask,
  patchPlannerTaskInState,
} from '@/lib/plannerTimeBridge'
import {
  fetchProjects,
  fetchTasks,
  fetchTimerCurrent,
  fetchTodayTotals,
  timeApiReachable,
  timerStart,
  type TimeProject,
  type TimeTask,
  type TimerCurrent,
  type TodayTotals,
} from '@/lib/timeApi'

type Ctx = {
  apiOk: boolean | null
  persistenceBackend: PersistenceBackend
  current: TimerCurrent | null
  totals: TodayTotals | null
  projects: TimeProject[]
  tasks: TimeTask[]
  busy: boolean
  timeError: string | null
  setTimeError: (v: string | null) => void
  refreshAll: () => Promise<void>
  runStartPlannerTask: (taskId: string) => Promise<void>
  runWithBusy: <T,>(fn: () => Promise<T>) => Promise<T | void>
  setCurrent: React.Dispatch<React.SetStateAction<TimerCurrent>>
  setTotals: React.Dispatch<React.SetStateAction<TodayTotals | null>>
  setProjects: React.Dispatch<React.SetStateAction<TimeProject[]>>
  setTasks: React.Dispatch<React.SetStateAction<TimeTask[]>>
  startTimerForNumericTaskId: (taskId: number) => Promise<void>
}

const TimeTrackerContext = createContext<Ctx | null>(null)

export function TimeTrackerProvider({ children }: { children: ReactNode }) {
  const { state, setState, persistenceBackend } = useAppState()
  const stateRef = useRef(state)
  stateRef.current = state

  const [apiOk, setApiOk] = useState<boolean | null>(null)
  const [projects, setProjects] = useState<TimeProject[]>([])
  const [tasks, setTasks] = useState<TimeTask[]>([])
  const [current, setCurrent] = useState<TimerCurrent>(null)
  const [totals, setTotals] = useState<TodayTotals | null>(null)
  const [busy, setBusy] = useState(false)
  const [timeError, setTimeError] = useState<string | null>(null)

  const refreshAll = useCallback(async () => {
    const ok = await timeApiReachable()
    setApiOk(ok)
    if (!ok) {
      setProjects([])
      setTasks([])
      setCurrent(null)
      setTotals(null)
      return
    }
    const [p, t, c, tot] = await Promise.all([
      fetchProjects(),
      fetchTasks(),
      fetchTimerCurrent(),
      fetchTodayTotals(),
    ])
    setProjects(p)
    setTasks(t)
    setCurrent(c)
    setTotals(tot)
  }, [])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  const pollMs = current ? 5000 : 15_000
  useEffect(() => {
    if (apiOk !== true) return
    const id = window.setInterval(() => {
      void Promise.all([fetchTimerCurrent(), fetchTodayTotals()]).then(([c, tot]) => {
        setCurrent(c)
        setTotals(tot)
      })
    }, pollMs)
    return () => window.clearInterval(id)
  }, [apiOk, pollMs])

  const runWithBusy = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | void> => {
    setBusy(true)
    setTimeError(null)
    try {
      return await fn()
    } catch (e) {
      setTimeError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const runStartPlannerTask = useCallback(
    async (taskId: string) => {
      setBusy(true)
      setTimeError(null)
      try {
        const s = stateRef.current
        const found = findPlannerTask(s, taskId)
        if (!found) {
          setTimeError('That planner task was not found.')
          return
        }
        if (found.task.done) {
          setTimeError('That task is already marked done on Today.')
          return
        }
        const cat = s.taskCategories.find((c) => c.id === found.task.categoryId)
        const tid = await ensureTimeTaskForPlanner({
          text: found.task.text,
          categoryId: found.task.categoryId,
          categoryLabel: cat?.label ?? 'Task',
          existingTimeTaskId: found.task.timeTaskId,
        })
        setState((prev) => patchPlannerTaskInState(prev, taskId, { timeTaskId: tid }))
        setCurrent(await timerStart(tid))
        setTotals(await fetchTodayTotals())
        setTasks(await fetchTasks())
        setProjects(await fetchProjects())
      } catch (e) {
        setTimeError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    },
    [setState],
  )

  const startTimerForNumericTaskId = useCallback(async (taskId: number) => {
    await runWithBusy(async () => {
      setCurrent(await timerStart(taskId))
      setTotals(await fetchTodayTotals())
    })
  }, [runWithBusy])

  const value = useMemo<Ctx>(
    () => ({
      apiOk,
      persistenceBackend,
      current,
      totals,
      projects,
      tasks,
      busy,
      timeError,
      setTimeError,
      refreshAll,
      runStartPlannerTask,
      runWithBusy,
      setCurrent,
      setTotals,
      setProjects,
      setTasks,
      startTimerForNumericTaskId,
    }),
    [
      apiOk,
      persistenceBackend,
      current,
      totals,
      projects,
      tasks,
      busy,
      timeError,
      refreshAll,
      runStartPlannerTask,
      runWithBusy,
      startTimerForNumericTaskId,
    ],
  )

  return <TimeTrackerContext.Provider value={value}>{children}</TimeTrackerContext.Provider>
}

export function useTimeTracker(): Ctx {
  const c = useContext(TimeTrackerContext)
  if (!c) throw new Error('useTimeTracker must be used within TimeTrackerProvider')
  return c
}

/** For header clock: safe when provider missing (should not happen in app shell). */
export function useTimeTrackerOptional(): Ctx | null {
  return useContext(TimeTrackerContext)
}
