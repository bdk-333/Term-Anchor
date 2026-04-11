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

/**
 * Legacy DBs may have `projects` without lane_id. Schema must not CREATE INDEX on lane_id
 * before this runs (see schema.sql). New DBs get lane_id from CREATE TABLE.
 */
function ensureProjectsLaneIdAndIndex() {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='projects'`)
    .get()
  if (!row) return

  const info = db.prepare(`PRAGMA table_info(projects)`).all()
  const hasLane = info.some((c) => c.name === 'lane_id')
  if (!hasLane) {
    db.exec(`ALTER TABLE projects ADD COLUMN lane_id TEXT NOT NULL DEFAULT '__others__'`)
    db.exec(`DROP INDEX IF EXISTS idx_projects_name_active`)
  }
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_lane_name_active ON projects(lane_id, lower(name)) WHERE deleted_at IS NULL`,
  )
}
ensureProjectsLaneIdAndIndex()

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
