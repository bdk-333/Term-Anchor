/**
 * HTTP handler for Term Anchor time tracker API (/api/time/*).
 * Works with node:http and Vite Connect (same ServerResponse shape).
 */
import './db.mjs'
import * as projectService from './projectService.mjs'
import * as taskService from './taskService.mjs'
import * as timerService from './timerService.mjs'

let timeApiGate = Promise.resolve()

/**
 * Serialize `/api/time/*` handling so the WASM SQLite database never runs overlapping
 * transactions from concurrent HTTP requests.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
function runTimeApiExclusive(fn) {
  const run = () => fn()
  const next = timeApiGate.then(run, run)
  timeApiGate = next.catch(() => {})
  return next
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function sendEmpty(res, status) {
  res.statusCode = status
  res.end()
}

async function readBodyText(req, max = 65536) {
  const chunks = []
  let n = 0
  for await (const chunk of req) {
    n += chunk.length
    if (n > max) throw Object.assign(new Error('body too large'), { status: 400 })
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function readJson(req) {
  const t = await readBodyText(req)
  if (!t.trim()) return {}
  try {
    return JSON.parse(t)
  } catch {
    throw Object.assign(new Error('invalid JSON'), { status: 400 })
  }
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {Promise<boolean>} true if request was handled
 */
export async function timeTrackerHandle(req, res) {
  const host = req.headers.host || '127.0.0.1'
  const u = new URL(req.url ?? '/', `http://${host}`)
  const pathname = decodeURIComponent(u.pathname)
  if (!pathname.startsWith('/api/time')) return false

  return runTimeApiExclusive(async () => {
  const method = req.method || 'GET'

  try {
    if (method === 'GET' && pathname === '/api/time/timer/current') {
      sendJson(res, 200, { current: timerService.getCurrent() })
      return true
    }
    if (method === 'GET' && pathname === '/api/time/timer/totals/today') {
      sendJson(res, 200, timerService.getTodayTotals())
      return true
    }
    if (method === 'POST' && pathname === '/api/time/timer/start') {
      const body = await readJson(req)
      const current = timerService.startTask(body?.taskId)
      sendJson(res, 200, { current })
      return true
    }
    if (method === 'POST' && pathname === '/api/time/timer/pause') {
      const current = timerService.pauseCurrent()
      sendJson(res, 200, { current })
      return true
    }
    if (method === 'POST' && pathname === '/api/time/timer/resume') {
      const current = timerService.resumeCurrent()
      sendJson(res, 200, { current })
      return true
    }
    if (method === 'POST' && pathname === '/api/time/timer/end') {
      timerService.endCurrent()
      sendEmpty(res, 204)
      return true
    }

    if (method === 'GET' && pathname === '/api/time/projects') {
      sendJson(res, 200, { projects: projectService.listProjects() })
      return true
    }
    if (method === 'POST' && pathname === '/api/time/projects') {
      const body = await readJson(req)
      const project = projectService.createProject(body?.name, body?.laneId)
      sendJson(res, 201, { project })
      return true
    }
    {
      const m = pathname.match(/^\/api\/time\/projects\/(\d+)$/)
      if (m) {
        const id = m[1]
        if (method === 'PATCH') {
          const body = await readJson(req)
          const project = projectService.updateProject(id, body?.name, body?.laneId)
          sendJson(res, 200, { project })
          return true
        }
        if (method === 'DELETE') {
          projectService.deleteProject(id)
          sendEmpty(res, 204)
          return true
        }
      }
    }

    if (method === 'GET' && pathname === '/api/time/tasks') {
      sendJson(res, 200, { tasks: taskService.listTasks() })
      return true
    }
    if (method === 'POST' && pathname === '/api/time/tasks') {
      const body = await readJson(req)
      const task = taskService.createTask(body?.name, body?.projectId ?? null)
      sendJson(res, 201, { task })
      return true
    }
    {
      const m = pathname.match(/^\/api\/time\/tasks\/(\d+)$/)
      if (m) {
        const id = m[1]
        if (method === 'PATCH') {
          const body = await readJson(req)
          const task = taskService.updateTask(id, body?.name, body?.projectId ?? null)
          sendJson(res, 200, { task })
          return true
        }
        if (method === 'DELETE') {
          taskService.deleteTask(id)
          sendEmpty(res, 204)
          return true
        }
      }
    }

    sendJson(res, 404, { error: true, message: 'Not found' })
    return true
  } catch (e) {
    const status = Number(e.status) || 500
    const message = e.message || 'Unexpected error.'
    sendJson(res, status, { error: true, message })
    return true
  }
  })
}
