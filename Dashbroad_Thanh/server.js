// Production server for School Deployment (Node.js)
// Serves static frontend from ./dist and proxies /api/sheet to Google Sheets
import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3000
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg'
const DIST_DIR = path.join(__dirname, 'dist')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

function fetchWithRedirect(url, res, redirects = 5) {
  if (redirects <= 0) {
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end('Too many redirects')
    return
  }

  https.get(url, (googleRes) => {
    if (googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
      fetchWithRedirect(googleRes.headers.location, res, redirects - 1)
      return
    }

    res.writeHead(googleRes.statusCode || 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    })
    googleRes.pipe(res)
  }).on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end(`Proxy error: ${err.message}`)
  })
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

  // 1. API proxy
  if (parsedUrl.pathname === '/api/sheet') {
    const gid = parsedUrl.searchParams.get('gid')
    if (!gid) {
      res.writeHead(400, { 'Content-Type': 'text/plain' })
      res.end('Missing gid parameter')
      return
    }
    const targetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`
    fetchWithRedirect(targetUrl, res)
    return
  }

  // 2. Health check
  if (parsedUrl.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }))
    return
  }

  // 3. Static files
  let safePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '')
  if (safePath === '/' || safePath === '\\') safePath = '/index.html'

  let filePath = path.join(DIST_DIR, safePath)

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback to index.html
      filePath = path.join(DIST_DIR, 'index.html')
    }

    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
        return
      }

      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content)
    })
  })
})

server.listen(PORT, () => {
  console.log(`Server ĐHYDCT Dashboard đang chạy tại http://localhost:${PORT}`)
})
