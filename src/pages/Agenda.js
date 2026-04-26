import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isToday, isSameDay, addMonths, subMonths
} from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_TURNO = {
  pendiente:  { label: 'Pendiente',  pill: 'pill-amber' },
  confirmado: { label: 'Confirmado', pill: 'pill-green' },
  cancelado:  { label: 'Cancelado',  pill: 'pill-red'   },
  realizado:  { label: 'Realizado',  pill: 'pill-gray'  },
  ausente:    { label: 'Ausente',    pill: 'pill-red'   },
}

// ── Modal nuevo/editar turno ──────────────────────────────
function ModalTurno({ turno, pacientes, fechaInicial, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    paciente_id: '', hora: '09:00',
    duracion_minutos: 60, tipo: 'presencial', estado: 'pendiente', notas: '',
    ...turno,
    fecha: turno?.fecha || fechaInicial || format(new Date(), 'yyyy-MM-dd'),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.paciente_id) { setError('Seleccioná un paciente'); return }
    setError('')
    setLoading(true)
    const data = { ...form, psicologo_id: user.id }
    delete data.id; delete data.created_at; delete data.updated_at; delete data.pacientes

    const res = turno?.id
      ? await supabase.from('turnos').update(data).eq('id', turno.id)
      : await supabase.from('turnos').insert(data)

    if (res.error) { setError(res.error.message); setLoading(false) }
    else { onSaved(); onClose() }
  }

  const fechaDisplay = form.fecha
    ? format(new Date(form.fecha + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })
    : ''

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{turno?.id ? 'Editar turno' : 'Nuevo turno'}</div>
            {!turno?.id && fechaDisplay && (
              <div style={{ fontSize: 13, color: 'var(--sage)', fontWeight: 500, marginTop: 2, textTransform: 'capitalize' }}>
                📅 {fechaDisplay}
              </div>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Paciente *</label>
              <select className="select" value={form.paciente_id} onChange={e => set('paciente_id', e.target.value)} required>
                <option value="">Seleccioná un paciente...</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
                ))}
              </select>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input className="input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Hora *</label>
                <input className="input" type="time" value={form.hora} onChange={e => set('hora', e.target.value)} required />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Duración</label>
                <select className="select" value={form.duracion_minutos} onChange={e => set('duracion_minutos', parseInt(e.target.value))}>
                  {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="select" value={form.estado} onChange={e => set('estado', e.target.value)}>
                  {Object.entries(ESTADO_TURNO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

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
              <label className="form-label">Notas</label>
              <textarea className="textarea" rows={2} value={form.notas || ''} onChange={e => set('notas', e.target.value)} placeholder="Ej: Traer estudios, sesión de seguimiento..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Guardando...</>
                : turno?.id ? 'Guardar cambios' : 'Agendar turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Tarjeta de turno en el panel lateral ─────────────────
function TurnoCard({ t, onEditar, onEliminar }) {
  const esVirtual = t.tipo === 'virtual'
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${esVirtual ? '#378ADD' : 'var(--sage)'}`,
      borderRadius: 10, padding: '12px 14px',
      background: 'white', transition: 'box-shadow .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>
            {t.hora?.slice(0, 5)} — {t.pacientes?.nombre} {t.pacientes?.apellido}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <span className={`pill ${esVirtual ? 'pill-blue' : 'pill-sage'}`} style={{ fontSize: 10 }}>
              {esVirtual ? 'Virtual' : 'Presencial'}
            </span>
            <span className={`pill ${ESTADO_TURNO[t.estado]?.pill}`} style={{ fontSize: 10 }}>
              {ESTADO_TURNO[t.estado]?.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t.duracion_minutos} min</span>
          </div>
          {t.notas && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.4 }}>{t.notas}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="ic-btn" title="Editar" onClick={() => onEditar(t)}>
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="ic-btn danger" title="Eliminar" onClick={() => onEliminar(t.id)}>
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────
export default function Agenda() {
  const { user } = useAuth()
  const [mesActual, setMesActual] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date())
  const [turnosDia, setTurnosDia] = useState([])
  // En móvil, alternar entre vista calendario y lista del día
  const [vistaMovil, setVistaMovil] = useState('calendario') // 'calendario' | 'dia'

  useEffect(() => { cargar() }, [mesActual])
  useEffect(() => {
    const key = format(diaSeleccionado, 'yyyy-MM-dd')
    setTurnosDia(turnos.filter(t => t.fecha === key))
  }, [diaSeleccionado, turnos])

  async function cargar() {
    setLoading(true)
    const inicio = format(startOfMonth(mesActual), 'yyyy-MM-dd')
    const fin = format(endOfMonth(mesActual), 'yyyy-MM-dd')
    const [turnosRes, pacsRes] = await Promise.all([
      supabase.from('turnos').select('*, pacientes(nombre, apellido)').gte('fecha', inicio).lte('fecha', fin).order('hora'),
      supabase.from('pacientes').select('id, nombre, apellido').neq('estado', 'alta').order('apellido'),
    ])
    setTurnos(turnosRes.data || [])
    setPacientes(pacsRes.data || [])
    setLoading(false)
  }

  async function eliminarTurno(id) {
    if (!window.confirm('¿Eliminar este turno?')) return
    await supabase.from('turnos').delete().eq('id', id)
    cargar()
  }

  const abrirModal = (turno = null) => { setEditando(turno); setModalOpen(true) }

  const seleccionarDia = (dia, esMes) => {
    setDiaSeleccionado(dia)
    if (window.innerWidth < 768) setVistaMovil('dia') // en móvil va directo a lista del día
  }

  // Grilla calendario
  const inicio = startOfWeek(startOfMonth(mesActual), { weekStartsOn: 0 })
  const fin = endOfWeek(endOfMonth(mesActual), { weekStartsOn: 0 })
  const dias = []
  let cur = inicio
  while (cur <= fin) { dias.push(cur); cur = addDays(cur, 1) }

  const turnosPorDia = (fecha) => turnos.filter(t => t.fecha === format(fecha, 'yyyy-MM-dd'))

  const coloresTurno = (tipo) => tipo === 'virtual'
    ? { bg: '#EBF5FB', color: '#1A5276' }
    : { bg: '#D8F3DC', color: '#2D6A4F' }

  const fechaDiaLabel = format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es })

  return (
    <>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Agenda</div>
          <div className="page-sub" style={{ textTransform: 'capitalize' }}>
            {format(mesActual, 'MMMM yyyy', { locale: es })}
          </div>
        </div>
        <div className="header-actions">
          {/* Navegación mes — en móvil solo flechas */}
          <button className="btn btn-ghost" onClick={() => setMesActual(m => subMonths(m, 1))}>←</button>
          <button className="btn btn-ghost" onClick={() => { setMesActual(new Date()); setDiaSeleccionado(new Date()) }}>Hoy</button>
          <button className="btn btn-ghost" onClick={() => setMesActual(m => addMonths(m, 1))}>→</button>
          <button className="btn btn-primary" onClick={() => abrirModal(null)}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span className="hide-mobile">Nuevo turno</span>
            <span className="show-mobile">Nuevo</span>
          </button>
        </div>
      </div>

      {/* ── Toggle vista móvil ──────────────────────────── */}
      <div className="mobile-only" style={{ display: 'none', gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => setVistaMovil('calendario')}
          style={{
            flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: vistaMovil === 'calendario' ? 'var(--sage)' : 'white',
            color: vistaMovil === 'calendario' ? 'white' : 'var(--muted)',
            boxShadow: vistaMovil === 'calendario' ? 'none' : '0 0 0 1px var(--border-2)',
          }}
        >
          📅 Calendario
        </button>
        <button
          onClick={() => setVistaMovil('dia')}
          style={{
            flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: vistaMovil === 'dia' ? 'var(--sage)' : 'white',
            color: vistaMovil === 'dia' ? 'white' : 'var(--muted)',
            boxShadow: vistaMovil === 'dia' ? 'none' : '0 0 0 1px var(--border-2)',
          }}
        >
          📋 {fechaDiaLabel.split(' ').slice(0, 2).join(' ')} ({turnosDia.length})
        </button>
      </div>

      {/* ── Layout desktop: 2 columnas / móvil: 1 columna ── */}
      <div className="agenda-layout">

        {/* ── CALENDARIO ─────────────────────────────────── */}
        <div className={`agenda-cal ${vistaMovil === 'dia' ? 'hide-mobile' : ''}`}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Días de la semana */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              background: 'var(--warm)', borderBottom: '1px solid var(--border)',
            }}>
              {['D','L','M','X','J','V','S'].map((d, i) => (
                <div key={i} style={{
                  textAlign: 'center', padding: '8px 2px',
                  fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '.04em',
                }}>{d}</div>
              ))}
            </div>

            {loading ? (
              <div className="loading-spinner"><div className="spinner" />Cargando...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {dias.map((dia, i) => {
                  const td = turnosPorDia(dia)
                  const esHoy = isToday(dia)
                  const esMes = isSameMonth(dia, mesActual)
                  const sel = isSameDay(dia, diaSeleccionado)
                  return (
                    <div key={i}
                      onClick={() => seleccionarDia(dia, esMes)}
                      onDoubleClick={() => { if (esMes) { setDiaSeleccionado(dia); abrirModal(null) } }}
                      style={{
                        minHeight: 72, padding: '5px 4px',
                        borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                        borderBottom: i < dias.length - 7 ? '1px solid var(--border)' : 'none',
                        background: sel ? 'var(--sage-pale)' : esHoy ? '#F0FBF5' : 'white',
                        cursor: 'pointer', opacity: esMes ? 1 : .3,
                        transition: 'background .1s',
                        position: 'relative',
                      }}
                    >
                      {/* Número del día */}
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', marginBottom: 3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: sel || esHoy ? 700 : 500,
                        background: esHoy ? 'var(--sage)' : sel ? 'var(--sage-l)' : 'transparent',
                        color: esHoy || sel ? 'white' : 'var(--ink)',
                      }}>
                        {format(dia, 'd')}
                      </div>

                      {/* Turnos — desktop muestra texto, móvil solo puntos */}
                      <div className="cal-turnos-desktop">
                        {td.slice(0, 2).map(t => {
                          const { bg, color } = coloresTurno(t.tipo)
                          return (
                            <div key={t.id} style={{
                              fontSize: 9, fontWeight: 600, padding: '2px 4px',
                              borderRadius: 4, marginBottom: 2,
                              background: bg, color,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {t.hora?.slice(0, 5)} {t.pacientes?.nombre}
                            </div>
                          )
                        })}
                        {td.length > 2 && (
                          <div style={{ fontSize: 9, color: 'var(--muted)', paddingLeft: 2 }}>+{td.length - 2}</div>
                        )}
                      </div>

                      {/* Móvil: solo puntos de colores */}
                      <div className="cal-turnos-mobile" style={{ display: 'none', justifyContent: 'center', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
                        {td.slice(0, 3).map(t => (
                          <div key={t.id} style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: t.tipo === 'virtual' ? '#378ADD' : 'var(--sage)',
                          }} />
                        ))}
                        {td.length > 3 && (
                          <div style={{ fontSize: 8, color: 'var(--muted)' }}>+{td.length - 3}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8, opacity: .7 }}>
            Toque un día para ver turnos · Doble toque para agendar
          </div>
        </div>

        {/* ── PANEL DEL DÍA ──────────────────────────────── */}
        <div className={`agenda-panel ${vistaMovil === 'calendario' ? 'hide-mobile' : ''}`}>
          <div className="card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, textTransform: 'capitalize' }}>{fechaDiaLabel}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {turnosDia.length === 0 ? 'Sin turnos' : `${turnosDia.length} turno${turnosDia.length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => abrirModal(null)}>
                + Agendar
              </button>
            </div>

            {turnosDia.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Sin turnos este día</div>
                <button className="btn btn-secondary" onClick={() => abrirModal(null)}>
                  + Agendar turno
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...turnosDia].sort((a, b) => a.hora > b.hora ? 1 : -1).map(t => (
                  <TurnoCard
                    key={t.id}
                    t={t}
                    onEditar={abrirModal}
                    onEliminar={eliminarTurno}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <ModalTurno
          turno={editando}
          pacientes={pacientes}
          fechaInicial={format(diaSeleccionado, 'yyyy-MM-dd')}
          onClose={() => setModalOpen(false)}
          onSaved={cargar}
        />
      )}
    </>
  )
}
