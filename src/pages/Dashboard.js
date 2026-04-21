import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const estadoEmocionalLabel = {
  muy_bien: 'Muy bien', bien: 'Bien', estable: 'Estable',
  fluctuante: 'Fluctuante', mal: 'Mal', crisis: 'En crisis'
}

const tipoTurnoLabel = { presencial: 'Presencial', virtual: 'Virtual' }

function DotColor({ estado }) {
  const colors = {
    confirmado: '#52B788', pendiente: '#EF9F27',
    cancelado: '#C0392B', realizado: '#B4B2A9', ausente: '#E74C3C'
  }
  return <span style={{ width: 9, height: 9, borderRadius: '50%', background: colors[estado] || '#ccc', display: 'inline-block', flexShrink: 0 }} />
}

function TurnoTag({ tipo }) {
  return (
    <span className={`pill ${tipo === 'virtual' ? 'pill-blue' : 'pill-sage'}`} style={{ fontSize: 11 }}>
      {tipoTurnoLabel[tipo] || tipo}
    </span>
  )
}

export default function Dashboard() {
  const { perfil, user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ pacientes: 0, turnosSemana: 0, pendienteCobro: 0, sesionesMes: 0 })
  const [turnosHoy, setTurnosHoy] = useState([])
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDashboard()
  }, [])

  async function cargarDashboard() {
    setLoading(true)
    const hoy = format(new Date(), 'yyyy-MM-dd')
    const inicioSemana = format(new Date(new Date().setDate(new Date().getDate() - new Date().getDay())), 'yyyy-MM-dd')
    const finSemana = format(new Date(new Date().setDate(new Date().getDate() + (6 - new Date().getDay()))), 'yyyy-MM-dd')
    const inicioMes = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')

    const [pacsRes, turnosSemRes, turnosHoyRes, pagosRes, sesionesRes] = await Promise.all([
      supabase.from('pacientes').select('id', { count: 'exact' }).neq('estado', 'alta'),
      supabase.from('turnos').select('id', { count: 'exact' }).gte('fecha', inicioSemana).lte('fecha', finSemana).neq('estado', 'cancelado'),
      supabase.from('turnos').select('*, pacientes(nombre, apellido)').eq('fecha', hoy).order('hora'),
      supabase.from('pagos').select('monto').eq('estado', 'pendiente'),
      supabase.from('sesiones').select('id', { count: 'exact' }).gte('fecha', inicioMes),
    ])

    const pendienteCobro = (pagosRes.data || []).reduce((sum, p) => sum + parseFloat(p.monto || 0), 0)

    setStats({
      pacientes: pacsRes.count || 0,
      turnosSemana: turnosSemRes.count || 0,
      pendienteCobro,
      sesionesMes: sesionesRes.count || 0,
    })

    setTurnosHoy(turnosHoyRes.data || [])

    // Alertas: pagos vencidos y pacientes sin sesión en 3 semanas
    const [pagosVenc, ultimasSes] = await Promise.all([
      supabase.from('pagos').select('*, pacientes(nombre, apellido)').eq('estado', 'vencido').limit(3),
      supabase.from('pacientes').select('id, nombre, apellido').eq('estado', 'activo'),
    ])

    const alertasGeneradas = []

    // Pagos vencidos
    ;(pagosVenc.data || []).forEach(p => {
      alertasGeneradas.push({
        id: `pago-${p.id}`,
        tipo: 'amber',
        texto: `${p.pacientes?.nombre} ${p.pacientes?.apellido} · pago vencido $${parseFloat(p.monto).toLocaleString('es-AR')}`,
        sub: `Vencido hace días`,
      })
    })

    alertasGeneradas.push({
      id: 'system-1',
      tipo: 'blue',
      texto: 'Recordatorios automáticos activados',
      sub: 'Los turnos de mañana serán notificados',
    })

    setAlertas(alertasGeneradas)
    setLoading(false)
  }

  const saludo = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const nombreCompleto = perfil?.nombre
    ? `${perfil.nombre} ${perfil.apellido || ''}`.trim()
    : 'Doctora'

  const fechaHoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  if (loading) return <div className="loading-spinner"><div className="spinner" />Cargando dashboard...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">{saludo()}, {nombreCompleto}</div>
          <div className="page-sub" style={{ textTransform: 'capitalize' }}>
            {fechaHoy} · {turnosHoy.filter(t => t.estado !== 'cancelado').length} turnos programados hoy
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/agenda')}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo turno
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Pacientes activos</div>
          <div className="stat-value">{stats.pacientes}</div>
          <span className="pill pill-sage">en tratamiento</span>
        </div>
        <div className="stat-card">
          <div className="stat-label">Turnos esta semana</div>
          <div className="stat-value">{stats.turnosSemana}</div>
          <span className="pill pill-blue">programados</span>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cobro pendiente</div>
          <div className="stat-value" style={{ fontSize: stats.pendienteCobro > 9999999 ? 18 : 24 }}>
            Gs. {Math.round(stats.pendienteCobro).toLocaleString('es-PY')}
          </div>
          <span className="pill pill-amber">a cobrar</span>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sesiones este mes</div>
          <div className="stat-value">{stats.sesionesMes}</div>
          <span className="pill pill-green">realizadas</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* Turnos de hoy */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Turnos de hoy</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/agenda')}>
              Ver agenda →
            </button>
          </div>

          {turnosHoy.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>No hay turnos programados para hoy</p>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/agenda')}>
                Agregar turno
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {turnosHoy.map((t, i) => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0',
                  borderBottom: i < turnosHoy.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 44, flexShrink: 0 }}>
                    {t.hora?.slice(0, 5) || '--:--'}
                  </span>
                  <DotColor estado={t.estado} />
                  <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>
                    {t.pacientes?.nombre} {t.pacientes?.apellido}
                  </span>
                  <TurnoTag tipo={t.tipo} />
                  {t.estado === 'cancelado' && (
                    <span className="pill pill-red" style={{ fontSize: 11 }}>Cancelado</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Alertas</div>
          </div>
          {alertas.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Sin alertas pendientes</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {alertas.map((a, i) => (
                <div key={a.id} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: i < alertas.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: a.tipo === 'amber' ? 'var(--amber-pale)' : a.tipo === 'red' ? 'var(--danger-pale)' : 'var(--info-pale)',
                    color: a.tipo === 'amber' ? 'var(--amber)' : a.tipo === 'red' ? 'var(--danger)' : 'var(--info)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      {a.tipo === 'blue'
                        ? <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>
                        : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                      }
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>{a.texto}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
