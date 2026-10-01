import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { inject } from '@vercel/analytics'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { router } from './router.tsx'

inject()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)
