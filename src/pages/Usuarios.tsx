import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { hashSenha } from '../lib/hash'
import { Modal as BSModal } from 'react-bootstrap'
import { ModalConfirmar, ModalMensagem } from '../components/Modal'

const TIPO_USUARIO = ['Vistoriador', 'Instalador', 'Administrativo', 'Administrador'] as const
export type TipoUsuario = (typeof TIPO_USUARIO)[number]

type UsuarioRow = {
  id: string
  email: string
  nome: string | null
  tipo_usuario: string | null
  criado_em?: string
}

const formVazio = { email: '', nome: '', tipo_usuario: '', senha: '', confirmarSenha: '' }

export function Usuarios() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalFormAberto, setModalFormAberto] = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalMensagemAberto, setModalMensagemAberto] = useState(false)
  const [mensagem, setMensagem] = useState({ titulo: '', texto: '', tipo: 'info' as 'sucesso' | 'erro' | 'info' })
  const [editando, setEditando] = useState<UsuarioRow | null>(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [usuarioAExcluir, setUsuarioAExcluir] = useState<UsuarioRow | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregarUsuarios() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, tipo_usuario, criado_em')
      .order('nome')
    setCarregando(false)
    if (error) {
      setMensagem({ titulo: 'Erro', texto: error.message, tipo: 'erro' })
      setModalMensagemAberto(true)
      return
    }
    setUsuarios((data as UsuarioRow[]) ?? [])
  }

  useEffect(() => {
    carregarUsuarios()
  }, [])

  function abrirNovo() {
    setEditando(null)
    setForm(formVazio)
    setModalFormAberto(true)
  }

  function abrirEditar(u: UsuarioRow) {
    setEditando(u)
    setForm({
      email: u.email,
      nome: u.nome ?? '',
      tipo_usuario: u.tipo_usuario ?? '',
      senha: '',
      confirmarSenha: '',
    })
    setModalFormAberto(true)
  }

  function fecharForm() {
    setModalFormAberto(false)
    setEditando(null)
    setForm(formVazio)
  }

  function validarForm(): string | null {
    const email = form.email.trim()
    const nome = form.nome.trim()
    const tipo = form.tipo_usuario.trim()
    if (!email) return 'Informe o e-mail.'
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(email)) return 'Informe um e-mail válido.'
    if (!nome) return 'Informe o nome.'
    if (!tipo) return 'Selecione o tipo de usuário.'
    if (!editando) {
      if (!form.senha) return 'Informe a senha.'
      if (form.senha.length < 4) return 'A senha deve ter no mínimo 4 caracteres.'
      if (form.senha !== form.confirmarSenha) return 'A senha e a confirmação não conferem.'
    } else {
      if (form.senha || form.confirmarSenha) {
        if (form.senha.length < 4) return 'A nova senha deve ter no mínimo 4 caracteres.'
        if (form.senha !== form.confirmarSenha) return 'A nova senha e a confirmação não conferem.'
      }
    }
    return null
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    const erro = validarForm()
    if (erro) {
      setMensagem({ titulo: 'Campos obrigatórios', texto: erro, tipo: 'erro' })
      setModalMensagemAberto(true)
      return
    }
    setSalvando(true)
    try {
      if (editando) {
        if (!editando.id) {
          setMensagem({ titulo: 'Erro', texto: 'ID do usuário não encontrado.', tipo: 'erro' })
          setModalMensagemAberto(true)
          setSalvando(false)
          return
        }
        const payload: { nome: string; tipo_usuario: string | null; senha_hash?: string } = {
          nome: form.nome.trim(),
          tipo_usuario: form.tipo_usuario.trim() || null,
        }
        if (form.senha.trim()) {
          payload.senha_hash = await hashSenha(form.senha.trim())
        }
        const { data, error } = await supabase
          .from('usuarios')
          .update(payload)
          .eq('id', editando.id)
          .select('id')
          .single()
        if (error) throw error
        if (!data) {
          throw new Error('Nenhuma linha foi atualizada. Verifique se a política de UPDATE está ativa na tabela usuarios.')
        }
        setMensagem({ titulo: 'Sucesso', texto: 'Usuário atualizado com sucesso.', tipo: 'sucesso' })
      } else {
        const senhaHash = await hashSenha(form.senha.trim())
        const { error } = await supabase.from('usuarios').insert({
          email: form.email.trim().toLowerCase(),
          senha_hash: senhaHash,
          nome: form.nome.trim() || null,
          tipo_usuario: form.tipo_usuario.trim() || null,
        })
        if (error) throw error
        setMensagem({ titulo: 'Sucesso', texto: 'Usuário cadastrado com sucesso.', tipo: 'sucesso' })
      }
      setModalMensagemAberto(true)
      fecharForm()
      await carregarUsuarios()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : 'Erro ao salvar.'
      setMensagem({
        titulo: 'Erro',
        texto: msg,
        tipo: 'erro',
      })
      setModalMensagemAberto(true)
    } finally {
      setSalvando(false)
    }
  }

  function abrirConfirmarExcluir(u: UsuarioRow) {
    setUsuarioAExcluir(u)
    setModalExcluirAberto(true)
  }

  async function handleExcluir() {
    if (!usuarioAExcluir) return
    setExcluindo(true)
    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', usuarioAExcluir.id)
      if (error) throw error
      setMensagem({ titulo: 'Sucesso', texto: 'Usuário excluído com sucesso.', tipo: 'sucesso' })
      setModalMensagemAberto(true)
      setModalExcluirAberto(false)
      setUsuarioAExcluir(null)
      await carregarUsuarios()
    } catch (e) {
      setMensagem({
        titulo: 'Erro',
        texto: e instanceof Error ? e.message : 'Erro ao excluir.',
        tipo: 'erro',
      })
      setModalMensagemAberto(true)
    } finally {
      setExcluindo(false)
    }
  }

  async function handleSair() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Usuários</h1>
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
        <section className="card usuarios-card">
          <div className="card-header-row">
            <h2>Lista de usuários</h2>
            <button type="button" className="btn btn-primary" onClick={abrirNovo}>
              Novo usuário
            </button>
          </div>

          {carregando ? (
            <p className="placeholder-text">Carregando…</p>
          ) : usuarios.length === 0 ? (
            <p className="placeholder-text">Nenhum usuário cadastrado.</p>
          ) : (
            <>
              <div className="usuarios-table-wrap">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Tipo</th>
                      <th className="usuarios-acoes">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id}>
                        <td>{u.nome ?? '—'}</td>
                        <td>{u.email}</td>
                        <td>{u.tipo_usuario ?? '—'}</td>
                        <td className="usuarios-acoes">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary me-1"
                            onClick={() => abrirEditar(u)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => abrirConfirmarExcluir(u)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="usuarios-list-mobile">
                {usuarios.map((u) => (
                  <div key={u.id} className="usuario-card">
                    <div className="usuario-card-body">
                      <strong>{u.nome ?? '—'}</strong>
                      <span>{u.email}</span>
                      {u.tipo_usuario && <span className="text-muted">{u.tipo_usuario}</span>}
                    </div>
                    <div className="usuario-card-acoes">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => abrirEditar(u)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => abrirConfirmarExcluir(u)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <BSModal show={modalFormAberto} onHide={fecharForm} centered>
        <form onSubmit={handleSalvar}>
          <BSModal.Header closeButton>
            <BSModal.Title>{editando ? 'Editar usuário' : 'Novo usuário'}</BSModal.Title>
          </BSModal.Header>
          <BSModal.Body>
            <div className="mb-3">
              <label className="form-label" htmlFor="usuarios-email">
                E-mail *
              </label>
              <input
                id="usuarios-email"
                type="email"
                className="form-control"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="exemplo@email.com"
                disabled={!!editando}
                autoComplete={editando ? 'off' : 'email'}
              />
              {editando && (
                <small className="text-muted">O e-mail não pode ser alterado.</small>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="usuarios-nome">
                Nome *
              </label>
              <input
                id="usuarios-nome"
                type="text"
                className="form-control"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="usuarios-tipo">
                Tipo usuário *
              </label>
              <select
                id="usuarios-tipo"
                className="form-select"
                value={form.tipo_usuario}
                onChange={(e) => setForm((f) => ({ ...f, tipo_usuario: e.target.value }))}
              >
                <option value="">Selecione</option>
                {TIPO_USUARIO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {!editando ? (
              <>
                <div className="mb-3">
                  <label className="form-label" htmlFor="usuarios-senha">
                    Senha *
                  </label>
                  <input
                    id="usuarios-senha"
                    type="password"
                    className="form-control"
                    value={form.senha}
                    onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                    placeholder="Mínimo 4 caracteres"
                    autoComplete="new-password"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="usuarios-confirmar">
                    Confirmar senha *
                  </label>
                  <input
                    id="usuarios-confirmar"
                    type="password"
                    className="form-control"
                    value={form.confirmarSenha}
                    onChange={(e) => setForm((f) => ({ ...f, confirmarSenha: e.target.value }))}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <label className="form-label" htmlFor="usuarios-senha-nova">
                    Nova senha (opcional)
                  </label>
                  <input
                    id="usuarios-senha-nova"
                    type="password"
                    className="form-control"
                    value={form.senha}
                    onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                    placeholder="Deixe em branco para manter a atual"
                    autoComplete="new-password"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="usuarios-confirmar-nova">
                    Confirmar nova senha
                  </label>
                  <input
                    id="usuarios-confirmar-nova"
                    type="password"
                    className="form-control"
                    value={form.confirmarSenha}
                    onChange={(e) => setForm((f) => ({ ...f, confirmarSenha: e.target.value }))}
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}
          </BSModal.Body>
          <BSModal.Footer>
            <button type="button" className="btn btn-secondary" onClick={fecharForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Cadastrar'}
            </button>
          </BSModal.Footer>
        </form>
      </BSModal>

      <ModalConfirmar
        aberto={modalExcluirAberto}
        onFechar={() => { setModalExcluirAberto(false); setUsuarioAExcluir(null) }}
        titulo="Excluir usuário?"
        mensagem={usuarioAExcluir ? `Deseja realmente excluir o usuário "${usuarioAExcluir.nome ?? usuarioAExcluir.email}"?` : ''}
        confirmarTexto="Sim, excluir"
        cancelarTexto="Cancelar"
        onConfirmar={handleExcluir}
        emConfirmacao={excluindo}
      />

      <ModalMensagem
        aberto={modalMensagemAberto}
        onFechar={() => setModalMensagemAberto(false)}
        titulo={mensagem.titulo}
        mensagem={mensagem.texto}
        tipo={mensagem.tipo}
      />
    </div>
  )
}
