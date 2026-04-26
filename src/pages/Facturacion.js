import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPO_SERVICIO = {
  sesion_individual: 'Sesión individual',
  pack_sesiones: 'Pack de sesiones',
  evaluacion: 'Evaluación',
  informe: 'Informe',
  otro: 'Otro',
}

const METODO_PAGO = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

const ESTADO_PAGO = {
  pendiente: { label: 'Pendiente', pill: 'pill-amber' },
  pagado: { label: 'Pagado', pill: 'pill-green' },
  vencido: { label: 'Vencido', pill: 'pill-red' },
}

function ModalPago({ pago, pacientes, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    paciente_id: '', fecha: format(new Date(), 'yyyy-MM-dd'),
    monto: '', tipo_servicio: 'sesion_individual',
    metodo_pago: 'efectivo', estado: 'pendiente', notas: '',
    ...pago,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.paciente_id) { setError('Seleccioná un paciente'); return }
    if (!form.monto || parseFloat(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return }
    setError('')
    setLoading(true)
    const data = { ...form, psicologo_id: user.id, monto: parseFloat(form.monto) }
    delete data.id; delete data.created_at; delete data.updated_at; delete data.pacientes

    let res
    if (pago?.id) {
      res = await supabase.from('pagos').update(data).eq('id', pago.id)
    } else {
      res = await supabase.from('pagos').insert(data)
    }

    if (res.error) { setError(res.error.message); setLoading(false) }
    else { onSaved(); onClose() }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{pago?.id ? 'Editar cobro' : 'Registrar cobro'}</div>
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
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
              </select>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input className="input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Monto (Gs) *</label>
                <input className="input" type="number" min="0" step="0.01" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="18000" required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de servicio</label>
              <select className="select" value={form.tipo_servicio} onChange={e => set('tipo_servicio', e.target.value)}>
                {Object.entries(TIPO_SERVICIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Método de pago</label>
                <select className="select" value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value)}>
                  {Object.entries(METODO_PAGO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="select" value={form.estado} onChange={e => set('estado', e.target.value)}>
                  {Object.entries(ESTADO_PAGO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <input className="input" value={form.notas || ''} onChange={e => set('notas', e.target.value)} placeholder="Ej: Pack 5 sesiones, descuento por obra social..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Guardando...</> : (pago?.id ? 'Guardar cambios' : 'Registrar cobro')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Facturacion() {
  const { user } = useAuth()
  const [pagos, setPagos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [pagosRes, pacsRes] = await Promise.all([
      supabase.from('pagos').select('*, pacientes(nombre, apellido)').order('fecha', { ascending: false }),
      supabase.from('pacientes').select('id, nombre, apellido').order('apellido'),
    ])
    setPagos(pagosRes.data || [])
    setPacientes(pacsRes.data || [])
    setLoading(false)
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este registro de cobro?')) return
    await supabase.from('pagos').delete().eq('id', id)
    cargar()
  }

  async function marcarPagado(id) {
    await supabase.from('pagos').update({ estado: 'pagado' }).eq('id', id)
    cargar()
  }

  const filtrados = filtro === 'todos' ? pagos : pagos.filter(p => p.estado === filtro)

  const totalCobrado = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + parseFloat(p.monto || 0), 0)
  const totalPendiente = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + parseFloat(p.monto || 0), 0)
  const totalVencido = pagos.filter(p => p.estado === 'vencido').reduce((s, p) => s + parseFloat(p.monto || 0), 0)
  const fmt = (n) => `Gs. ${Math.round(n).toLocaleString('es-PY')}`

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Facturación y cobros</div>
          <div className="page-sub">{pagos.length} registros en total</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditando(null); setModalOpen(true) }}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Registrar cobro
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total cobrado</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{fmt(totalCobrado)}</div>
          <span className="pill pill-green">{pagos.filter(p => p.estado === 'pagado').length} pagos</span>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pendiente de cobro</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{fmt(totalPendiente)}</div>
          <span className="pill pill-amber">{pagos.filter(p => p.estado === 'pendiente').length} cobros</span>
        </div>
        <div className="stat-card">
          <div className="stat-label">Vencidos</div>
          <div className="stat-value" style={{ fontSize: 22, color: totalVencido > 0 ? 'var(--danger)' : 'var(--ink)' }}>{fmt(totalVencido)}</div>
          <span className="pill pill-red">{pagos.filter(p => p.estado === 'vencido').length} cobros</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['todos', 'pendiente', 'pagado', 'vencido'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} className={`btn btn-sm ${filtro === f ? 'btn-secondary' : 'btn-ghost'}`}>
            {f === 'todos' ? 'Todos' : ESTADO_PAGO[f]?.label}
            {f !== 'todos' && (
              <span style={{ marginLeft: 4, fontSize: 11, opacity: .7 }}>
                ({pagos.filter(p => p.estado === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" />Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="empty-state" style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14 }}>
          <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <p>No hay registros de cobros{filtro !== 'todos' ? ` con estado "${ESTADO_PAGO[filtro]?.label}"` : ''}</p>
          <button className="btn btn-primary" onClick={() => { setEditando(null); setModalOpen(true) }}>Registrar primer cobro</button>
        </div>
      ) : (
        <div className="tabla-wrapper">
          <div className="tabla-header" style={{ gridTemplateColumns: '2fr 1fr 1.4fr 1fr 1fr 100px' }}>
            <div>Paciente</div><div>Fecha</div><div>Servicio</div><div>Monto</div><div>Estado</div><div>Acciones</div>
          </div>
          {filtrados.map(p => (
            <div key={p.id} className="tabla-row" style={{ gridTemplateColumns: '2fr 1fr 1.4fr 1fr 1fr 100px' }}>
              <div className="tabla-cell-primary">{p.pacientes?.nombre} {p.pacientes?.apellido}</div>
              <div className="tabla-cell">{format(parseISO(p.fecha), 'dd/MM/yyyy')}</div>
              <div className="tabla-cell">{TIPO_SERVICIO[p.tipo_servicio] || p.tipo_servicio}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{fmt(parseFloat(p.monto))}</div>
              <div>
                <span className={`pill ${ESTADO_PAGO[p.estado]?.pill}`}>{ESTADO_PAGO[p.estado]?.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {p.estado !== 'pagado' && (
                  <button className="ic-btn" title="Marcar como pagado" onClick={() => marcarPagado(p.id)} style={{ color: 'var(--success)' }}>
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                )}
                <button className="ic-btn" title="Editar" onClick={() => { setEditando(p); setModalOpen(true) }}>
                  <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="ic-btn danger" title="Eliminar" onClick={() => eliminar(p.id)}>
                  <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ModalPago pago={editando} pacientes={pacientes} onClose={() => setModalOpen(false)} onSaved={cargar} />
      )}
    </>
  )
}
