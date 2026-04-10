import { db, runTransaction } from './db.mjs'
import { toIsoTimestamp } from './timeUtils.mjs'

const OTHERS_LANE = '__others__'

function makeError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function validateName(name) {
  const cleanName = typeof name === 'string' ? name.trim() : ''
  if (!cleanName) throw makeError(400, 'Name is required.')
  if (cleanName.length > 100) throw makeError(400, 'Name must be 100 characters or fewer.')
  return cleanName
}

function validateLaneId(laneId) {
  if (laneId === null || laneId === undefined || laneId === '') return OTHERS_LANE
  const s = String(laneId).trim()
  if (s.length > 64) throw makeError(400, 'laneId is too long.')
  return s || OTHERS_LANE
}

export function listProjects() {
  return db
    .prepare(
      `SELECT id, name, lane_id AS laneId, created_at, updated_at
       FROM projects
       WHERE deleted_at IS NULL
       ORDER BY lane_id, lower(name), id`,
    )
    .all()
}

export function createProject(name, laneId) {
  const cleanName = validateName(name)
  const lane = validateLaneId(laneId)
  const now = toIsoTimestamp()
  try {
    const result = db
      .prepare(
        `INSERT INTO projects (name, lane_id, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      )
      .run(cleanName, lane, now, now)
    return db
      .prepare(`SELECT id, name, lane_id AS laneId, created_at, updated_at FROM projects WHERE id = ?`)
      .get(result.lastInsertRowid)
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      throw makeError(409, 'A project with this name already exists in this lane.')
    }
    throw error
  }
}

export function updateProject(id, name, laneId) {
  const cleanName = validateName(name)
  const lane = laneId === undefined ? undefined : validateLaneId(laneId)
  const projectId = Number(id)
  const now = toIsoTimestamp()
  const existing = db
    .prepare(`SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL`)
    .get(projectId)
  if (!existing) throw makeError(404, 'Project not found.')
  try {
    if (lane === undefined) {
      db.prepare(`UPDATE projects SET name = ?, updated_at = ? WHERE id = ?`).run(
        cleanName,
        now,
        projectId,
      )
    } else {
      db.prepare(`UPDATE projects SET name = ?, lane_id = ?, updated_at = ? WHERE id = ?`).run(
        cleanName,
        lane,
        now,
        projectId,
      )
    }
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      throw makeError(409, 'A project with this name already exists in this lane.')
    }
    throw error
  }
  return db
    .prepare(`SELECT id, name, lane_id AS laneId, created_at, updated_at FROM projects WHERE id = ?`)
    .get(projectId)
}

export function deleteProject(id) {
  const projectId = Number(id)
  const now = toIsoTimestamp()
  const existing = db
    .prepare(`SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL`)
    .get(projectId)
  if (!existing) throw makeError(404, 'Project not found.')
  runTransaction(() => {
    db.prepare(`UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?`).run(now, now, projectId)
    db.prepare(`UPDATE tasks SET project_id = NULL, updated_at = ? WHERE project_id = ? AND deleted_at IS NULL`).run(
      now,
      projectId,
    )
  })
}
