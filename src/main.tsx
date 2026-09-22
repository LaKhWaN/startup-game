import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { inject } from '@vercel/analytics'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { router } from './router.tsx'

const Prototyper = lazy(() => import('./prototypes/Prototyper.tsx'))

inject()

const isPrototype = window.location.pathname.startsWith('/prototype')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isPrototype
        ? <Suspense fallback={null}><Prototyper /></Suspense>
        : <RouterProvider router={router} />}
    </ErrorBoundary>
  </StrictMode>,
)
