/**
 * Serves dist/ and persists app state to data/term-anchor-state.json.
 * Binds 127.0.0.1 only. Default port 8787 (override with TERM_ANCHOR_PORT).
 */
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const DATA_DIR = path.join(ROOT, 'data')
const STATE_FILE = path.join(DATA_DIR, 'term-anchor-state.json')
const PORT = Number(process.env.TERM_ANCHOR_PORT) || 8787
const HOST = '127.0.0.1'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

function ext(p) {
  const e = path.extname(p).toLowerCase()
  return MIME[e] ?? 'application/octet-stream'
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function isUnderDir(file, dir) {
  const rel = path.relative(dir, file)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

async function readBody(req, maxBytes = 25 * 1024 * 1024) {
  const chunks = []
  let n = 0
  for await (const chunk of req) {
    n += chunk.length
    if (n > maxBytes) throw new Error('body too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function handleApiState(req, res) {
  if (req.method === 'GET') {
    try {
      const raw = await fs.readFile(STATE_FILE, 'utf8')
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(raw)
    } catch (e) {
      if (e && e.code === 'ENOENT') {
        res.writeHead(404)
        res.end()
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: String(e?.message ?? e) }))
      }
    }
    return true
  }

  if (req.method === 'PUT') {
    try {
      const text = await readBody(req)
      const parsed = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: 'expected JSON object' }))
        return true
      }
      await ensureDataDir()
      const out = JSON.stringify(parsed)
      const tmp = `${STATE_FILE}.${process.pid}.tmp`
      await fs.writeFile(tmp, out, 'utf8')
      await fs.rename(tmp, STATE_FILE)
      res.writeHead(204)
      res.end()
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: String(e?.message ?? e) }))
    }
    return true
  }

  res.writeHead(405, { Allow: 'GET, PUT' })
  res.end()
  return true
}

async function handleStatic(req, res, urlPath) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }

  let rel = urlPath === '/' ? 'index.html' : urlPath.slice(1)
  rel = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '')
  const file = path.join(DIST, rel)

  if (!isUnderDir(file, DIST)) {
    res.writeHead(403)
    res.end()
    return
  }

  try {
    const st = await fs.stat(file)
    if (st.isDirectory()) {
      res.writeHead(403)
      res.end()
      return
    }
    const ct = ext(file)
    res.writeHead(200, { 'Content-Type': ct })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    res.end(await fs.readFile(file))
  } catch {
    try {
      const indexPath = path.join(DIST, 'index.html')
      const html = await fs.readFile(indexPath)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      res.end(html)
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url ?? '/', `http://${HOST}`)
    const pathname = decodeURIComponent(u.pathname)

    if (pathname === '/api/state') {
      await handleApiState(req, res)
      return
    }

    await handleStatic(req, res, pathname)
  } catch (e) {
    res.writeHead(500)
    res.end(String(e?.message ?? e))
  }
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is in use. Set TERM_ANCHOR_PORT to another port.`)
  } else {
    console.error(err)
  }
  process.exit(1)
})

try {
  await fs.access(path.join(DIST, 'index.html'))
} catch {
  console.error('No dist/index.html. From the project folder run: npm run build')
  process.exit(1)
}

server.listen(PORT, HOST, () => {
  console.log(`Term Anchor — http://${HOST}:${PORT}/`)
  console.log(`State file: ${STATE_FILE}`)
  console.log('Close this window to stop the server.')
})
