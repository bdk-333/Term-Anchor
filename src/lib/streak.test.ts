import { subDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { streakCount, streakPips, isValidDateKey } from './streak'
import { createDefaultState } from './storage'
import { toDateKey } from './dates'

describe('streakCount', () => {
  it('counts consecutive saved days ending at yesterday when today is not saved', () => {
    const today = new Date('2026-04-10T12:00:00')
    const t0 = toDateKey(today)
    const y1 = toDateKey(subDays(today, 1))
    const y2 = toDateKey(subDays(today, 2))
    const state = createDefaultState()
    state.daySaved[y1] = true
    state.daySaved[y2] = true
    expect(streakCount(state, today)).toBe(2)
    expect(state.daySaved[t0]).toBeUndefined()
  })

  it('includes today when today is saved', () => {
    const today = new Date('2026-04-10T12:00:00')
    const t0 = toDateKey(today)
    const state = createDefaultState()
    state.daySaved[t0] = true
    expect(streakCount(state, today)).toBe(1)
  })
})

describe('streakPips', () => {
  it('returns seven booleans oldest-first', () => {
    const today = new Date('2026-04-13T08:00:00')
    const pips = streakPips(createDefaultState(), today)
    expect(pips).toHaveLength(7)
    expect(pips.every((x) => typeof x === 'boolean')).toBe(true)
  })
})

describe('isValidDateKey', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(isValidDateKey('2026-01-31')).toBe(true)
  })
  it('rejects garbage', () => {
    expect(isValidDateKey('not-a-date')).toBe(false)
  })
})
