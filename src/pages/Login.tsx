export function Login() {
  return (
    <div className="page login-page">
      <div className="login-card">
        <h1>JSX Sistema</h1>
        <p className="subtitle">Entre com suas credenciais</p>

        <form className="login-form">
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" placeholder="seu@email.com" />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary">
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
