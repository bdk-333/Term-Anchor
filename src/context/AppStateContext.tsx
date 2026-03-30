import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppState } from '@/lib/types'
import { loadState, saveState } from '@/lib/storage'

type Ctx = {
  state: AppState
  setState: (updater: AppState | ((prev: AppState) => AppState)) => void
}

const AppStateContext = createContext<Ctx | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setStateInternal] = useState<AppState>(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const setState = useCallback((updater: AppState | ((prev: AppState) => AppState)) => {
    setStateInternal((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }, [])

  const value = useMemo(() => ({ state, setState }), [state, setState])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): Ctx {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState outside provider')
  return ctx
}
