import { Link } from 'react-router-dom'

export function Vistorias() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Vistorias</h1>
        <nav className="nav-links">
          <Link to="/vistorias">Vistorias</Link>
          <Link to="/instalacao">Instalação</Link>
          <Link to="/">Sair</Link>
        </nav>
      </header>

      <main className="page-content">
        <section className="card">
          <h2>Lista de vistorias</h2>
          <p className="placeholder-text">
            Conteúdo e funções da tela de vistorias serão implementados em seguida.
          </p>
          <div className="placeholder-block" />
        </section>
      </main>
    </div>
  )
}
