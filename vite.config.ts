import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// Given a path like "lists/abc123", finds the matching file under api/,
// mirroring Vercel's file-based routing: exact file, then <dir>/index.js,
// then <dir>/[id].js for a dynamic segment.
function resolveApiRoute(pathname) {
  const apiDir = path.resolve(__dirname, 'api')
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 1) {
    const [seg] = segments
    if (fs.existsSync(path.join(apiDir, `${seg}.js`))) {
      return { file: `/api/${seg}.js`, params: {} }
    }
    if (fs.existsSync(path.join(apiDir, seg, 'index.js'))) {
      return { file: `/api/${seg}/index.js`, params: {} }
    }
  } else if (segments.length === 2) {
    const [dir, leaf] = segments
    if (fs.existsSync(path.join(apiDir, dir, `${leaf}.js`))) {
      return { file: `/api/${dir}/${leaf}.js`, params: {} }
    }
    if (fs.existsSync(path.join(apiDir, dir, '[id].js'))) {
      return { file: `/api/${dir}/[id].js`, params: { id: leaf } }
    }
  }
  return null
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

// Mounts the api/ directory under Vite's dev server so `npm run dev` works
// end-to-end locally, without needing `vercel dev`. Vercel handles the
// api/ directory itself in production, so this only affects local dev.
function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()

        const reqUrl = new URL(req.url, 'http://localhost')
        const route = resolveApiRoute(reqUrl.pathname.replace(/^\/api\//, ''))
        if (!route) return next()

        const query = { ...route.params }
        for (const [key, value] of reqUrl.searchParams) query[key] = value
        req.query = query

        if (req.method && !['GET', 'HEAD'].includes(req.method)) {
          const raw = await readRequestBody(req)
          if (raw) {
            try {
              req.body = JSON.parse(raw)
            } catch {
              req.body = {}
            }
          } else {
            req.body = {}
          }
        }

        const wrappedRes = {
          status(code) { res.statusCode = code; return this },
          json(payload) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
            return this
          },
          setHeader(name, value) { res.setHeader(name, value); return this },
        }
        try {
          const { default: handler } = await server.ssrLoadModule(route.file)
          await handler(req, wrappedRes)
        } catch (err) {
          wrappedRes.status(500).json({ error: 'Internal error', detail: String(err) })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // The api/ handlers read process.env directly (Node/Vercel style), not
  // import.meta.env, so pull values from .env* files into process.env
  // ourselves for local dev. In production Vercel injects real env vars
  // and never runs this file.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      figmaAssetResolver(),
      apiDevMiddleware(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
