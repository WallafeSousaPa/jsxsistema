import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate('/vistorias', { replace: true })
    }
  }, [user, loading, navigate])

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'erro'>('idle')
  const [testMessage, setTestMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const { error } = await signIn(email.trim(), senha)
      if (error) {
        setErro(error.message)
        return
      }
      navigate('/vistorias', { replace: true })
    } finally {
      setCarregando(false)
    }
  }

  async function testarConexao() {
    setTestStatus('loading')
    setTestMessage('')
    try {
      const { error } = await supabase.from('usuarios').select('id').limit(1)
      if (error) throw error
      setTestStatus('ok')
      setTestMessage('Conexão com o Supabase OK!')
    } catch (e) {
      setTestStatus('erro')
      setTestMessage(e instanceof Error ? e.message : 'Erro ao conectar. Verifique a URL, a chave no .env e se a tabela "usuarios" existe.')
    }
  }

  if (loading) {
    return (
      <div className="page login-page">
        <p className="subtitle">Carregando…</p>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="page login-page">
      <div className="login-card">
        <h1>JSX Sistema</h1>
        <p className="subtitle">Entre com suas credenciais</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {erro && <p className="test-erro">{erro}</p>}
          <button type="submit" className="btn btn-primary" disabled={carregando}>
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="connection-test">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={testarConexao}
            disabled={testStatus === 'loading'}
          >
            {testStatus === 'loading' ? 'Testando…' : 'Testar conexão Supabase'}
          </button>
          {testStatus === 'ok' && <p className="test-ok">{testMessage}</p>}
          {testStatus === 'erro' && <p className="test-erro">{testMessage}</p>}
        </div>
      </div>
    </div>
  )
}
