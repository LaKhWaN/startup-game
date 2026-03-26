import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Prototyper from './prototypes/Prototyper.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

const isPrototype = window.location.pathname.startsWith('/prototype')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isPrototype ? <Prototyper /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
