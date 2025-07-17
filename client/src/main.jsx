import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'; // O el CSS donde pusiste las directivas Tailwind
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
