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
import type { AppState } from '@/lib/types'
import {
  type PersistenceBackend,
  resolveInitialPersistence,
  saveStateToServer,
} from '@/lib/persistence'
import { createDefaultState, saveBrowserState } from '@/lib/storage'

type Ctx = {
  state: AppState
  setState: (updater: AppState | ((prev: AppState) => AppState)) => void
  persistenceBackend: PersistenceBackend
}

const AppStateContext = createContext<Ctx | null>(null)

const SAVE_DEBOUNCE_MS = 450

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setStateInternal] = useState<AppState>(() => createDefaultState())
  const [hydrated, setHydrated] = useState(false)
  const backendRef = useRef<PersistenceBackend>('local')

  useEffect(() => {
    let cancelled = false
    void resolveInitialPersistence().then(({ backend, state: next }) => {
      if (cancelled) return
      backendRef.current = backend
      setStateInternal(next)
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const backend = backendRef.current
    if (backend === 'api') {
      const t = window.setTimeout(() => {
        void saveStateToServer(state).then((ok) => {
          if (!ok) saveBrowserState(state)
        })
      }, SAVE_DEBOUNCE_MS)
      return () => window.clearTimeout(t)
    }
    saveBrowserState(state)
  }, [state, hydrated])

  const setState = useCallback((updater: AppState | ((prev: AppState) => AppState)) => {
    setStateInternal((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }, [])

  const value = useMemo(
    () => ({
      state,
      setState,
      persistenceBackend: backendRef.current,
    }),
    [state, setState],
  )

  if (!hydrated) {
    return (
      <div className="gs-app-boot flex min-h-dvh items-center justify-center text-zinc-200">
        <p className="text-sm tracking-wide text-zinc-400">Loading…</p>
      </div>
    )
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): Ctx {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState outside provider')
  return ctx
}
