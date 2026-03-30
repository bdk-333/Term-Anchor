import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { APP_DISPLAY_NAME } from './config/branding'
import { AppStateProvider } from './context/AppStateContext'
import './index.css'

document.title = APP_DISPLAY_NAME

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </BrowserRouter>
  </StrictMode>,
)
