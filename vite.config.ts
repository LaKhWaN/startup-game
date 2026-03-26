import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { analyticsApiPlugin } from './vite/plugins/analyticsApi'

export default defineConfig({
  plugins: [react(), analyticsApiPlugin()],
})
