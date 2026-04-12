import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { buscarCep } from '../services/cep'
import { Modal as BSModal } from 'react-bootstrap'
import { ModalConfirmar, ModalMensagem } from '../components/Modal'
import type { Cliente, ClienteForm, KitSolarForm, KitLinha } from '../types/cliente'

const formVazio: ClienteForm = {
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
}

const kitSolarVazio: KitSolarForm = {
  marca_inversor: '',
  modelo_inversor: '',
  quantidade_inversor: '',
  marca_painel: '',
  modelo_painel: '',
  quantidade_painel: '',
}

function clienteParaForm(c: Cliente): ClienteForm {
  return {
    nome: c.nome ?? '',
    cpf: c.cpf ?? '',
    telefone: c.telefone ?? '',
    email: c.email ?? '',
    cep: c.cep ?? '',
    logradouro: c.logradouro ?? '',
    numero: c.numero ?? '',
    complemento: c.complemento ?? '',
    bairro: c.bairro ?? '',
    cidade: c.cidade ?? '',
    estado: c.estado ?? '',
  }
}

export function Clientes() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalFormAberto, setModalFormAberto] = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalMensagemAberto, setModalMensagemAberto] = useState(false)
  const [mensagem, setMensagem] = useState({ titulo: '', texto: '', tipo: 'info' as 'sucesso' | 'erro' | 'info' })
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState<ClienteForm>(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [clienteAExcluir, setClienteAExcluir] = useState<Cliente | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [kitSolarAberto, setKitSolarAberto] = useState(false)
  const [formKit, setFormKit] = useState<KitSolarForm>(kitSolarVazio)
  const [listaKitsTemp, setListaKitsTemp] = useState<KitLinha[]>([])
  const [modalConfirmarSemKitAberto, setModalConfirmarSemKitAberto] = useState(false)

  async function carregarClientes() {
    setCarregando(true)
    const { data, error } = await supabase.from('clientes').select('*').order('nome')
    setCarregando(false)
    if (error) {
      setMensagem({ titulo: 'Erro', texto: error.message, tipo: 'erro' })
      setModalMensagemAberto(true)
      return
    }
    setClientes((data as Cliente[]) ?? [])
  }

  useEffect(() => {
    carregarClientes()
  }, [])

  function abrirNovo() {
    setEditando(null)
    setForm(formVazio)
    setFormKit(kitSolarVazio)
    setListaKitsTemp([])
    setKitSolarAberto(false)
    setModalFormAberto(true)
  }

  function kitParaForm(k: { marca_inversor?: string | null; modelo_inversor?: string | null; quantidade_inversor?: number | null; marca_painel?: string | null; modelo_painel?: string | null; quantidade_painel?: number | null }) {
    return {
      marca_inversor: k.marca_inversor ?? '',
      modelo_inversor: k.modelo_inversor ?? '',
      quantidade_inversor: k.quantidade_inversor != null ? String(k.quantidade_inversor) : '',
      marca_painel: k.marca_painel ?? '',
      modelo_painel: k.modelo_painel ?? '',
      quantidade_painel: k.quantidade_painel != null ? String(k.quantidade_painel) : '',
    }
  }

  async function abrirEditar(cliente: Cliente) {
    setEditando(cliente)
    setForm(clienteParaForm(cliente))
    setFormKit(kitSolarVazio)
    setKitSolarAberto(false)
    const { data: kits } = await supabase
      .from('kit_solar')
      .select('*')
      .eq('cpf_cliente', cliente.cpf)
    const linhas: KitLinha[] = (kits ?? []).map((k) => ({
      ...kitParaForm(k),
      idTemp: k.id,
    }))
    setListaKitsTemp(linhas)
    setModalFormAberto(true)
  }

  function fecharForm() {
    setModalFormAberto(false)
    setEditando(null)
    setForm(formVazio)
    setFormKit(kitSolarVazio)
    setListaKitsTemp([])
    setKitSolarAberto(false)
  }

  function temDadosKit(): boolean {
    const formPreenchido = !!(
      formKit.marca_inversor.trim() ||
      formKit.modelo_inversor.trim() ||
      formKit.quantidade_inversor.trim() ||
      formKit.marca_painel.trim() ||
      formKit.modelo_painel.trim() ||
      formKit.quantidade_painel.trim()
    )
    return listaKitsTemp.length > 0 || formPreenchido
  }

  function adicionarKit() {
    const temAlgum = !!(
      formKit.marca_inversor.trim() ||
      formKit.modelo_inversor.trim() ||
      formKit.quantidade_inversor.trim() ||
      formKit.marca_painel.trim() ||
      formKit.modelo_painel.trim() ||
      formKit.quantidade_painel.trim()
    )
    if (!temAlgum) {
      setMensagem({ titulo: 'Kit solar', texto: 'Preencha ao menos um campo do kit para adicionar.', tipo: 'erro' })
      setModalMensagemAberto(true)
      return
    }
    setListaKitsTemp((prev) => [
      ...prev,
      { ...formKit, idTemp: crypto.randomUUID() },
    ])
    setFormKit(kitSolarVazio)
  }

  function removerKit(idTemp: string) {
    setListaKitsTemp((prev) => prev.filter((k) => k.idTemp !== idTemp))
  }

  async function handleBuscarCep() {
    const cep = form.cep.replace(/\D/g, '')
    if (cep.length !== 8) {
      setMensagem({ titulo: 'CEP', texto: 'Digite um CEP com 8 dígitos.', tipo: 'erro' })
      setModalMensagemAberto(true)
      return
    }
    setBuscandoCep(true)
    const result = await buscarCep(form.cep)
    setBuscandoCep(false)
    if (result.ok) {
      setForm((f) => ({
        ...f,
        logradouro: result.logradouro ?? f.logradouro,
        bairro: result.bairro ?? f.bairro,
        cidade: result.cidade ?? f.cidade,
        estado: result.estado ?? f.estado,
      }))
    } else {
      setMensagem({ titulo: 'CEP', texto: result.mensagem ?? 'Não encontrado.', tipo: 'erro' })
      setModalMensagemAberto(true)
    }
  }

  async function executarSalvar(proceedWithoutKit: boolean) {
    const nome = form.nome.trim()
    if (!nome) return

    const salvarKits = listaKitsTemp.length > 0 && !proceedWithoutKit

    setSalvando(true)
    try {
      let cpfCliente = editando?.cpf ?? ''

      if (editando) {
        const payload: Record<string, unknown> = {
          nome,
          telefone: form.telefone.trim() || null,
          email: form.email.trim() || null,
          cep: form.cep.trim() || null,
          logradouro: form.logradouro.trim() || null,
          numero: form.numero.trim() || null,
          complemento: form.complemento.trim() || null,
          bairro: form.bairro.trim() || null,
          cidade: form.cidade.trim() || null,
          estado: form.estado.trim() || null,
        }
        const { error } = await supabase.from('clientes').update(payload).eq('id', editando.id)
        if (error) throw error
        cpfCliente = editando.cpf
        setMensagem({ titulo: 'Sucesso', texto: 'Cliente atualizado com sucesso.', tipo: 'sucesso' })

        if (salvarKits) {
          await supabase.from('kit_solar').delete().eq('cpf_cliente', cpfCliente)
        }
      } else {
        const payload: Record<string, unknown> = { nome }
        const cpfTrim = form.cpf.trim()
        if (cpfTrim) payload.cpf = cpfTrim
        if (form.telefone.trim()) payload.telefone = form.telefone.trim()
        if (form.email.trim()) payload.email = form.email.trim()
        if (form.cep.trim()) payload.cep = form.cep.trim()
        if (form.logradouro.trim()) payload.logradouro = form.logradouro.trim()
        if (form.numero.trim()) payload.numero = form.numero.trim()
        if (form.complemento.trim()) payload.complemento = form.complemento.trim()
        if (form.bairro.trim()) payload.bairro = form.bairro.trim()
        if (form.cidade.trim()) payload.cidade = form.cidade.trim()
        if (form.estado.trim()) payload.estado = form.estado.trim()

        const { data: criado, error } = await supabase.from('clientes').insert(payload).select('cpf').single()
        if (error) throw error
        cpfCliente = criado?.cpf ?? ''
        setMensagem({ titulo: 'Sucesso', texto: 'Cliente cadastrado com sucesso.', tipo: 'sucesso' })
      }

      if (salvarKits && cpfCliente) {
        for (const linha of listaKitsTemp) {
          await supabase.from('kit_solar').insert({
            cpf_cliente: cpfCliente,
            marca_inversor: linha.marca_inversor.trim() || null,
            modelo_inversor: linha.modelo_inversor.trim() || null,
            quantidade_inversor: linha.quantidade_inversor.trim() ? parseInt(linha.quantidade_inversor, 10) : null,
            marca_painel: linha.marca_painel.trim() || null,
            modelo_painel: linha.modelo_painel.trim() || null,
            quantidade_painel: linha.quantidade_painel.trim() ? parseInt(linha.quantidade_painel, 10) : null,
          })
        }
      }

      setModalMensagemAberto(true)
      setModalConfirmarSemKitAberto(false)
      fecharForm()
      await carregarClientes()
    } catch (e) {
      setMensagem({
        titulo: 'Erro',
        texto: e instanceof Error ? e.message : 'Erro ao salvar.',
        tipo: 'erro',
      })
      setModalMensagemAberto(true)
    } finally {
      setSalvando(false)
    }
  }

  function handleSalvar() {
    const nome = form.nome.trim()
    if (!nome) {
      setMensagem({ titulo: 'Campos obrigatórios', texto: 'Informe o nome do cliente.', tipo: 'erro' })
      setModalMensagemAberto(true)
      return
    }
    if (temDadosKit()) {
      executarSalvar(false)
    } else {
      setModalConfirmarSemKitAberto(true)
    }
  }

  async function handleConfirmarProseguirSemKit() {
    setModalConfirmarSemKitAberto(false)
    await executarSalvar(true)
  }

  function abrirConfirmarExcluir(cliente: Cliente) {
    setClienteAExcluir(cliente)
    setModalExcluirAberto(true)
  }

  async function handleExcluir() {
    if (!clienteAExcluir) return
    setExcluindo(true)
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', clienteAExcluir.id)
      if (error) throw error
      setMensagem({ titulo: 'Sucesso', texto: 'Cliente excluído com sucesso.', tipo: 'sucesso' })
      setModalMensagemAberto(true)
      setModalExcluirAberto(false)
      setClienteAExcluir(null)
      await carregarClientes()
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
        <h1>Clientes</h1>
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
        <section className="card clientes-card">
          <div className="card-header-row">
            <h2>Lista de clientes</h2>
            <button type="button" className="btn btn-primary" onClick={abrirNovo}>
              Novo cliente
            </button>
          </div>

          {carregando ? (
            <p className="placeholder-text">Carregando…</p>
          ) : clientes.length === 0 ? (
            <p className="placeholder-text">Nenhum cliente cadastrado.</p>
          ) : (
            <>
              <div className="clientes-table-wrap">
                <table className="clientes-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>CPF</th>
                      <th>Telefone</th>
                      <th>E-mail</th>
                      <th className="clientes-acoes">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c.id}>
                        <td>{c.nome}</td>
                        <td>{c.cpf}</td>
                        <td>{c.telefone ?? '—'}</td>
                        <td>{c.email ?? '—'}</td>
                        <td className="clientes-acoes">
                          <button
                            type="button"
                            className="btn btn-small btn-secondary"
                            onClick={() => abrirEditar(c)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            onClick={() => abrirConfirmarExcluir(c)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="clientes-list-mobile">
                {clientes.map((c) => (
                  <div key={c.id} className="cliente-card">
                    <div className="cliente-card-body">
                      <strong>{c.nome}</strong>
                      <span>CPF: {c.cpf}</span>
                      {c.telefone && <span>Tel: {c.telefone}</span>}
                      {c.email && <span>{c.email}</span>}
                    </div>
                    <div className="cliente-card-acoes">
                      <button type="button" className="btn btn-small btn-secondary" onClick={() => abrirEditar(c)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-small btn-danger" onClick={() => abrirConfirmarExcluir(c)}>
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

      {/* Modal formulário - Bootstrap modal large */}
      <BSModal show={modalFormAberto} onHide={fecharForm} size="lg" centered>
        <BSModal.Header closeButton>
          <BSModal.Title>{editando ? 'Editar cliente' : 'Novo cliente'}</BSModal.Title>
        </BSModal.Header>
        <BSModal.Body>
        <div className="form-cliente">
          <div className="form-row">
            <div className="form-group form-group--required">
              <label htmlFor="nome">Nome</label>
              <input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cpf">CPF</label>
              <input
                id="cpf"
                value={form.cpf}
                onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
                placeholder={editando ? 'CPF' : 'Opcional (gerado automaticamente se vazio)'}
                disabled={!!editando}
              />
            </div>
          </div>
          <div className="form-row form-row--2">
            <div className="form-group">
              <label htmlFor="telefone">Telefone</label>
              <input
                id="telefone"
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="form-section-label">Endereço (opcional)</div>
          <div className="form-row form-row--cep">
            <div className="form-group">
              <label htmlFor="cep">CEP</label>
              <input
                id="cep"
                value={form.cep}
                onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
                placeholder="00000-000"
                maxLength={9}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-buscar-cep"
              onClick={handleBuscarCep}
              disabled={buscandoCep}
            >
              {buscandoCep ? 'Buscando…' : 'Buscar CEP'}
            </button>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="logradouro">Logradouro</label>
              <input
                id="logradouro"
                value={form.logradouro}
                onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
                placeholder="Rua, avenida..."
              />
            </div>
          </div>
          <div className="form-row form-row--2">
            <div className="form-group">
              <label htmlFor="numero">Número</label>
              <input
                id="numero"
                value={form.numero}
                onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                placeholder="Nº"
              />
            </div>
            <div className="form-group">
              <label htmlFor="complemento">Complemento</label>
              <input
                id="complemento"
                value={form.complemento}
                onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                placeholder="Apto, bloco..."
              />
            </div>
          </div>
          <div className="form-row form-row--2">
            <div className="form-group">
              <label htmlFor="bairro">Bairro</label>
              <input
                id="bairro"
                value={form.bairro}
                onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                placeholder="Bairro"
              />
            </div>
            <div className="form-group">
              <label htmlFor="cidade">Cidade</label>
              <input
                id="cidade"
                value={form.cidade}
                onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                placeholder="Cidade"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group form-group--estado">
              <label htmlFor="estado">Estado</label>
              <input
                id="estado"
                value={form.estado}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>

          <div className="form-collapse">
            <button
              type="button"
              className="form-collapse-trigger"
              onClick={() => setKitSolarAberto((a) => !a)}
              aria-expanded={kitSolarAberto}
            >
              <span>Kit solar (opcional)</span>
              <span className="form-collapse-icon" aria-hidden>{kitSolarAberto ? '▼' : '▶'}</span>
            </button>
            {kitSolarAberto && (
              <div className="form-collapse-content">
                <div className="form-row form-row--2">
                  <div className="form-group">
                    <label htmlFor="marca_inversor">Marca inversor</label>
                    <input
                      id="marca_inversor"
                      value={formKit.marca_inversor}
                      onChange={(e) => setFormKit((k) => ({ ...k, marca_inversor: e.target.value }))}
                      placeholder="Marca"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="modelo_inversor">Modelo inversor</label>
                    <input
                      id="modelo_inversor"
                      value={formKit.modelo_inversor}
                      onChange={(e) => setFormKit((k) => ({ ...k, modelo_inversor: e.target.value }))}
                      placeholder="Modelo"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group form-group--qtd">
                    <label htmlFor="quantidade_inversor">Quantidade de inversor</label>
                    <input
                      id="quantidade_inversor"
                      type="number"
                      min={0}
                      value={formKit.quantidade_inversor}
                      onChange={(e) => setFormKit((k) => ({ ...k, quantidade_inversor: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="form-row form-row--2">
                  <div className="form-group">
                    <label htmlFor="marca_painel">Marca do painel solar</label>
                    <input
                      id="marca_painel"
                      value={formKit.marca_painel}
                      onChange={(e) => setFormKit((k) => ({ ...k, marca_painel: e.target.value }))}
                      placeholder="Marca"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="modelo_painel">Modelo do painel solar</label>
                    <input
                      id="modelo_painel"
                      value={formKit.modelo_painel}
                      onChange={(e) => setFormKit((k) => ({ ...k, modelo_painel: e.target.value }))}
                      placeholder="Modelo"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group form-group--qtd">
                    <label htmlFor="quantidade_painel">Quantidade do painel solar</label>
                    <input
                      id="quantidade_painel"
                      type="number"
                      min={0}
                      value={formKit.quantidade_painel}
                      onChange={(e) => setFormKit((k) => ({ ...k, quantidade_painel: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="form-row form-row-kit-add">
                  <button type="button" className="btn btn-primary" onClick={adicionarKit}>
                    Adicionar à lista
                  </button>
                </div>

                {listaKitsTemp.length > 0 && (
                  <div className="kits-tabela-wrap">
                    <p className="kits-tabela-titulo">Kits adicionados ({listaKitsTemp.length})</p>
                    <div className="kits-tabela-scroll">
                      <table className="kits-tabela">
                        <thead>
                          <tr>
                            <th>Marca inv.</th>
                            <th>Modelo inv.</th>
                            <th>Qtd inv.</th>
                            <th>Marca painel</th>
                            <th>Modelo painel</th>
                            <th>Qtd painel</th>
                            <th className="kits-tabela-acoes">Remover</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listaKitsTemp.map((linha) => (
                            <tr key={linha.idTemp}>
                              <td>{linha.marca_inversor || '—'}</td>
                              <td>{linha.modelo_inversor || '—'}</td>
                              <td>{linha.quantidade_inversor || '—'}</td>
                              <td>{linha.marca_painel || '—'}</td>
                              <td>{linha.modelo_painel || '—'}</td>
                              <td>{linha.quantidade_painel || '—'}</td>
                              <td className="kits-tabela-acoes">
                                <button
                                  type="button"
                                  className="btn btn-small btn-danger"
                                  onClick={() => removerKit(linha.idTemp)}
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </BSModal.Body>
        <BSModal.Footer>
          <button type="button" className="btn btn-secondary" onClick={fecharForm}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </BSModal.Footer>
      </BSModal>

      <ModalConfirmar
        aberto={modalConfirmarSemKitAberto}
        onFechar={() => setModalConfirmarSemKitAberto(false)}
        titulo="Kit solar"
        mensagem="Você não cadastrou kit solar para esse cliente, deseja proseguir assim mesmo?"
        confirmarTexto="Proseguir assim mesmo"
        cancelarTexto="Cancelar"
        onConfirmar={handleConfirmarProseguirSemKit}
      />

      <ModalConfirmar
        aberto={modalExcluirAberto}
        onFechar={() => { setModalExcluirAberto(false); setClienteAExcluir(null) }}
        titulo="Excluir cliente"
        mensagem={clienteAExcluir ? `Deseja realmente excluir "${clienteAExcluir.nome}"?` : ''}
        confirmarTexto="Excluir"
        emConfirmacao={excluindo}
        onConfirmar={handleExcluir}
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
