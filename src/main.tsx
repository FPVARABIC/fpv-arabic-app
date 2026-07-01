import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { runMigrations } from './utils/migrations'
import { ProgressProvider } from './contexts/ProgressContext'

runMigrations()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProgressProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ProgressProvider>
  </StrictMode>,
)
