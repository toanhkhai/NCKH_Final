// Node production entrypoint: SPA routes, assets and the read-only Sheets proxy.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHEETS_CONFIG, SPREADSHEET_ID } from './src/config/sheets.ts'

const filename = fileURLToPath(import.meta.url)
const defaultDist = path.join(path.dirname(filename), 'dist')
const learnerSheetId = '1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02'
const learnerGids = ['844694624', '1326842216']
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }
const uiRoute = /^\/(?:projects|publications)\/[a-z0-9/-]+\/?$/

export function createDashboardServer({ distDir = defaultDist, fetcher = fetch, timeoutMs = 20000 } = {}) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
      response.end(request.method === 'HEAD' ? undefined : body)
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD')
      send(405, 'Method not allowed')
      return
    }
    if (url.pathname === '/api/health') {
      send(200, JSON.stringify({ status: 'ok', time: new Date().toISOString() }), 'application/json')
      return
    }
    if (url.pathname === '/api/sheet') {
      const dataset = url.searchParams.get('dataset') || 'staff'
      const gid = url.searchParams.get('gid')
      const allowed = dataset === 'staff' ? SHEETS_CONFIG.map((source) => source.gid) : dataset === 'learners' ? learnerGids : []
      if (!gid || !allowed.includes(gid)) { send(400, 'Unknown sheet dataset'); return }
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const abort = () => { if (!response.writableEnded) controller.abort() }
      response.once('close', abort)
      try {
        const sheetId = dataset === 'learners' ? learnerSheetId : SPREADSHEET_ID
        const upstream = await fetcher(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`, { signal: controller.signal, redirect: 'follow', cache: 'no-store' })
        const body = Buffer.from(await upstream.arrayBuffer())
        if (!response.destroyed) send(upstream.status, body, 'text/csv; charset=utf-8')
      } catch (error) {
        if (!response.destroyed) send(controller.signal.aborted ? 504 : 502, controller.signal.aborted ? 'Google Sheets request timed out' : `Proxy error: ${error.message}`)
      } finally {
        clearTimeout(timer)
        response.removeListener('close', abort)
      }
      return
    }
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_api/')) { send(404, 'Unknown API'); return }
    let pathname
    try { pathname = decodeURIComponent(url.pathname) } catch { send(400, 'Invalid path'); return }
    const shell = pathname === '/' || uiRoute.test(pathname)
    const candidate = path.resolve(distDir, '.' + (shell ? '/index.html' : pathname))
    const relative = path.relative(path.resolve(distDir), candidate)
    if (relative.startsWith('..') || path.isAbsolute(relative)) { send(403, 'Forbidden'); return }
    try {
      const stat = await fs.promises.stat(candidate)
      if (!stat.isFile()) { send(404, 'Not found'); return }
      const body = await fs.promises.readFile(candidate)
      const hashedAsset = /^\/assets\/.+-[a-zA-Z0-9_-]{8,}\.(?:js|css)$/.test(pathname)
      response.writeHead(200, { 'Content-Type': mime[path.extname(candidate).toLowerCase()] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': hashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache' })
      response.end(request.method === 'HEAD' ? undefined : body)
    } catch { send(404, 'Not found') }
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === filename) {
  if (!fs.existsSync(path.join(defaultDist, 'index.html'))) {
    console.error('Chưa có bản dựng. Chạy npm run build trước npm start.')
    process.exit(1)
  }
  const port = process.env.PORT || 3000
  const server = createDashboardServer()
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Cổng ${port} đang được sử dụng. Chọn PORT khác hoặc dừng server cũ.` : error.message)
    process.exit(1)
  })
  server.listen(port, () => console.log(`Dashboard: http://localhost:${port}`))
}
