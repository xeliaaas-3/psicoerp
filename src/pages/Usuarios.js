import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// Cliente separado — NO toca la sesión activa de la psicóloga
const supabaseAux = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const ROL_LABEL = {
  admin: 'Administradora',
  psicologo: 'Psicóloga',
  secretaria: 'Secretaria',
}

const ROL_PILL = {
  admin: 'pill-red',
  psicologo: 'pill-sage',
  secretaria: 'pill-blue',
}

const ROL_DESC = {
  admin: 'Acceso total al sistema',
  psicologo: 'Acceso total al sistema',
  secretaria: 'Solo agenda y pacientes — sin fichas ni facturación',
}

const avatarColors = [
  ['#D8F3DC','#2D6A4F'], ['#E6F1FB','#185FA5'], ['#FAEEDA','#BA7517'],
  ['#FBEAF0','#993556'], ['#EDE7F6','#512DA8'],
]

// ── Modal: Crear usuario ──────────────────────────────────
function ModalCrear({ onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', apellido: '', usuario: '', password: '', rol: 'secretaria' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.usuario.trim()) { setError('Ingresá un nombre de usuario'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError('')
    setLoading(true)

    const email = `${form.usuario.toLowerCase().trim()}@consultorio.local`

    // Usamos supabaseAux para NO cerrar la sesión actual
    const { data, error: err } = await supabaseAux.auth.signUp({ email, password: form.password })

    if (err) { setError('Error: ' + err.message); setLoading(false); return }

    if (data?.user) {
      await supabase.from('perfiles').upsert({
        id: data.user.id,
        nombre: form.nombre,
        apellido: form.apellido,
        rol: form.rol,
      })
    }

    setExito(true)
    setLoading(false)
    setTimeout(() => { onSaved(); onClose() }, 2000)
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Crear usuario</div>
          <button className="btn-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            {exito && <div className="alert alert-success">✅ Usuario creado. Ya puede ingresar con su nombre de usuario y contraseña.</div>}

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ana" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido</label>
                <input className="input" value={form.apellido} onChange={e => set('apellido', e.target.value)} placeholder="García" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre de usuario *</label>
              <input
                className="input"
                value={form.usuario}
                onChange={e => set('usuario', e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
                required
                placeholder="secretaria"
              />
              {form.usuario && (
                <div className="form-hint">Ingresará con: <strong>{form.usuario.toLowerCase()}</strong></div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña *</label>
              <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required placeholder="Mínimo 6 caracteres" />
            </div>

            <div className="form-group">
              <label className="form-label">Rol *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {Object.entries(ROL_LABEL).map(([rol, label]) => (
                  <div key={rol} onClick={() => set('rol', rol)} style={{
                    border: `1.5px solid ${form.rol === rol ? 'var(--sage)' : 'var(--border-2)'}`,
                    borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                    background: form.rol === rol ? 'var(--sage-pale)' : 'white',
                    display: 'flex', alignItems: 'center', gap: 10, transition: 'all .15s',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: form.rol === rol ? 'var(--sage)' : 'var(--ink)' }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{ROL_DESC[rol]}</div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${form.rol === rol ? 'var(--sage)' : 'var(--border-2)'}`,
                      background: form.rol === rol ? 'var(--sage)' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {form.rol === rol && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading || exito}>
              {loading
                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Creando...</>
                : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: Cambiar contraseña de otro usuario ─────────────
function ModalPassword({ perfil, onClose }) {
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (nueva.length < 6) { setError('Mínimo 6 caracteres'); return }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden'); return }
    setError('')
    setLoading(true)

    // Actualizamos en auth.users via SQL
    const { error: err } = await supabase.rpc('admin_cambiar_password', {
      p_user_id: perfil.id,
      p_password: nueva,
    })

    if (err) {
      setError(`No se pudo cambiar automáticamente. Andá a Supabase → Authentication → Users → buscá a ${perfil.nombre || 'este usuario'} → Edit → cambiá la contraseña ahí.`)
      setLoading(false)
      return
    }

    setExito(true)
    setLoading(false)
    setTimeout(onClose, 2000)
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">
            Contraseña — {perfil.nombre ? `${perfil.nombre} ${perfil.apellido || ''}`.trim() : 'Usuario'}
          </div>
          <button className="btn-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            {exito && <div className="alert alert-success">✅ Contraseña actualizada correctamente</div>}
            <div className="form-group">
              <label className="form-label">Nueva contraseña</label>
              <input className="input" type="password" value={nueva} onChange={e => setNueva(e.target.value)} required placeholder="Mínimo 6 caracteres" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar contraseña</label>
              <input className="input" type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} required placeholder="Repetí la contraseña" />
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
              {loading
                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Guardando...</>
                : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────
export default function Usuarios() {
  const { user } = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalCrear, setModalCrear] = useState(false)
  const [modalPassword, setModalPassword] = useState(null)
  const [cambiandoRol, setCambiandoRol] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('perfiles').select('*').order('created_at')
    setPerfiles(data || [])
    setLoading(false)
  }

  async function cambiarRol(id, nuevoRol) {
    setCambiandoRol(id)
    await supabase.from('perfiles').update({ rol: nuevoRol }).eq('id', id)
    await cargar()
    setCambiandoRol(null)
  }

  const initiales = (p) =>
    `${(p.nombre || '?')[0]}${(p.apellido || '')[0] || ''}`.toUpperCase()

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Usuarios del sistema</div>
          <div className="page-sub">Gestioná quién puede acceder y con qué permisos</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalCrear(true)}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Crear usuario
        </button>
      </div>

      {/* Tabla de permisos */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Tabla de permisos por rol</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--warm)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Módulo</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Psicóloga</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Secretaria</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Dashboard y estadísticas', true, false],
                ['Ver agenda', true, true],
                ['Crear / editar turnos', true, true],
                ['Ver pacientes', true, true],
                ['Crear / editar pacientes', true, true],
                ['Fichas clínicas (notas privadas)', true, false],
                ['Facturación y cobros', true, false],
                ['Gestión de usuarios', true, false],
              ].map(([mod, psi, sec], i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--ink)' }}>{mod}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {psi ? <span style={{ color: 'var(--success)', fontSize: 16 }}>✓</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {sec ? <span style={{ color: 'var(--success)', fontSize: 16 }}>✓</span> : <span style={{ color: 'var(--danger)', fontSize: 16 }}>✗</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de usuarios */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" />Cargando...</div>
      ) : (
        <div className="tabla-wrapper">
          <div className="tabla-header" style={{ gridTemplateColumns: '2fr 1.5fr 1.4fr 1.2fr 70px' }}>
            <div>Nombre</div>
            <div>Usuario</div>
            <div>Rol actual</div>
            <div>Cambiar rol</div>
            <div>Pass</div>
          </div>
          {perfiles.map((p, i) => {
            const [bg, fg] = avatarColors[i % avatarColors.length]
            const esMismoPerfil = p.id === user?.id
            return (
              <div key={p.id} className="tabla-row" style={{ gridTemplateColumns: '2fr 1.5fr 1.4fr 1.2fr 70px' }}>

                {/* Nombre */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: bg, color: fg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {initiales(p)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                      {p.nombre ? `${p.nombre} ${p.apellido || ''}`.trim() : '—'}
                    </div>
                    {esMismoPerfil && (
                      <div style={{ fontSize: 11, color: 'var(--sage)' }}>Tu cuenta</div>
                    )}
                  </div>
                </div>

                {/* Usuario de login */}
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>
                  {p.nombre ? p.nombre.toLowerCase() : '—'}
                </div>

                {/* Rol */}
                <div>
                  <span className={`pill ${ROL_PILL[p.rol] || 'pill-gray'}`}>
                    {ROL_LABEL[p.rol] || p.rol}
                  </span>
                </div>

                {/* Cambiar rol */}
                <div>
                  {esMismoPerfil ? (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                  ) : (
                    <select
                      className="select"
                      style={{ fontSize: 12, padding: '5px 8px' }}
                      value={p.rol}
                      disabled={cambiandoRol === p.id}
                      onChange={e => cambiarRol(p.id, e.target.value)}
                    >
                      {Object.entries(ROL_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Botón contraseña */}
                <div>
                  {!esMismoPerfil && (
                    <button
                      className="ic-btn"
                      title="Cambiar contraseña"
                      onClick={() => setModalPassword(p)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="15" r="5"/>
                        <path d="M15.5 8.5l5 5M17 7l2 2M21 3l-3 4"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{
        marginTop: 20, padding: '14px 18px', background: 'var(--amber-pale)',
        border: '1px solid #F0D58C', borderRadius: 10, fontSize: 13, color: 'var(--amber)', lineHeight: 1.6,
      }}>
        <strong>💡 Para crear la secretaria:</strong> Clic en "Crear usuario" → ponés nombre, un nombre de usuario simple (ej: <strong>secretaria</strong>) y contraseña → rol Secretaria. Ella ingresa a la app con ese nombre de usuario y contraseña.
      </div>

      {modalCrear && (
        <ModalCrear onClose={() => setModalCrear(false)} onSaved={cargar} />
      )}
      {modalPassword && (
        <ModalPassword perfil={modalPassword} onClose={() => setModalPassword(null)} />
      )}
    </>
  )
}
