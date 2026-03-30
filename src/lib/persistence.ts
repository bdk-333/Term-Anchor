import type { AppState } from './types'
import { loadBrowserState, migrate } from './storage'

export type PersistenceBackend = 'api' | 'local'

/**
 * When the app is served with the local Term Anchor server (or Vite dev), state lives in
 * data/term-anchor-state.json so any browser on this machine shares the same history.
 */
export async function resolveInitialPersistence(): Promise<{
  backend: PersistenceBackend
  state: AppState
}> {
  try {
    const r = await fetch('/api/state', { cache: 'no-store' })
    if (r.status === 404) {
      return { backend: 'api', state: loadBrowserState() }
    }
    if (!r.ok) {
      return { backend: 'local', state: loadBrowserState() }
    }
    const raw = (await r.json()) as unknown
    return { backend: 'api', state: migrate(raw) }
  } catch {
    return { backend: 'local', state: loadBrowserState() }
  }
}

export async function saveStateToServer(state: AppState): Promise<boolean> {
  try {
    const r = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    })
    return r.ok
  } catch {
    return false
  }
}
