import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..')
const DATA_DIR = path.join(ROOT, 'data')
const dbPath = path.join(DATA_DIR, 'time-tracking.db')

fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new DatabaseSync(dbPath)
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

const schemaPath = path.join(__dirname, 'schema.sql')
db.exec(fs.readFileSync(schemaPath, 'utf8'))

/** Older DBs: add lane_id on projects and per-lane unique names. */
function migrateProjectsLaneId() {
  const info = db.prepare(`PRAGMA table_info(projects)`).all()
  const hasLane = info.some((c) => c.name === 'lane_id')
  if (hasLane) return
  db.exec(`ALTER TABLE projects ADD COLUMN lane_id TEXT NOT NULL DEFAULT '__others__'`)
  db.exec(`DROP INDEX IF EXISTS idx_projects_name_active`)
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_lane_name_active ON projects(lane_id, lower(name)) WHERE deleted_at IS NULL`,
  )
}
migrateProjectsLaneId()

/**
 * @param {() => void} fn
 */
export function runTransaction(fn) {
  db.exec('BEGIN IMMEDIATE')
  try {
    fn()
    db.exec('COMMIT')
  } catch (e) {
    try {
      db.exec('ROLLBACK')
    } catch {
      /* ignore */
    }
    throw e
  }
}

export { db }
