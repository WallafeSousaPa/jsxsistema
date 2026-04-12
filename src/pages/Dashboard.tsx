import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, type Usuario } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { STATUS_VISTORIA } from '../types/vistoria'
import { STATUS_INSTALACAO } from '../types/instalacao'

type LinhaStatus = { status: string }

function contarPorStatus(rows: LinhaStatus[], statuses: readonly string[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const s of statuses) map[s] = 0
  for (const r of rows) {
    const st = r.status
    if (st in map) map[st]++
  }
  return map
}

export function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [linhasVistoria, setLinhasVistoria] = useState<LinhaStatus[]>([])
  const [linhasInstalacao, setLinhasInstalacao] = useState<LinhaStatus[]>([])

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setCarregando(true)
      try {
        const [v, i] = await Promise.all([
          carregarLinhasVistorias(user),
          carregarLinhasInstalacoes(user),
        ])
        if (!cancel) {
          setLinhasVistoria(v)
          setLinhasInstalacao(i)
        }
      } finally {
        if (!cancel) setCarregando(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [user?.id, user?.tipo_usuario])

  const totaisVistoria = useMemo(
    () => contarPorStatus(linhasVistoria, STATUS_VISTORIA),
    [linhasVistoria]
  )
  const totaisInstalacao = useMemo(
    () => contarPorStatus(linhasInstalacao, STATUS_INSTALACAO),
    [linhasInstalacao]
  )

  const totalVistorias = linhasVistoria.length
  const totalInstalacoes = linhasInstalacao.length

  async function handleSair() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <nav className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/vistorias">Vistorias</Link>
          <Link to="/instalacao">Instalação</Link>
          <Link to="/clientes">Clientes</Link>
          <Link to="/usuarios">Usuarios</Link>
          <button type="button" className="link-btn" onClick={handleSair}>
            Sair
          </button>
        </nav>
      </header>

      <main className="page-content">
        <section className="card mb-3">
          <h2 className="mb-3">Visão geral</h2>
          {carregando ? (
            <p className="placeholder-text mb-0">Carregando…</p>
          ) : (
            <div className="dashboard-cards">
              <div className="card dashboard-report-card h-100">
                <h3 className="dashboard-report-title">Vistorias</h3>
                <p className="dashboard-total mb-3">
                  <strong>{totalVistorias}</strong> <span className="text-muted">no total</span>
                </p>
                <ul className="dashboard-status-list list-unstyled mb-3 small">
                  {STATUS_VISTORIA.map((s) => (
                    <li key={s} className="d-flex justify-content-between py-1">
                      <span>{s}</span>
                      <span className="fw-medium">{totaisVistoria[s]}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/vistorias" className="btn btn-primary btn-sm w-100">
                  Abrir vistorias
                </Link>
              </div>

              <div className="card dashboard-report-card h-100">
                <h3 className="dashboard-report-title">Instalações</h3>
                <p className="dashboard-total mb-3">
                  <strong>{totalInstalacoes}</strong> <span className="text-muted">no total</span>
                </p>
                <ul className="dashboard-status-list list-unstyled mb-3 small">
                  {STATUS_INSTALACAO.map((s) => (
                    <li key={s} className="d-flex justify-content-between py-1">
                      <span>{s}</span>
                      <span className="fw-medium">{totaisInstalacao[s]}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/instalacao" className="btn btn-primary btn-sm w-100">
                  Abrir instalações
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

async function carregarLinhasVistorias(user: Usuario | null): Promise<LinhaStatus[]> {
  if (user?.tipo_usuario === 'Vistoriador' && user?.id) {
    const { data: respIds } = await supabase
      .from('vistoria_responsaveis')
      .select('vistoria_id')
      .eq('id_usuario', user.id)
    const ids = (respIds ?? []).map((r: { vistoria_id: string }) => r.vistoria_id)
    if (ids.length === 0) return []
    const { data } = await supabase.from('vistorias').select('status').in('id', ids)
    return (data as LinhaStatus[]) ?? []
  }
  const { data } = await supabase.from('vistorias').select('status')
  return (data as LinhaStatus[]) ?? []
}

async function carregarLinhasInstalacoes(user: Usuario | null): Promise<LinhaStatus[]> {
  if (user?.tipo_usuario === 'Instalador' && user?.id) {
    const { data: respIds } = await supabase
      .from('instalacao_responsaveis')
      .select('instalacao_id')
      .eq('id_usuario', user.id)
    const ids = (respIds ?? []).map((r: { instalacao_id: string }) => r.instalacao_id)
    if (ids.length === 0) return []
    const { data } = await supabase.from('instalacoes').select('status').in('id', ids)
    return (data as LinhaStatus[]) ?? []
  }
  const { data } = await supabase.from('instalacoes').select('status')
  return (data as LinhaStatus[]) ?? []
}
