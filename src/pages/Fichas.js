import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_EMO = {
  muy_bien: { label: 'Muy bien', pill: 'pill-green' },
  bien: { label: 'Bien', pill: 'pill-sage' },
  estable: { label: 'Estable', pill: 'pill-blue' },
  fluctuante: { label: 'Fluctuante', pill: 'pill-amber' },
  mal: { label: 'Mal', pill: 'pill-red' },
  crisis: { label: 'En crisis', pill: 'pill-red' },
}

function avatarColor(nombre) {
  const colors = [
    ['#D8F3DC','#2D6A4F'], ['#E6F1FB','#185FA5'], ['#FAEEDA','#BA7517'],
    ['#FBEAF0','#993556'], ['#EAF3DE','#3B6D11'], ['#EDE7F6','#512DA8'],
  ]
  const idx = (nombre?.charCodeAt(0) || 0) % colors.length
  return colors[idx]
}

function Avatar({ nombre, apellido, size = 32 }) {
  const [bg, fg] = avatarColor(nombre)
  const initials = `${(nombre || '?')[0]}${(apellido || '')[0] || ''}`.toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size < 36 ? 11 : 14, fontWeight: 600, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function ModalSesion({ sesion, pacienteId, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    paciente_id: pacienteId, fecha: format(new Date(), 'yyyy-MM-dd'),
    hora: '09:00', duracion_minutos: 60, tipo: 'presencial',
    nota_clinica: '', estado_emocional: 'estable',
    objetivos: '', tarea_asignada: '', privada: true,
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

    let res
    if (sesion?.id) {
      res = await supabase.from('sesiones').update(data).eq('id', sesion.id)
    } else {
      res = await supabase.from('sesiones').insert(data)
    }

    if (res.error) { setError(res.error.message); setLoading(false) }
    else { onSaved(); onClose() }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
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
                    <button key={t} type="button" className={`radio-card ${form.tipo === t ? 'selected' : ''}`} onClick={() => set('tipo', t)}>
                      {t === 'presencial' ? '🏥 Presencial' : '💻 Virtual'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Estado emocional del paciente</label>
                <select className="select" value={form.estado_emocional || ''} onChange={e => set('estado_emocional', e.target.value)}>
                  <option value="">Sin registrar</option>
                  {Object.entries(ESTADO_EMO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Nota clínica (privada)</label>
              <textarea className="textarea" rows={5} value={form.nota_clinica || ''} onChange={e => set('nota_clinica', e.target.value)} placeholder="Observaciones de la sesión, evolución del paciente, temas trabajados..." />
            </div>
            <div className="form-group">
              <label className="form-label">Objetivos terapéuticos</label>
              <textarea className="textarea" rows={2} value={form.objetivos || ''} onChange={e => set('objetivos', e.target.value)} placeholder="Objetivos trabajados o planteados en esta sesión..." />
            </div>
            <div className="form-group">
              <label className="form-label">Tarea asignada al paciente</label>
              <input className="input" value={form.tarea_asignada || ''} onChange={e => set('tarea_asignada', e.target.value)} placeholder="Registro de pensamientos, práctica de respiración, lectura..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Guardando...</> : (sesion?.id ? 'Guardar cambios' : 'Registrar sesión')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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

  useEffect(() => { cargarPacientes() }, [])
  useEffect(() => { if (pacienteSeleccionado) cargarSesiones(pacienteSeleccionado.id) }, [pacienteSeleccionado])

  async function cargarPacientes() {
    setLoading(true)
    const { data } = await supabase.from('pacientes').select('*').order('apellido')
    setPacientes(data || [])
    if (data?.length) setPacienteSeleccionado(data[0])
    setLoading(false)
  }

  async function cargarSesiones(pacienteId) {
    setLoadingSes(true)
    const { data } = await supabase.from('sesiones').select('*').eq('paciente_id', pacienteId).order('fecha', { ascending: false })
    setSesiones(data || [])
    setLoadingSes(false)
  }

  async function eliminarSesion(id) {
    if (!window.confirm('¿Eliminar esta sesión? La nota se perderá.')) return
    await supabase.from('sesiones').delete().eq('id', id)
    cargarSesiones(pacienteSeleccionado.id)
  }

  const pacientesFiltrados = pacientes.filter(p =>
    `${p.nombre} ${p.apellido} ${p.diagnostico || ''}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Fichas de sesión</div>
          <div className="page-sub">Historial clínico cronológico · privado y seguro</div>
        </div>
        {pacienteSeleccionado && (
          <button className="btn btn-primary" onClick={() => { setEditando(null); setModalOpen(true) }}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nueva sesión
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" />Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Lista de pacientes */}
          <div>
            <div className="search-bar" style={{ marginBottom: 10 }}>
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Buscar paciente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pacientesFiltrados.map(p => (
                <div key={p.id} onClick={() => setPacienteSeleccionado(p)} style={{
                  background: 'white', border: `1px solid ${pacienteSeleccionado?.id === p.id ? 'var(--sage-l)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 12px', cursor: 'pointer', transition: 'all .15s',
                  background: pacienteSeleccionado?.id === p.id ? 'var(--sage-pale)' : 'white',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar nombre={p.nombre} apellido={p.apellido} size={30} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.nombre} {p.apellido}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.diagnostico || 'Sin diagnóstico'}</div>
                    </div>
                  </div>
                </div>
              ))}
              {pacientesFiltrados.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: 13 }}>Sin resultados</div>
              )}
            </div>
          </div>

          {/* Panel de sesiones */}
          {pacienteSeleccionado ? (
            <div className="card">
              {/* Header paciente */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                <Avatar nombre={pacienteSeleccionado.nombre} apellido={pacienteSeleccionado.apellido} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {pacienteSeleccionado.edad ? `${pacienteSeleccionado.edad} años · ` : ''}
                    {sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''} registradas
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {pacienteSeleccionado.diagnostico && (
                      <span className="pill pill-gray" style={{ fontSize: 11 }}>{pacienteSeleccionado.diagnostico}</span>
                    )}
                    {pacienteSeleccionado.obra_social && (
                      <span className="pill pill-blue" style={{ fontSize: 11 }}>{pacienteSeleccionado.obra_social}</span>
                    )}
                    {pacienteSeleccionado.motivo_consulta && (
                      <span className="pill pill-sage" style={{ fontSize: 11 }}>MC: {pacienteSeleccionado.motivo_consulta.slice(0, 30)}{pacienteSeleccionado.motivo_consulta.length > 30 ? '...' : ''}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sesiones */}
              {loadingSes ? (
                <div className="loading-spinner"><div className="spinner" /></div>
              ) : sesiones.length === 0 ? (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <p>No hay sesiones registradas para este paciente</p>
                  <button className="btn btn-primary" onClick={() => { setEditando(null); setModalOpen(true) }}>
                    Registrar primera sesión
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sesiones.map(s => (
                    <div key={s.id} style={{
                      border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px',
                      borderLeft: `3px solid ${s.tipo === 'virtual' ? '#378ADD' : 'var(--sage)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                            {format(parseISO(s.fecha), "d 'de' MMMM, yyyy", { locale: es })}
                            {s.hora && ` · ${s.hora.slice(0,5)}`}
                            {` · ${s.duracion_minutos} min`}
                          </div>
                          <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
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
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="ic-btn" onClick={() => { setEditando(s); setModalOpen(true) }}>
                            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="ic-btn danger" onClick={() => eliminarSesion(s.id)}>
                            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                          </button>
                        </div>
                      </div>

                      {s.nota_clinica && (
                        <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 8 }}>{s.nota_clinica}</div>
                      )}

                      {s.objetivos && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>Objetivos:</span> {s.objetivos}
                        </div>
                      )}
                      {s.tarea_asignada && (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          <span style={{ fontWeight: 600 }}>Tarea:</span> {s.tarea_asignada}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state card">
              <p>Seleccioná un paciente para ver sus sesiones</p>
            </div>
          )}
        </div>
      )}

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
