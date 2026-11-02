import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './nckh/index.css'
import './styles/index.css'
import './styles/dashboard.css'
import './styles/combined.css'
import App from './App.tsx'
import { AuthProvider } from './nckh/context/AuthContext.jsx'
import './styles/surfaces.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider><App /></AuthProvider>
  </StrictMode>,
)
