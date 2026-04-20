import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

// ── Íconos con estilos correctos ─────────────────────────
const IconGrid     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
const IconCalendar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
const IconUsers    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IconFile     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const IconCard     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
const IconShield   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const IconBrain    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 0 1 5 5v1a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
const IconKey      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="5"/><path d="M15.5 8.5l5 5M17 7l2 2M21 3l-3 4"/></svg>
const IconUser     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IconLogout   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
const IconChevron  = ({ up }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="2.5" strokeLinecap="round"><polyline points={up ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/></svg>

const ROL_LABEL = { admin: 'Administradora', psicologo: 'Psicóloga', secretaria: 'Secretaria' }

// ── Modal: Cambiar contraseña ─────────────────────────────
function ModalPassword({ onClose }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (nueva.length < 6) { setError('Mínimo 6 caracteres'); return }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email: user.email, password: actual })
    if (loginErr) { setError('La contraseña actual es incorrecta'); setLoading(false); return }
    const { error: updErr } = await supabase.auth.updateUser({ password: nueva })
    if (updErr) { setError(updErr.message); setLoading(false); return }
    setExito(true)
    setLoading(false)
    setTimeout(onClose, 2000)
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Cambiar contraseña</div>
          <button className="btn-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            {exito && <div className="alert alert-success">✅ Contraseña cambiada correctamente</div>}
            <div className="form-group">
              <label className="form-label">Contraseña actual</label>
              <input className="input" type="password" value={actual} onChange={e => setActual(e.target.value)} required placeholder="Tu contraseña actual" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Nueva contraseña</label>
              <input className="input" type="password" value={nueva} onChange={e => setNueva(e.target.value)} required placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar contraseña</label>
              <input className="input" type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} required placeholder="Repetí la nueva contraseña" />
              {confirmar && nueva && (
                <div className="form-hint" style={{ color: confirmar === nueva ? 'var(--success)' : 'var(--danger)' }}>
                  {confirmar === nueva ? '✓ Coinciden' : 'No coinciden'}
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading || exito}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Cambiando...</> : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: Mi perfil ──────────────────────────────────────
function ModalPerfil({ perfil, onClose, onSaved }) {
  const [nombre, setNombre] = useState(perfil?.nombre || '')
  const [apellido, setApellido] = useState(perfil?.apellido || '')
  const [especialidad, setEspecialidad] = useState(perfil?.especialidad || '')
  const [matricula, setMatricula] = useState(perfil?.matricula || '')
  const [telefono, setTelefono] = useState(perfil?.telefono || '')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('perfiles').update({ nombre, apellido, especialidad, matricula, telefono }).eq('id', perfil.id)
    setExito(true)
    setLoading(false)
    setTimeout(() => { onSaved(); onClose() }, 1200)
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">Mi perfil</div>
          <button className="btn-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {exito && <div className="alert alert-success">✅ Perfil actualizado correctamente</div>}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="input" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Tu nombre" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido</label>
                <input className="input" value={apellido} onChange={e => setApellido(e.target.value)} placeholder="Tu apellido" />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Especialidad</label>
                <input className="input" value={especialidad} onChange={e => setEspecialidad(e.target.value)} placeholder="Psicóloga clínica..." />
              </div>
              <div className="form-group">
                <label className="form-label">Matrícula</label>
                <input className="input" value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="MP 12345" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="input" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+54 9 11 1234-5678" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading || exito}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Guardando...</> : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Layout principal ──────────────────────────────────────
export default function Layout() {
  const { perfil, logout, user } = useAuth()
  const navigate = useNavigate()
  const [modalPassword, setModalPassword] = useState(false)
  const [modalPerfil, setModalPerfil] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)

  const rol = perfil?.rol || 'psicologo'
  const esSecretaria = rol === 'secretaria'

  const initiales = perfil?.nombre
    ? `${perfil.nombre[0]}${(perfil.apellido || '')[0] || ''}`.toUpperCase()
    : (user?.email || 'U')[0].toUpperCase()

  const nombreMostrado = perfil?.nombre
    ? `${perfil.nombre} ${perfil.apellido || ''}`.trim()
    : user?.email || 'Mi perfil'

  const handleLogout = async () => { await logout(); navigate('/login') }

  const MenuItem = ({ onClick, icon, label, color = 'var(--ink)' }) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
      padding: '10px 14px', border: 'none', background: 'none',
      cursor: 'pointer', fontSize: 13, color, textAlign: 'left',
    }}
      onMouseOver={e => e.currentTarget.style.background = color === 'var(--danger)' ? 'var(--danger-pale)' : 'var(--warm)'}
      onMouseOut={e => e.currentTarget.style.background = 'none'}
    >
      {icon} {label}
    </button>
  )

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark"><IconBrain /></div>
          <div className="logo-text">
            <div className="logo-name">PsicoGestión</div>
            <div className="logo-sub">Consultorio digital</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-label">Principal</div>
            {!esSecretaria && (
              <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <IconGrid /> Dashboard
              </NavLink>
            )}
            <NavLink to="/agenda" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <IconCalendar /> Agenda
            </NavLink>
            <NavLink to="/pacientes" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <IconUsers /> Pacientes
            </NavLink>
          </div>

          {!esSecretaria && (
            <div className="nav-section">
              <div className="nav-section-label">Clínico</div>
              <NavLink to="/fichas" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <IconFile /> Fichas de sesión
              </NavLink>
              <NavLink to="/facturacion" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <IconCard /> Facturación
              </NavLink>
            </div>
          )}

          {!esSecretaria && (
            <div className="nav-section">
              <div className="nav-section-label">Sistema</div>
              <NavLink to="/usuarios" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <IconShield /> Usuarios
              </NavLink>
            </div>
          )}

          {esSecretaria && (
            <div style={{ margin: '16px 8px 0', padding: '10px 12px', background: 'var(--info-pale)', borderRadius: 9, fontSize: 12, color: 'var(--info)', lineHeight: 1.5 }}>
              <strong>Acceso secretaria</strong><br />
              Podés ver la agenda y gestionar pacientes.
            </div>
          )}
        </nav>

        {/* Panel de usuario */}
        <div className="sidebar-user">
          <div style={{ position: 'relative' }}>

            {/* Menú desplegable */}
            {menuAbierto && (
              <>
                <div onClick={() => setMenuAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
                  background: 'white', border: '1px solid var(--border-2)',
                  borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  overflow: 'hidden', zIndex: 100,
                }}>
                  <MenuItem onClick={() => { setModalPerfil(true); setMenuAbierto(false) }} icon={<IconUser />} label="Mi perfil" />
                  <MenuItem onClick={() => { setModalPassword(true); setMenuAbierto(false) }} icon={<IconKey />} label="Cambiar contraseña" />
                  <div style={{ height: 1, background: 'var(--border)' }} />
                  <MenuItem onClick={handleLogout} icon={<IconLogout />} label="Cerrar sesión" color="var(--danger)" />
                </div>
              </>
            )}

            {/* Chip de usuario */}
            <div
              onClick={() => setMenuAbierto(m => !m)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '10px 11px',
                borderRadius: 10, cursor: 'pointer', userSelect: 'none',
                background: menuAbierto ? '#C8EDCF' : 'var(--sage-pale)', transition: 'background .15s',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: 'var(--sage)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>
                {initiales}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {nombreMostrado}
                </div>
                <div style={{ fontSize: 11, color: 'var(--sage)', fontWeight: 500 }}>
                  {ROL_LABEL[rol] || 'Usuario'}
                </div>
              </div>
              <IconChevron up={menuAbierto} />
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {modalPassword && <ModalPassword onClose={() => setModalPassword(false)} />}
      {modalPerfil && perfil && (
        <ModalPerfil perfil={perfil} onClose={() => setModalPerfil(false)} onSaved={() => window.location.reload()} />
      )}
    </div>
  )
}
