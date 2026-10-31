import react from '@vitejs/plugin-react'
import { defineConfig, Plugin } from 'vite'
import https from 'node:https'

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

          const targetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), googleSheetProxyPlugin()],
  server: {
    port: 5173,
    host: true,
  }
})
