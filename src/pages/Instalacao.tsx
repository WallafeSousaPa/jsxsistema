import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Instalacao() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSair() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Instalação</h1>
        <nav className="nav-links">
          <Link to="/vistorias">Vistorias</Link>
          <Link to="/instalacao">Instalação</Link>
          <Link to="/clientes">Clientes</Link>
          <Link to="/usuarios">Usuarios</Link>
          <button type="button" className="link-btn" onClick={handleSair}>Sair</button>
        </nav>
      </header>

      <main className="page-content">
        <section className="card">
          <h2>Instalações</h2>
          <p className="placeholder-text">
            Conteúdo e funções da tela de instalação serão implementados em seguida.
          </p>
          <div className="placeholder-block" />
        </section>
      </main>
    </div>
  )
}
