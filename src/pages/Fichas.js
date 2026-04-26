import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_EMO = {
  muy_bien:   { label: 'Muy bien',   pill: 'pill-green' },
  bien:       { label: 'Bien',       pill: 'pill-sage'  },
  estable:    { label: 'Estable',    pill: 'pill-blue'  },
  fluctuante: { label: 'Fluctuante', pill: 'pill-amber' },
  mal:        { label: 'Mal',        pill: 'pill-red'   },
  crisis:     { label: 'En crisis',  pill: 'pill-red'   },
}

function avatarColor(nombre) {
  const colors = [
    ['#D8F3DC','#2D6A4F'], ['#E6F1FB','#185FA5'], ['#FAEEDA','#BA7517'],
    ['#FBEAF0','#993556'], ['#EAF3DE','#3B6D11'], ['#EDE7F6','#512DA8'],
  ]
  return colors[(nombre?.charCodeAt(0) || 0) % colors.length]
}

function Avatar({ nombre, apellido, size = 32 }) {
  const [bg, fg] = avatarColor(nombre)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size < 36 ? 11 : 14, fontWeight: 700, flexShrink: 0,
    }}>
      {`${(nombre || '?')[0]}${(apellido || '')[0] || ''}`.toUpperCase()}
    </div>
  )
}

// ── Modal registrar/editar sesión ─────────────────────────
function ModalSesion({ sesion, pacienteId, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    paciente_id: pacienteId,
    fecha: format(new Date(), 'yyyy-MM-dd'),
    hora: '09:00', duracion_minutos: 60, tipo: 'presencial',
    nota_clinica: '', estado_emocional: 'estable',
    objetivos: '', tarea_asignada: '',
    ...sesion,
    fecha: sesion?.fecha || format(new Date(), 'yyyy-MM-dd'),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const data = { ...form, psicologo_id: user.id }
    delete data.id; delete data.created_at; delete data.updated_at

    const res = sesion?.id
      ? await supabase.from('sesiones').update(data).eq('id', sesion.id)
      : await supabase.from('sesiones').insert(data)

    if (res.error) { setError(res.error.message); setLoading(false) }
    else { onSaved(); onClose() }
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{sesion?.id ? 'Editar sesión' : 'Registrar sesión'}</div>
          <button className="btn-close" onClick={onClose}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input className="input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Hora</label>
                <input className="input" type="time" value={form.hora || ''} onChange={e => set('hora', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Duración</label>
                <select className="select" value={form.duracion_minutos} onChange={e => set('duracion_minutos', parseInt(e.target.value))}>
                  {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Modalidad</label>
                <div className="radio-cards">
                  {['presencial', 'virtual'].map(t => (
                    <button key={t} type="button"
                      className={`radio-card ${form.tipo === t ? 'selected' : ''}`}
                      onClick={() => set('tipo', t)}
                    >
                      {t === 'presencial' ? '🏥 Presencial' : '💻 Virtual'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Estado emocional</label>
                <select className="select" value={form.estado_emocional || ''} onChange={e => set('estado_emocional', e.target.value)}>
                  <option value="">Sin registrar</option>
                  {Object.entries(ESTADO_EMO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nota clínica</label>
              <textarea className="textarea" rows={4} value={form.nota_clinica || ''} onChange={e => set('nota_clinica', e.target.value)} placeholder="Observaciones, evolución, temas trabajados..." />
            </div>

            <div className="form-group">
              <label className="form-label">Objetivos terapéuticos</label>
              <textarea className="textarea" rows={2} value={form.objetivos || ''} onChange={e => set('objetivos', e.target.value)} placeholder="Objetivos trabajados o planteados..." />
            </div>

            <div className="form-group">
              <label className="form-label">Tarea asignada al paciente</label>
              <input className="input" value={form.tarea_asignada || ''} onChange={e => set('tarea_asignada', e.target.value)} placeholder="Registro de pensamientos, práctica de respiración..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Guardando...</>
                : sesion?.id ? 'Guardar cambios' : 'Registrar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────
export default function Fichas() {
  const { user } = useAuth()
  const [pacientes, setPacientes] = useState([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null)
  const [sesiones, setSesiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingSes, setLoadingSes] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  // En móvil: alternar entre lista de pacientes y sesiones
  const [vistaMovil, setVistaMovil] = useState('pacientes')

  useEffect(() => { cargarPacientes() }, [])
  useEffect(() => { if (pacienteSeleccionado) cargarSesiones(pacienteSeleccionado.id) }, [pacienteSeleccionado])

  async function cargarPacientes() {
    setLoading(true)
    const { data } = await supabase.from('pacientes').select('*').order('apellido')
    setPacientes(data || [])
    if (data?.length) setPacienteSeleccionado(data[0])
    setLoading(false)
  }

  async function cargarSesiones(id) {
    setLoadingSes(true)
    const { data } = await supabase.from('sesiones').select('*').eq('paciente_id', id).order('fecha', { ascending: false })
    setSesiones(data || [])
    setLoadingSes(false)
  }

  async function eliminarSesion(id) {
    if (!window.confirm('¿Eliminar esta sesión? La nota se perderá.')) return
    await supabase.from('sesiones').delete().eq('id', id)
    cargarSesiones(pacienteSeleccionado.id)
  }

  const seleccionarPaciente = (p) => {
    setPacienteSeleccionado(p)
    if (window.innerWidth < 768) setVistaMovil('sesiones')
  }

  const filtrados = pacientes.filter(p =>
    `${p.nombre} ${p.apellido} ${p.diagnostico || ''}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (loading) return <div className="loading-spinner"><div className="spinner" />Cargando...</div>

  return (
    <>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Fichas de sesión</div>
          <div className="page-sub">Historial clínico · privado</div>
        </div>
        {pacienteSeleccionado && (
          <button className="btn btn-primary" onClick={() => { setEditando(null); setModalOpen(true) }}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nueva sesión
          </button>
        )}
      </div>

      {/* ── Toggle vista móvil ──────────────────────────── */}
      <div className="mobile-only" style={{ display: 'none', gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => setVistaMovil('pacientes')}
          style={{
            flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: vistaMovil === 'pacientes' ? 'var(--sage)' : 'white',
            color: vistaMovil === 'pacientes' ? 'white' : 'var(--muted)',
            boxShadow: vistaMovil === 'pacientes' ? 'none' : '0 0 0 1px var(--border-2)',
          }}
        >
          👥 Pacientes ({pacientes.length})
        </button>
        <button
          onClick={() => setVistaMovil('sesiones')}
          style={{
            flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: vistaMovil === 'sesiones' ? 'var(--sage)' : 'white',
            color: vistaMovil === 'sesiones' ? 'white' : 'var(--muted)',
            boxShadow: vistaMovil === 'sesiones' ? 'none' : '0 0 0 1px var(--border-2)',
          }}
        >
          📋 {pacienteSeleccionado ? `${pacienteSeleccionado.nombre} (${sesiones.length})` : 'Sesiones'}
        </button>
      </div>

      {/* ── Layout ─────────────────────────────────────── */}
      <div className="fichas-layout">

        {/* ── Lista de pacientes ────────────────────────── */}
        <div className={`fichas-lista ${vistaMovil === 'sesiones' ? 'hide-mobile' : ''}`}>
          <div className="search-bar" style={{ marginBottom: 10 }}>
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Buscar paciente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtrados.map(p => {
              const sel = pacienteSeleccionado?.id === p.id
              return (
                <div key={p.id} onClick={() => seleccionarPaciente(p)} style={{
                  background: sel ? 'var(--sage-pale)' : 'white',
                  border: `1.5px solid ${sel ? 'var(--sage-l)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 12px',
                  cursor: 'pointer', transition: 'all .15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar nombre={p.nombre} apellido={p.apellido} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.nombre} {p.apellido}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                        {p.diagnostico || 'Sin diagnóstico'}
                      </div>
                    </div>
                    {sel && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    )}
                  </div>
                </div>
              )
            })}
            {filtrados.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: 13 }}>
                Sin resultados
              </div>
            )}
          </div>
        </div>

        {/* ── Panel de sesiones ─────────────────────────── */}
        <div className={`fichas-sesiones ${vistaMovil === 'pacientes' ? 'hide-mobile' : ''}`}>
          {!pacienteSeleccionado ? (
            <div className="empty-state card">
              <p>Seleccioná un paciente para ver sus sesiones</p>
            </div>
          ) : (
            <div className="card">
              {/* Header paciente */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 16,
              }}>
                <Avatar nombre={pacienteSeleccionado.nombre} apellido={pacienteSeleccionado.apellido} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {pacienteSeleccionado.edad ? `${pacienteSeleccionado.edad} años · ` : ''}
                    {sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                    {pacienteSeleccionado.diagnostico && (
                      <span className="pill pill-gray" style={{ fontSize: 11 }}>{pacienteSeleccionado.diagnostico}</span>
                    )}
                    {pacienteSeleccionado.motivo_consulta && (
                      <span className="pill pill-sage" style={{ fontSize: 11 }}>
                        {pacienteSeleccionado.motivo_consulta.slice(0, 30)}{pacienteSeleccionado.motivo_consulta.length > 30 ? '...' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de sesiones */}
              {loadingSes ? (
                <div className="loading-spinner"><div className="spinner" /></div>
              ) : sesiones.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px' }}>
                  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <p>No hay sesiones registradas</p>
                  <button className="btn btn-primary" onClick={() => { setEditando(null); setModalOpen(true) }}>
                    Registrar primera sesión
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sesiones.map(s => (
                    <div key={s.id} style={{
                      border: '1px solid var(--border)',
                      borderLeft: `4px solid ${s.tipo === 'virtual' ? '#378ADD' : 'var(--sage)'}`,
                      borderRadius: 10, padding: '13px 14px',
                    }}>
                      {/* Header sesión */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                            {format(parseISO(s.fecha), "d 'de' MMMM, yyyy", { locale: es })}
                            {s.hora && ` · ${s.hora.slice(0, 5)}`}
                            {` · ${s.duracion_minutos} min`}
                          </div>
                          <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                            <span className={`pill ${s.tipo === 'virtual' ? 'pill-blue' : 'pill-sage'}`} style={{ fontSize: 10 }}>
                              {s.tipo === 'virtual' ? 'Virtual' : 'Presencial'}
                            </span>
                            {s.estado_emocional && (
                              <span className={`pill ${ESTADO_EMO[s.estado_emocional]?.pill}`} style={{ fontSize: 10 }}>
                                {ESTADO_EMO[s.estado_emocional]?.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button className="ic-btn" onClick={() => { setEditando(s); setModalOpen(true) }}>
                            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="ic-btn danger" onClick={() => eliminarSesion(s.id)}>
                            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                          </button>
                        </div>
                      </div>

                      {/* Contenido */}
                      {s.nota_clinica && (
                        <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 8 }}>
                          {s.nota_clinica}
                        </div>
                      )}
                      {s.objetivos && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>
                          <strong>Objetivos:</strong> {s.objetivos}
                        </div>
                      )}
                      {s.tarea_asignada && (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          <strong>Tarea:</strong> {s.tarea_asignada}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {modalOpen && pacienteSeleccionado && (
        <ModalSesion
          sesion={editando}
          pacienteId={pacienteSeleccionado.id}
          onClose={() => setModalOpen(false)}
          onSaved={() => cargarSesiones(pacienteSeleccionado.id)}
        />
      )}
    </>
  )
}
