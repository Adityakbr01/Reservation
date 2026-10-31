import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// Home is pre-rendered at build time; other routes get a blank app shell.
const canHydrate = container.hasChildNodes()
window.__HS_HYDRATING__ = canHydrate
if (canHydrate) hydrateRoot(container, app)
else createRoot(container).render(app)
