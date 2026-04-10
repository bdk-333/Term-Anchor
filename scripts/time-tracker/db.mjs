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
