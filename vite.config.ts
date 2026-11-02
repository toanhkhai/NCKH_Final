import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, Plugin } from 'vite'
import { SHEETS_CONFIG, SPREADSHEET_ID } from './src/config/sheets.ts'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = path.dirname(fileURLToPath(import.meta.url))


function googleSheetProxyPlugin(): Plugin {
  return {
    name: 'google-sheet-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/sheet')) {
          return next()
        }

        try {
          const urlObj = new URL(req.url, 'http://localhost')
          const gid = urlObj.searchParams.get('gid')
          if (!gid) {
            res.statusCode = 400
            res.end('Missing gid parameter')
            return
          }

          const dataset = urlObj.searchParams.get('dataset') || 'staff'
          if (!['staff', 'learners'].includes(dataset) || (dataset === 'staff' && !SHEETS_CONFIG.some((source) => source.gid === gid)) || (dataset === 'learners' && !['844694624', '1326842216'].includes(gid))) {
            res.writeHead(400).end('Unknown sheet dataset')
            return
          }
          const spreadsheetId = dataset === 'learners' ? '1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02' : SPREADSHEET_ID
          const targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`

          if (!['GET', 'HEAD'].includes(req.method || 'GET')) { res.writeHead(405).end('Method not allowed'); return }
          const upstream = await fetch(targetUrl, { signal: AbortSignal.timeout(20000), cache: 'no-store' })
          const body = Buffer.from(await upstream.arrayBuffer())
          res.writeHead(upstream.status, { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end(req.method === 'HEAD' ? undefined : body)

        } catch (err: any) {
          res.statusCode = 500
          res.end(`Internal error: ${err?.message || err}`)
        }
      })
    }
  }
}

function permissionApiPlugin(): Plugin {
  return {
    name: 'permission-api',
    configureServer(server) {
      server.middlewares.use('/_api/save-whitelist', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405).end()
          return
        }
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', () => {
          try {
            const updated = JSON.parse(body)
            if (!updated || typeof updated.superAdmin !== 'string' || !Array.isArray(updated.delegatedEmails)) {
              throw new Error('Invalid whitelist format')
            }
            const target = path.join(configDir, 'src/nckh/data/whitelist.json')
            fs.writeFileSync(target, JSON.stringify(updated, null, 2), 'utf8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } catch (error) {
            res.statusCode = 400
            res.end(JSON.stringify({ success: false, error: String(error) }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), googleSheetProxyPlugin(), permissionApiPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  }
})
