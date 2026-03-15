import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Vistorias } from './pages/Vistorias'
import { Instalacao } from './pages/Instalacao'
import { Clientes } from './pages/Clientes'
import { Usuarios } from './pages/Usuarios'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/vistorias"
            element={
              <ProtectedRoute>
                <Vistorias />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instalacao"
            element={
              <ProtectedRoute>
                <Instalacao />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute>
                <Clientes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute>
                <Usuarios />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
