import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const ESTADOS = ['activo', 'en_pausa', 'nuevo', 'alta']
const ESTADO_LABEL = { activo: 'Activo', en_pausa: 'En pausa', nuevo: 'Nuevo', alta: 'Alta' }
const ESTADO_PILL = { activo: 'pill-green', en_pausa: 'pill-amber', nuevo: 'pill-blue', alta: 'pill-gray' }

function avatarColor(nombre) {
  const colors = [
    ['#D8F3DC','#2D6A4F'], ['#E6F1FB','#185FA5'], ['#FAEEDA','#BA7517'],
    ['#FBEAF0','#993556'], ['#EAF3DE','#3B6D11'], ['#EDE7F6','#512DA8'],
  ]
  return colors[(nombre?.charCodeAt(0) || 0) % colors.length]
}

function Avatar({ nombre, apellido, size = 32 }) {
  const [bg, fg] = avatarColor(nombre)
  const initials = `${(nombre || '?')[0]}${(apellido || '')[0] || ''}`.toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size < 36 ? 11 : 14, fontWeight: 600, flexShrink: 0,
    }}>{initials}</div>
  )
}

// ── Modal Paciente ────────────────────────────────────────
// esSecretaria=true → muestra solo campos básicos (sin diagnóstico ni notas)
function ModalPaciente({ paciente, onClose, onSaved, esSecretaria }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    nombre: '', apellido: '', fecha_nacimiento: '', dni: '',
    telefono: '', email: '', direccion: '',
    motivo_consulta: '', diagnostico: '',
    estado: 'nuevo', notas_generales: '',
    cancelaciones_frecuentes: false, nota_cancelaciones: '',
    ...paciente
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const data = { ...form, psicologo_id: user.id }
    delete data.id; delete data.created_at; delete data.updated_at; delete data.edad

    const res = paciente?.id
      ? await supabase.from('pacientes').update(data).eq('id', paciente.id)
      : await supabase.from('pacientes').insert(data)

    if (res.error) { setError(res.error.message); setLoading(false) }
    else { onSaved(); onClose() }
  }

  const seccion = (label) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '18px 0 10px' }}>
      {label}
    </div>
  )

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{paciente?.id ? 'Editar paciente' : 'Nuevo paciente'}</div>
          <button className="btn-close" onClick={onClose}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            {seccion('Datos personales')}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="input" value={form.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="María" />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido *</label>
                <input className="input" value={form.apellido} onChange={e => set('apellido', e.target.value)} required placeholder="González" />
              </div>
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Fecha de nacimiento</label>
                <input className="input" type="date" value={form.fecha_nacimiento || ''} onChange={e => set('fecha_nacimiento', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Cédula de Identidad (CI)</label>
                <input className="input" value={form.dni || ''} onChange={e => set('dni', e.target.value)} placeholder="1.234.567" />
              </div>
              {/* Estado solo lo ve la psicóloga */}
              {!esSecretaria && (
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="select" value={form.estado} onChange={e => set('estado', e.target.value)}>
                    {ESTADOS.map(s => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="divider" />
            {seccion('Contacto')}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input className="input" value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} placeholder="0981 123 456" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="correo@gmail.com" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input className="input" value={form.direccion || ''} onChange={e => set('direccion', e.target.value)} placeholder="Av. Mcal. López 1234, Asunción" />
            </div>

            {/* Motivo de consulta — todos pueden verlo */}
            <div className="divider" />
            {seccion('Motivo de consulta')}
            <div className="form-group">
              <textarea className="textarea" value={form.motivo_consulta || ''} onChange={e => set('motivo_consulta', e.target.value)} placeholder="¿Por qué viene a consulta?" rows={3} />
            </div>

            {/* Sección clínica — SOLO psicóloga */}
            {!esSecretaria && (
              <>
                <div className="divider" />
                {seccion('Información clínica (privado)')}
                <div style={{
                  background: 'var(--info-pale)', border: '1px solid #AED6F1',
                  borderRadius: 9, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--info)',
                }}>
                  🔒 Esta sección solo es visible para la psicóloga
                </div>
                <div className="form-group">
                  <label className="form-label">Diagnóstico</label>
                  <input className="input" value={form.diagnostico || ''} onChange={e => set('diagnostico', e.target.value)} placeholder="Ansiedad generalizada, Depresión moderada..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Notas generales</label>
                  <textarea className="textarea" value={form.notas_generales || ''} onChange={e => set('notas_generales', e.target.value)} placeholder="Antecedentes, medicación, información relevante..." rows={3} />
                </div>

                <div className="divider" />
                {seccion('Alertas de conducta')}
                <div style={{
                  border: `1.5px solid ${form.cancelaciones_frecuentes ? '#F5B7B1' : 'var(--border-2)'}`,
                  borderRadius: 10, padding: '12px 14px',
                  background: form.cancelaciones_frecuentes ? '#FEF9F9' : 'white',
                  transition: 'all .2s', marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.cancelaciones_frecuentes ? 10 : 0 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: form.cancelaciones_frecuentes ? 'var(--danger)' : 'var(--ink)' }}>
                        ⚠️ Cancelaciones frecuentes
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        Se mostrará una alerta visible en el perfil del paciente
                      </div>
                    </div>
                    <div onClick={() => set('cancelaciones_frecuentes', !form.cancelaciones_frecuentes)} style={{
                      width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                      background: form.cancelaciones_frecuentes ? 'var(--danger)' : '#D1D5DB',
                      position: 'relative', transition: 'background .2s', flexShrink: 0,
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: 'white',
                        position: 'absolute', top: 3,
                        left: form.cancelaciones_frecuentes ? 23 : 3,
                        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                  </div>
                  {form.cancelaciones_frecuentes && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Nota sobre cancelaciones</label>
                      <textarea className="textarea" rows={2} value={form.nota_cancelaciones || ''} onChange={e => set('nota_cancelaciones', e.target.value)} placeholder="Ej: Canceló 3 veces en el último mes..." style={{ marginTop: 6 }} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Guardando...</>
                : (paciente?.id ? 'Guardar cambios' : 'Crear paciente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────
export default function Pacientes() {
  const { user, perfil } = useAuth()
  const esSecretaria = perfil?.rol === 'secretaria'

  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('pacientes').select('*').order('apellido')
    setPacientes(data || [])
    setLoading(false)
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este paciente?')) return
    await supabase.from('pacientes').delete().eq('id', id)
    cargar()
  }

  const filtrados = pacientes.filter(p => {
    const texto = `${p.nombre} ${p.apellido} ${p.diagnostico || ''} ${p.email || ''} ${p.dni || ''}`.toLowerCase()
    const matchBusqueda = texto.includes(busqueda.toLowerCase())
    const matchEstado = filtroEstado === 'todos'
      ? true
      : filtroEstado === 'cancelaciones'
      ? p.cancelaciones_frecuentes === true
      : p.estado === filtroEstado
    return matchBusqueda && matchEstado
  })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Pacientes</div>
          <div className="page-sub">{pacientes.length} pacientes registrados</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditando(null); setModalOpen(true) }}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo paciente
        </button>
      </div>

      {/* Filtros — solo psicóloga */}
      {!esSecretaria && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {['todos', ...ESTADOS].map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)} className={`btn btn-sm ${filtroEstado === e ? 'btn-secondary' : 'btn-ghost'}`}>
              {e === 'todos' ? 'Todos' : ESTADO_LABEL[e]}
              {e !== 'todos' && <span style={{ marginLeft: 4, fontSize: 11, opacity: .7 }}>({pacientes.filter(p => p.estado === e).length})</span>}
            </button>
          ))}
          <button
            onClick={() => setFiltroEstado(filtroEstado === 'cancelaciones' ? 'todos' : 'cancelaciones')}
            style={{
              marginLeft: 4, borderRadius: 9, padding: '6px 12px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
              background: filtroEstado === 'cancelaciones' ? '#FDEDEC' : 'white',
              color: filtroEstado === 'cancelaciones' ? 'var(--danger)' : 'var(--muted)',
              border: `1px solid ${filtroEstado === 'cancelaciones' ? '#F5B7B1' : 'var(--border-2)'}`,
            }}
          >
            ⚠️ Cancelan frecuente ({pacientes.filter(p => p.cancelaciones_frecuentes).length})
          </button>
        </div>
      )}

      <div className="search-bar">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input placeholder="Buscar por nombre, CI, teléfono..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        {busqueda && <button onClick={() => setBusqueda('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18 }}>×</button>}
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" />Cargando pacientes...</div>
      ) : filtrados.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <p>{busqueda ? `Sin resultados para "${busqueda}"` : 'No hay pacientes registrados aún'}</p>
          {!busqueda && <button className="btn btn-primary" onClick={() => { setEditando(null); setModalOpen(true) }}>Agregar primer paciente</button>}
        </div>
      ) : (
        <div className="tabla-wrapper">
          {/* Columnas distintas según rol */}
          {esSecretaria ? (
            <>
              <div className="tabla-header" style={{ gridTemplateColumns: '2fr 1fr 1.2fr 1.4fr 60px' }}>
                <div>Paciente</div><div>CI</div><div>Teléfono</div><div>Email</div><div></div>
              </div>
              {filtrados.map(p => (
                <div key={p.id} className="tabla-row" style={{ gridTemplateColumns: '2fr 1fr 1.2fr 1.4fr 60px' }}>
                  <div className="patient-name-cell">
                    <Avatar nombre={p.nombre} apellido={p.apellido} />
                    <div>
                      <div className="tabla-cell-primary">{p.nombre} {p.apellido}</div>
                      {p.motivo_consulta && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.motivo_consulta.slice(0, 40)}{p.motivo_consulta.length > 40 ? '...' : ''}</div>}
                    </div>
                  </div>
                  <div className="tabla-cell">{p.dni || '—'}</div>
                  <div className="tabla-cell">{p.telefono || '—'}</div>
                  <div className="tabla-cell" style={{ fontSize: 12 }}>{p.email || '—'}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="ic-btn" title="Editar" onClick={() => { setEditando(p); setModalOpen(true) }}>
                      <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="tabla-header" style={{ gridTemplateColumns: '2.2fr 1fr 1.4fr 1.2fr 1fr 88px' }}>
                <div>Paciente</div><div>Edad</div><div>Diagnóstico</div><div>Contacto</div><div>Estado</div><div>Acciones</div>
              </div>
              {filtrados.map(p => (
                <div key={p.id} className="tabla-row" style={{ gridTemplateColumns: '2.2fr 1fr 1.4fr 1.2fr 1fr 88px' }}>
                  <div className="patient-name-cell">
                    <Avatar nombre={p.nombre} apellido={p.apellido} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="tabla-cell-primary">{p.nombre} {p.apellido}</div>
                        {p.cancelaciones_frecuentes && (
                          <span title={p.nota_cancelaciones || 'Cancelaciones frecuentes'} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#FDEDEC', color: 'var(--danger)', border: '1px solid #F5B7B1', cursor: 'help' }}>
                            ⚠️ Cancela frecuente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="tabla-cell">{p.edad ? `${p.edad} años` : '—'}</div>
                  <div className="tabla-cell" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.diagnostico || '—'}</div>
                  <div className="tabla-cell">{p.telefono || p.email || '—'}</div>
                  <div><span className={`pill ${ESTADO_PILL[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span></div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="ic-btn" title="Editar" onClick={() => { setEditando(p); setModalOpen(true) }}>
                      <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="ic-btn danger" title="Eliminar" onClick={() => eliminar(p.id)}>
                      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {modalOpen && (
        <ModalPaciente
          paciente={editando}
          esSecretaria={esSecretaria}
          onClose={() => setModalOpen(false)}
          onSaved={cargar}
        />
      )}
    </>
  )
}
