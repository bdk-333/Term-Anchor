import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..')
const DATA_DIR = path.join(ROOT, 'data')
const dbPath = path.join(DATA_DIR, 'time-tracking.db')
const SQL_DIST = path.join(ROOT, 'node_modules', 'sql.js', 'dist')

fs.mkdirSync(DATA_DIR, { recursive: true })

const SQL = await initSqlJs({
  locateFile: (file) => path.join(SQL_DIST, file),
})

let inner
if (fs.existsSync(dbPath)) {
  const buf = fs.readFileSync(dbPath)
  inner = new SQL.Database(new Uint8Array(buf))
} else {
  inner = new SQL.Database()
}

function persist() {
  const data = inner.export()
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(dbPath, Buffer.from(data))
}

/** >0 while `runTransaction` callback is running (skip per-statement disk writes). */
let txDepth = 0

function maybePersist() {
  if (txDepth === 0) persist()
}

function lastInsertRowid() {
  const r = inner.exec('SELECT last_insert_rowid() AS id')
  if (!r?.length || !r[0].values?.length) return 0
  const v = r[0].values[0][0]
  return typeof v === 'bigint' ? Number(v) : Number(v)
}

/** @param {unknown} stmt @param {unknown[]} params */
function bindAll(stmt, params) {
  if (!params.length) return
  /** @type {{ bind: (p: unknown[]) => void }} */ (stmt).bind(params)
}

/** @param {unknown} stmt */
function rowObject(stmt) {
  const o = stmt.getAsObject()
  return /** @type {Record<string, unknown>} */ (o)
}

/**
 * @param {string} sql
 */
function prepare(sql) {
  return {
    /**
     * @param {unknown[]} params
     */
    get(...params) {
      const stmt = inner.prepare(sql)
      try {
        bindAll(stmt, params)
        if (!stmt.step()) return undefined
        return rowObject(stmt)
      } finally {
        stmt.free()
      }
    },
    /**
     * @param {unknown[]} params
     */
    all(...params) {
      const stmt = inner.prepare(sql)
      const rows = []
      try {
        bindAll(stmt, params)
        while (stmt.step()) rows.push(rowObject(stmt))
        return rows
      } finally {
        stmt.free()
      }
    },
    /**
     * @param {unknown[]} params
     */
    run(...params) {
      const stmt = inner.prepare(sql)
      try {
        bindAll(stmt, params)
        stmt.step()
        const changes = inner.getRowsModified()
        const id = lastInsertRowid()
        maybePersist()
        return { changes, lastInsertRowid: id }
      } finally {
        stmt.free()
      }
    },
  }
}

function exec(sql) {
  inner.exec(sql)
  maybePersist()
}

inner.run('PRAGMA foreign_keys = ON')

const schemaPath = path.join(__dirname, 'schema.sql')
inner.exec(fs.readFileSync(schemaPath, 'utf8'))
persist()

/**
 * Legacy DBs may have `projects` without lane_id. Schema must not CREATE INDEX on lane_id
 * before this runs (see schema.sql). New DBs get lane_id from CREATE TABLE.
 */
function ensureProjectsLaneIdAndIndex() {
  const row = prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='projects'`).get()
  if (!row) return

  const info = prepare(`PRAGMA table_info(projects)`).all()
  const hasLane = info.some((c) => c.name === 'lane_id')
  if (!hasLane) {
    inner.exec(`ALTER TABLE projects ADD COLUMN lane_id TEXT NOT NULL DEFAULT '__others__'`)
    inner.exec(`DROP INDEX IF EXISTS idx_projects_name_active`)
  }
  inner.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_lane_name_active ON projects(lane_id, lower(name)) WHERE deleted_at IS NULL`,
  )
}
ensureProjectsLaneIdAndIndex()
persist()

/**
 * @param {() => void} fn
 */
export function runTransaction(fn) {
  inner.run('BEGIN IMMEDIATE')
  txDepth++
  try {
    fn()
    inner.run('COMMIT')
  } catch (e) {
    try {
      inner.run('ROLLBACK')
    } catch {
      /* ignore */
    }
    throw e
  } finally {
    txDepth--
    if (txDepth === 0) persist()
  }
}

export const db = { prepare, exec }
