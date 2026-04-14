import { describe, expect, it } from 'vitest'
import {
  HIGH_PRIORITY_SOFT_EOD_MINUTES,
  nowMinutes,
  overdueHighPriorityTasks,
} from './highPriorityReminder'
import { createDefaultState } from './storage'
import { newId } from './id'

describe('overdueHighPriorityTasks', () => {
  it('includes yesterday unfinished urgent tasks', () => {
    const today = new Date('2026-06-15T10:00:00')
    const state = createDefaultState()
    state.tasksByDay['2026-06-14'] = {
      items: [
        {
          id: newId(),
          categoryId: state.taskCategories[0].id,
          text: 'Carry',
          done: false,
          highPriority: true,
        },
      ],
    }
    const list = overdueHighPriorityTasks(state, today)
    expect(list.some((x) => x.task.text === 'Carry')).toBe(true)
  })

  it('today urgent with deadline surfaces after deadline', () => {
    const todayKey = '2026-06-15'
    const state = createDefaultState()
    state.tasksByDay[todayKey] = {
      items: [
        {
          id: newId(),
          categoryId: state.taskCategories[0].id,
          text: 'Due noon',
          done: false,
          highPriority: true,
          priorityDeadlineMinutes: 12 * 60,
        },
      ],
    }
    const before = overdueHighPriorityTasks(state, new Date(`${todayKey}T11:00:00`))
    const after = overdueHighPriorityTasks(state, new Date(`${todayKey}T12:30:00`))
    expect(before).toHaveLength(0)
    expect(after).toHaveLength(1)
  })

  it('today urgent without times surfaces after soft EOD', () => {
    const todayKey = '2026-06-15'
    const state = createDefaultState()
    state.tasksByDay[todayKey] = {
      items: [
        {
          id: newId(),
          categoryId: state.taskCategories[0].id,
          text: 'Plain urgent',
          done: false,
          highPriority: true,
        },
      ],
    }
    const noon = overdueHighPriorityTasks(state, new Date(`${todayKey}T12:00:00`))
    const evening = overdueHighPriorityTasks(state, new Date(`${todayKey}T19:00:00`))
    expect(noon).toHaveLength(0)
    expect(evening).toHaveLength(1)
  })

  it('ignores done urgent', () => {
    const todayKey = '2026-06-15'
    const state = createDefaultState()
    state.tasksByDay[todayKey] = {
      items: [
        {
          id: newId(),
          categoryId: state.taskCategories[0].id,
          text: 'Done',
          done: true,
          highPriority: true,
        },
      ],
    }
    expect(overdueHighPriorityTasks(state, new Date(`${todayKey}T20:00:00`))).toHaveLength(0)
  })
})

describe('nowMinutes', () => {
  it('returns minutes from midnight', () => {
    expect(nowMinutes(new Date('2026-01-01T14:30:00'))).toBe(14 * 60 + 30)
  })
})

describe('HIGH_PRIORITY_SOFT_EOD_MINUTES', () => {
  it('is 18:00', () => {
    expect(HIGH_PRIORITY_SOFT_EOD_MINUTES).toBe(18 * 60)
  })
})
