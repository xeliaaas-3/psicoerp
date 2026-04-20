import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

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

const ROL_DESCRIPCION = {
  admin: 'Acceso total al sistema',
  psicologo: 'Acceso total al sistema',
  secretaria: 'Solo agenda y pacientes — sin fichas clínicas ni facturación',
}

function ModalUsuario({ onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', apellido: '', usuario: '', password: '', rol: 'secretaria' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Convertimos el nombre de usuario en un email ficticio interno
  // Así Supabase lo acepta sin mandar correo de verificación
  const toEmail = (usuario) => `${usuario.toLowerCase().replace(/\s+/g, '.')}@consultorio.local`

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.usuario.trim()) { setError('Ingresá un nombre de usuario'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError('')
    setLoading(true)

    const emailFicticio = toEmail(form.usuario)

    const { data: signData, error: signError } = await supabase.auth.signUp({
      email: emailFicticio,
      password: form.password,
      options: { data: { nombre: form.nombre, apellido: form.apellido } }
    })

    if (signError) {
      setError('Error al crear usuario: ' + signError.message)
      setLoading(false)
      return
    }

    if (signData?.user) {
      await supabase.from('perfiles').upsert({
        id: signData.user.id,
        nombre: form.nombre,
        apellido: form.apellido,
        rol: form.rol,
      })
    }

    setExito(true)
    setLoading(false)
    setTimeout(() => { onSaved(); onClose() }, 2500)
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Crear usuario</div>
          <button className="btn-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            {exito && (
              <div className="alert alert-success">
                ✅ Usuario creado. Puede ingresar con su nombre de usuario y contraseña.
              </div>
            )}

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
                placeholder="secretaria (sin espacios)"
              />
              {form.usuario && (
                <div className="form-hint">
                  Ingresará con: <strong>{form.usuario.toLowerCase()}</strong>
                </div>
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
                    background: form.rol === rol ? 'var(--sage-pale)' : 'white', transition: 'all .15s',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: form.rol === rol ? 'var(--sage)' : 'var(--ink)' }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{ROL_DESCRIPCION[rol]}</div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${form.rol === rol ? 'var(--sage)' : 'var(--border-2)'}`,
                      background: form.rol === rol ? 'var(--sage)' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {form.rol === rol && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading || exito}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Creando...</> : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Invitar usuario</div>
          <button className="btn-close" onClick={onClose}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            {exito && (
              <div className="alert alert-success">
                ✅ Usuario creado correctamente. Ya puede ingresar con su email y contraseña.
              </div>
            )}

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="input" value={form.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="Ana" />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido</label>
                <input className="input" value={form.apellido} onChange={e => set('apellido', e.target.value)} placeholder="García" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="secretaria@consultorio.com" />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña *</label>
              <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required placeholder="Mínimo 6 caracteres" />
              <div className="form-hint">La secretaria usará esta contraseña para ingresar</div>
            </div>

            <div className="form-group">
              <label className="form-label">Rol *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {Object.entries(ROL_LABEL).map(([rol, label]) => (
                  <div
                    key={rol}
                    onClick={() => set('rol', rol)}
                    style={{
                      border: `1.5px solid ${form.rol === rol ? 'var(--sage)' : 'var(--border-2)'}`,
                      borderRadius: 10,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      background: form.rol === rol ? 'var(--sage-pale)' : 'white',
                      transition: 'all .15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: form.rol === rol ? 'var(--sage)' : 'var(--ink)' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {ROL_DESCRIPCION[rol]}
                      </div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: `2px solid ${form.rol === rol ? 'var(--sage)' : 'var(--border-2)'}`,
                      background: form.rol === rol ? 'var(--sage)' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {form.rol === rol && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
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
                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Creando usuario...</>
                : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Usuarios() {
  const { user } = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
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

  const avatarColors = [
    ['#D8F3DC','#2D6A4F'], ['#E6F1FB','#185FA5'], ['#FAEEDA','#BA7517'],
    ['#FBEAF0','#993556'], ['#EDE7F6','#512DA8'],
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Usuarios del sistema</div>
          <div className="page-sub">Gestioná quién puede acceder y con qué permisos</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Invitar usuario
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
                    {psi
                      ? <span style={{ color: 'var(--success)', fontSize: 16 }}>✓</span>
                      : <span style={{ color: 'var(--muted)', fontSize: 16 }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {sec
                      ? <span style={{ color: 'var(--success)', fontSize: 16 }}>✓</span>
                      : <span style={{ color: 'var(--danger)', fontSize: 16 }}>✗</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de usuarios */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" />Cargando usuarios...</div>
      ) : (
        <div className="tabla-wrapper">
          <div className="tabla-header" style={{ gridTemplateColumns: '2fr 2fr 1.2fr 1fr' }}>
            <div>Usuario</div>
            <div>Email</div>
            <div>Rol actual</div>
            <div>Cambiar rol</div>
          </div>
          {perfiles.map((p, i) => {
            const [bg, fg] = avatarColors[i % avatarColors.length]
            const esMismoPerfil = p.id === user?.id
            return (
              <div key={p.id} className="tabla-row" style={{ gridTemplateColumns: '2fr 2fr 1.2fr 1fr' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {initiales(p)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                      {p.nombre ? `${p.nombre} ${p.apellido || ''}`.trim() : '—'}
                      {esMismoPerfil && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>(vos)</span>}
                    </div>
                  </div>
                </div>
                <div className="tabla-cell" style={{ fontSize: 13 }}>{p.id}</div>
                <div>
                  <span className={`pill ${ROL_PILL[p.rol] || 'pill-gray'}`}>
                    {ROL_LABEL[p.rol] || p.rol}
                  </span>
                </div>
                <div>
                  {esMismoPerfil ? (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Tu cuenta</span>
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
              </div>
            )
          })}
        </div>
      )}

      {/* Info adicional */}
      <div style={{
        marginTop: 20, padding: '14px 18px', background: 'var(--amber-pale)',
        border: '1px solid #F0D58C', borderRadius: 10, fontSize: 13, color: 'var(--amber)',
        lineHeight: 1.6,
      }}>
        <strong>💡 Cómo agregar a tu secretaria:</strong> Hacé clic en "Invitar usuario", completá su nombre, email y una contraseña. Seleccioná el rol <strong>Secretaria</strong>. Ella entra a la misma URL de la app con ese email y contraseña, y verá solo Agenda y Pacientes.
      </div>

      {modalOpen && (
        <ModalUsuario onClose={() => setModalOpen(false)} onSaved={cargar} />
      )}
    </>
  )
}
