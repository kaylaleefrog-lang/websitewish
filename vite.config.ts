import { defineConfig } from 'vite'
import path from 'path'
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

// Mounts api/scrape.js under Vite's dev server so `npm run dev` works
// end-to-end locally, without needing `vercel dev`. Vercel handles the
// api/ directory itself in production, so this only affects local dev.
function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/scrape', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/api/scrape.js')
        const reqUrl = new URL(req.url, 'http://localhost')
        req.query = { url: reqUrl.searchParams.get('url') }
        const wrappedRes = {
          status(code) { res.statusCode = code; return this },
          json(payload) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
            return this
          },
        }
        try {
          await handler(req, wrappedRes)
        } catch (err) {
          wrappedRes.status(500).json({ error: 'Internal error', detail: String(err) })
        }
      })
    },
  }
}

export default defineConfig({
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
})
