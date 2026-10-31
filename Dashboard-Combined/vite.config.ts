import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, Plugin } from 'vite'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = path.dirname(fileURLToPath(import.meta.url))

const SPREADSHEET_ID = '1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg'

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
          if (!['staff', 'learners'].includes(dataset) || !/^\d+$/.test(gid) || (dataset === 'learners' && !['844694624', '1326842216'].includes(gid))) {
            res.writeHead(400).end('Unknown sheet dataset')
            return
          }
          const spreadsheetId = dataset === 'learners' ? '1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02' : SPREADSHEET_ID
          const targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`

          const fetchWithRedirect = (url: string, redirectsRemaining = 5) => {
            if (redirectsRemaining <= 0) {
              res.statusCode = 502
              res.end('Too many redirects')
              return
            }

            https.get(url, (googleRes) => {
              if (googleRes.statusCode && googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
                fetchWithRedirect(googleRes.headers.location, redirectsRemaining - 1)
                return
              }

              res.statusCode = googleRes.statusCode || 200
              res.setHeader('Content-Type', 'text/csv; charset=utf-8')
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
              res.setHeader('Access-Control-Allow-Origin', '*')
              googleRes.pipe(res)
            }).on('error', (err) => {
              res.statusCode = 502
              res.end(`Proxy error: ${err.message}`)
            })
          }

          fetchWithRedirect(targetUrl)
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
