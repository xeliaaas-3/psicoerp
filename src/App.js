import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pacientes from './pages/Pacientes'
import Agenda from './pages/Agenda'
import Fichas from './pages/Fichas'
import Facturacion from './pages/Facturacion'
import Usuarios from './pages/Usuarios'
import './index.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-spinner" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
      Cargando...
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Solo accesible para psicólogas/admin — bloquea a secretarias
function SoloAdmin({ children }) {
  const { perfil, loading } = useAuth()
  if (loading) return null
  if (perfil?.rol === 'secretaria') return <Navigate to="/agenda" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="fichas" element={
              <SoloAdmin><Fichas /></SoloAdmin>
            } />
            <Route path="facturacion" element={
              <SoloAdmin><Facturacion /></SoloAdmin>
            } />
            <Route path="usuarios" element={
              <SoloAdmin><Usuarios /></SoloAdmin>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
