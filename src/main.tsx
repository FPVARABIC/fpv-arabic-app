import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { runMigrations } from './utils/migrations'
import { ProgressProvider } from './contexts/ProgressContext'
import { AuthProvider } from './contexts/AuthContext'

runMigrations()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ProgressProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProgressProvider>
    </AuthProvider>
  </StrictMode>,
)
