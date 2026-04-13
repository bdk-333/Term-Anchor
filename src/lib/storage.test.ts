import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from './types'
import { createDefaultState, emptyProfile, migrate } from './storage'

describe('migrate', () => {
  it('returns default state for null input', () => {
    const s = migrate(null)
    expect(s.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(s.profile.onboardingComplete).toBe(false)
  })

  it('preserves profile through round-trip shape', () => {
    const raw = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      profile: {
        ...emptyProfile(),
        anchorLabel: 'Thesis',
        anchorDate: '2026-05-01',
        semesterStart: '2026-01-10',
        semesterEnd: '2026-05-15',
        onboardingComplete: true,
      },
      taskCategories: createDefaultState().taskCategories,
      tasksByDay: {},
      weekIntentByWeekStart: {},
      dayIntentSections: {},
      dayLogSections: {},
      daySaved: {},
      habits: createDefaultState().habits,
      habitChecks: {},
    }
    const s = migrate(raw)
    expect(s.profile.anchorLabel).toBe('Thesis')
    expect(s.profile.onboardingComplete).toBe(true)
  })
})

describe('createDefaultState', () => {
  it('matches current schema version', () => {
    expect(createDefaultState().schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })
})
