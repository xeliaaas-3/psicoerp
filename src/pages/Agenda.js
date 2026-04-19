import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isToday, isSameDay, addMonths, subMonths, parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_TURNO = {
  pendiente: { label: 'Pendiente', pill: 'pill-amber' },
  confirmado: { label: 'Confirmado', pill: 'pill-green' },
  cancelado: { label: 'Cancelado', pill: 'pill-red' },
  realizado: { label: 'Realizado', pill: 'pill-gray' },
  ausente: { label: 'Ausente', pill: 'pill-red' },
}

const TIPO_TURNO = { presencial: 'Presencial', virtual: 'Virtual' }

function ModalTurno({ turno, pacientes, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    paciente_id: '', fecha: format(new Date(), 'yyyy-MM-dd'), hora: '09:00',
    duracion_minutos: 60, tipo: 'presencial', estado: 'pendiente', notas: '',
    ...turno,
    fecha: turno?.fecha || format(new Date(), 'yyyy-MM-dd'),
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

    let res
    if (turno?.id) {
      res = await supabase.from('turnos').update(data).eq('id', turno.id)
    } else {
      res = await supabase.from('turnos').insert(data)
    }

    if (res.error) { setError(res.error.message); setLoading(false) }
    else { onSaved(); onClose() }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{turno?.id ? 'Editar turno' : 'Nuevo turno'}</div>
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
                <label className="form-label">Duración (minutos)</label>
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
                  <button key={t} type="button" className={`radio-card ${form.tipo === t ? 'selected' : ''}`} onClick={() => set('tipo', t)}>
                    {t === 'presencial' ? '🏥 Presencial' : '💻 Virtual'}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notas del turno</label>
              <textarea className="textarea" rows={2} value={form.notas || ''} onChange={e => set('notas', e.target.value)} placeholder="Ej: Traer estudios previos, sesión de seguimiento..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Guardando...</> : (turno?.id ? 'Guardar cambios' : 'Crear turno')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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

  useEffect(() => { cargar() }, [mesActual])
  useEffect(() => {
    const dia = format(diaSeleccionado, 'yyyy-MM-dd')
    setTurnosDia(turnos.filter(t => t.fecha === dia))
  }, [diaSeleccionado, turnos])

  async function cargar() {
    setLoading(true)
    const inicio = format(startOfMonth(mesActual), 'yyyy-MM-dd')
    const fin = format(endOfMonth(mesActual), 'yyyy-MM-dd')

    const [turnosRes, pacsRes] = await Promise.all([
      supabase.from('turnos').select('*, pacientes(nombre, apellido)').eq('psicologo_id', user.id).gte('fecha', inicio).lte('fecha', fin).order('hora'),
      supabase.from('pacientes').select('id, nombre, apellido').eq('psicologo_id', user.id).neq('estado', 'alta').order('apellido'),
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

  // Construir grilla del calendario
  const inicio = startOfWeek(startOfMonth(mesActual), { weekStartsOn: 0 })
  const fin = endOfWeek(endOfMonth(mesActual), { weekStartsOn: 0 })
  const dias = []
  let cur = inicio
  while (cur <= fin) { dias.push(cur); cur = addDays(cur, 1) }

  const turnosPorDia = (fecha) => {
    const key = format(fecha, 'yyyy-MM-dd')
    return turnos.filter(t => t.fecha === key)
  }

  const coloresTurno = (tipo) => tipo === 'virtual'
    ? { bg: '#EBF5FB', color: '#1A5276' }
    : { bg: '#D8F3DC', color: '#2D6A4F' }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Agenda</div>
          <div className="page-sub" style={{ textTransform: 'capitalize' }}>
            {format(mesActual, 'MMMM yyyy', { locale: es })}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setMesActual(m => subMonths(m, 1))}>← Anterior</button>
          <button className="btn btn-ghost" onClick={() => setMesActual(new Date())}>Hoy</button>
          <button className="btn btn-ghost" onClick={() => setMesActual(m => addMonths(m, 1))}>Siguiente →</button>
          <button className="btn btn-primary" onClick={() => { setEditando(null); setModalOpen(true) }}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo turno
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* CALENDARIO */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Cabecera días semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}>
            {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
              <div key={d} style={{ textAlign: 'center', padding: '10px 4px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{d}</div>
            ))}
          </div>
          {/* Grilla de días */}
          {loading ? (
            <div className="loading-spinner"><div className="spinner" />Cargando...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {dias.map((dia, i) => {
                const turnosDia = turnosPorDia(dia)
                const esHoy = isToday(dia)
                const esMes = isSameMonth(dia, mesActual)
                const seleccionado = isSameDay(dia, diaSeleccionado)
                return (
                  <div key={i} onClick={() => setDiaSeleccionado(dia)} style={{
                    minHeight: 90, padding: '6px 7px',
                    borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: i < dias.length - 7 ? '1px solid var(--border)' : 'none',
                    background: seleccionado ? '#EEF9F3' : esHoy ? '#F0FBF5' : 'white',
                    cursor: 'pointer',
                    opacity: esMes ? 1 : .35,
                    transition: 'background .1s',
                  }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, marginBottom: 4,
                      color: esHoy ? 'var(--sage)' : 'var(--ink)',
                      width: 24, height: 24, borderRadius: '50%',
                      background: esHoy ? 'var(--sage-pale)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{format(dia, 'd')}</div>
                    {turnosDia.slice(0, 3).map(t => {
                      const { bg, color } = coloresTurno(t.tipo)
                      return (
                        <div key={t.id} style={{ fontSize: 10, fontWeight: 500, padding: '2px 5px', borderRadius: 4, marginBottom: 2, background: bg, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.hora?.slice(0, 5)} {t.pacientes?.nombre}
                        </div>
                      )
                    })}
                    {turnosDia.length > 3 && (
                      <div style={{ fontSize: 10, color: 'var(--muted)', padding: '0 3px' }}>+{turnosDia.length - 3} más</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PANEL LATERAL: turnos del día seleccionado */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <div>
              <div className="card-title" style={{ textTransform: 'capitalize' }}>
                {format(diaSeleccionado, "EEEE d", { locale: es })}
              </div>
              <div className="card-sub">{turnosDia.length} turno{turnosDia.length !== 1 ? 's' : ''}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditando(null); setModalOpen(true) }}>+ Agregar</button>
          </div>

          {turnosDia.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
              Sin turnos este día
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {turnosDia.sort((a, b) => a.hora > b.hora ? 1 : -1).map(t => (
                <div key={t.id} style={{
                  border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px',
                  borderLeft: `3px solid ${t.tipo === 'virtual' ? '#378ADD' : 'var(--sage)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {t.hora?.slice(0, 5)} · {t.pacientes?.nombre} {t.pacientes?.apellido}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <span className={`pill ${t.tipo === 'virtual' ? 'pill-blue' : 'pill-sage'}`} style={{ fontSize: 10 }}>{TIPO_TURNO[t.tipo]}</span>
                    <span className={`pill ${ESTADO_TURNO[t.estado]?.pill}`} style={{ fontSize: 10 }}>{ESTADO_TURNO[t.estado]?.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>{t.duracion_minutos} min</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    <button className="ic-btn" title="Editar" onClick={() => { setEditando(t); setModalOpen(true) }}>
                      <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="ic-btn danger" title="Eliminar" onClick={() => eliminarTurno(t.id)}>
                      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <ModalTurno
          turno={editando}
          pacientes={pacientes}
          onClose={() => setModalOpen(false)}
          onSaved={cargar}
        />
      )}
    </>
  )
}
