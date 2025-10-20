import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UserProvider } from './components/context/UserContext.jsx'
import { StyleProvider } from './components/context/StyleContext.jsx'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <StyleProvider>
        <App />
      </StyleProvider>
    </UserProvider>
  </StrictMode>,
)
