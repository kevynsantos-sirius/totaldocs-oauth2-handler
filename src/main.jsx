import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// src/index.js
export {default as AuthProvider} from './auth/AuthProvider';
export { default as SessionGuard } from './auth/SessionGuard';
export { default as useAuth } from './auth/useAuth';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
