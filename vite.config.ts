import fs from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'
import { defineConfig, type Plugin } from 'vite'

// GitHub Pages project sites need /<repo>/; override with VITE_BASE in CI or .env
const base = process.env.VITE_BASE ?? '/'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, 'data')
const STATE_FILE = path.join(DATA_DIR, 'term-anchor-state.json')

let timeTrackerImport: Promise<{
  timeTrackerHandle: (req: IncomingMessage, res: ServerResponse) => Promise<boolean>
}> | null = null
function loadTimeTrackerHandlers() {
  if (!timeTrackerImport) {
    const href = pathToFileURL(path.resolve(__dirname, 'scripts/time-tracker/http-handlers.mjs')).href
    timeTrackerImport = import(href) as Promise<{
      timeTrackerHandle: (req: IncomingMessage, res: ServerResponse) => Promise<boolean>
    }>
  }
  return timeTrackerImport
}

async function readBody(req: Connect.IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = []
  let n = 0
  for await (const chunk of req) {
    n += (chunk as Buffer).length
    if (n > maxBytes) throw new Error('body too large')
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function termAnchorApiPlugin(): Plugin {
  return {
    name: 'term-anchor-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? ''
        if (pathname.startsWith('/api/time')) {
          try {
            const mod = await loadTimeTrackerHandlers()
            const handled = await mod.timeTrackerHandle(req, res)
            if (handled) return
          } catch (e) {
            res.statusCode = 500
            res.end(String(e))
            return
          }
        }

        if (pathname !== '/api/state') {
          next()
          return
        }

        try {
          if (req.method === 'GET') {
            try {
              const raw = await fs.readFile(STATE_FILE, 'utf8')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(raw)
            } catch (e: unknown) {
              const err = e as NodeJS.ErrnoException
              if (err.code === 'ENOENT') {
                res.statusCode = 404
                res.end()
              } else {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ error: String(err.message) }))
              }
            }
            return
          }

          if (req.method === 'PUT') {
            const text = await readBody(req, 25 * 1024 * 1024)
            const parsed = JSON.parse(text) as unknown
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: 'expected JSON object' }))
              return
            }
            await fs.mkdir(DATA_DIR, { recursive: true })
            const out = JSON.stringify(parsed)
            const tmp = `${STATE_FILE}.${process.pid}.tmp`
            await fs.writeFile(tmp, out, 'utf8')
            await fs.rename(tmp, STATE_FILE)
            res.statusCode = 204
            res.end()
            return
          }

          res.statusCode = 405
          res.end()
        } catch (e) {
          res.statusCode = 500
          res.end(String(e))
        }
      })
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), termAnchorApiPlugin()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
