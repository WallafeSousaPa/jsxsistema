import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Modal as BSModal } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ModalConfirmar, ModalMensagem } from '../components/Modal'
import type { Cliente } from '../types/cliente'

type ClienteSelect = Pick<Cliente, 'id' | 'cpf' | 'nome' | 'cep' | 'logradouro' | 'numero' | 'complemento' | 'bairro' | 'cidade' | 'estado'>
import type { Usuario } from '../contexts/AuthContext'
import type { Vistoria, VistoriaForm } from '../types/vistoria'
import { TIPO_PADRAO, ONDE_LIGADO_INVERSOR, STATUS_VISTORIA } from '../types/vistoria'

const formVazio: VistoriaForm = {
  cpf_cliente: '',
  status: 'Novo',
  tipo_padrao: '',
  onde_ligado_inversor: '',
  percurso_cabo_inversor: '',
  qtd_eletrodutos_inversor_cc: '',
  qtd_eletrodutos_inversor_ca: '',
  qtd_conduletes_inversor: '',
  qtd_eletrodutos_padrao: '',
  metragem_total_cabos_padrao: '',
  link_foto_fachada: '',
  link_foto_padrao_entrada: '',
  link_foto_disjuntor_padrao: '',
  link_foto_poste_mais_proximo: '',
  link_foto_ramal_entrada: '',
  link_foto_local_inversor: '',
  link_foto_aterramento: '',
  link_foto_estrutura_telhado: '',
  link_foto_telhado: '',
  link_foto_print_mapa: '',
  observacao: '',
  id_responsaveis: [],
}

export function Vistorias() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [vistorias, setVistorias] = useState<Vistoria[]>([])
  const [clientes, setClientes] = useState<ClienteSelect[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<VistoriaForm>(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [modalMensagemAberto, setModalMensagemAberto] = useState(false)
  const [mensagem, setMensagem] = useState({ titulo: '', texto: '', tipo: 'info' as 'sucesso' | 'erro' | 'info' })
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false)
  const clienteSearchRef = useRef<HTMLDivElement>(null)
  const [fotoEnviando, setFotoEnviando] = useState<string | null>(null)
  const [fotoNomeEnviando, setFotoNomeEnviando] = useState<string>('')
  const [fotoErroPorCampo, setFotoErroPorCampo] = useState<Record<string, string>>({})
  const [fotoPreviewTemp, setFotoPreviewTemp] = useState<Record<string, string>>({})
  const [modalConfirmarCancelarAberto, setModalConfirmarCancelarAberto] = useState(false)
  const [vistoriaDetalhe, setVistoriaDetalhe] = useState<Vistoria | null>(null)
  const [vistoriaEmEdicaoId, setVistoriaEmEdicaoId] = useState<string | null>(null)
  const [modalAgendarAberto, setModalAgendarAberto] = useState(false)
  const [agendarCpfCliente, setAgendarCpfCliente] = useState('')
  const [agendarClienteSearch, setAgendarClienteSearch] = useState('')
  const [agendarClienteDropdownOpen, setAgendarClienteDropdownOpen] = useState(false)
  const [agendarIdResponsaveis, setAgendarIdResponsaveis] = useState<string[]>([])
  const [agendarSalvando, setAgendarSalvando] = useState(false)
  const agendarClienteSearchRef = useRef<HTMLDivElement>(null)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string[]>([])
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [filtroStatusDropdownOpen, setFiltroStatusDropdownOpen] = useState(false)
  const filtroStatusRef = useRef<HTMLDivElement>(null)
  const vistoriadorFiltroPadraoAplicado = useRef(false)
  const BUCKET_FOTOS = 'Fotos_vistoria'
  const DELIM_MULTI_FOTO = '|||'
  const CAMPOS_MULTI_FOTO: (keyof VistoriaForm)[] = ['link_foto_telhado', 'link_foto_estrutura_telhado']
  const STATUS_COM_RELATORIO = ['Aprovado', 'Aprovado com obra']

  const clientesFiltrados = clientes.filter((c) => {
    const q = clienteSearch.trim().toLowerCase()
    if (!q) return true
    return (c.nome?.toLowerCase().includes(q) ?? false) || (c.cpf?.includes(q) ?? false)
  })

  const clientesFiltradosAgendar = clientes.filter((c) => {
    const q = agendarClienteSearch.trim().toLowerCase()
    if (!q) return true
    return (c.nome?.toLowerCase().includes(q) ?? false) || (c.cpf?.includes(q) ?? false)
  })

  const vistoriasFiltradas = vistorias.filter((v) => {
    if (filtroCliente.trim()) {
      const cliente = clientes.find((c) => c.cpf === v.cpf_cliente)
      const nome = (cliente?.nome ?? '').toLowerCase()
      const cpf = (cliente?.cpf ?? v.cpf_cliente) ?? ''
      const q = filtroCliente.trim().toLowerCase()
      if (!nome.includes(q) && !cpf.includes(q)) return false
    }
    if (filtroStatus.length > 0 && !filtroStatus.includes(v.status)) return false
    if (filtroDataInicio) {
      const dataV = new Date(v.data_criacao).toISOString().slice(0, 10)
      if (dataV < filtroDataInicio) return false
    }
    if (filtroDataFim) {
      const dataV = new Date(v.data_criacao).toISOString().slice(0, 10)
      if (dataV > filtroDataFim) return false
    }
    return true
  })

  function limparFiltros() {
    setFiltroCliente('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
    if (user?.tipo_usuario === 'Vistoriador') {
      setFiltroStatus(['Novo', 'Em andamento'])
    } else {
      setFiltroStatus([])
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clienteSearchRef.current && !clienteSearchRef.current.contains(event.target as Node)) {
        setClienteDropdownOpen(false)
      }
    }
    if (clienteDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [clienteDropdownOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (agendarClienteSearchRef.current && !agendarClienteSearchRef.current.contains(event.target as Node)) {
        setAgendarClienteDropdownOpen(false)
      }
    }
    if (agendarClienteDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [agendarClienteDropdownOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filtroStatusRef.current && !filtroStatusRef.current.contains(event.target as Node)) {
        setFiltroStatusDropdownOpen(false)
      }
    }
    if (filtroStatusDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filtroStatusDropdownOpen])


  async function carregarVistorias() {
    if (user?.tipo_usuario === 'Vistoriador' && user?.id) {
      const { data: respIds } = await supabase
        .from('vistoria_responsaveis')
        .select('vistoria_id')
        .eq('id_usuario', user.id)
      const ids = (respIds ?? []).map((r: { vistoria_id: string }) => r.vistoria_id)
      if (ids.length === 0) {
        setVistorias([])
        return
      }
      const { data } = await supabase
        .from('vistorias')
        .select('*')
        .in('id', ids)
        .order('data_criacao', { ascending: false })
      setVistorias((data as Vistoria[]) ?? [])
    } else {
      const { data } = await supabase.from('vistorias').select('*').order('data_criacao', { ascending: false })
      setVistorias((data as Vistoria[]) ?? [])
    }
  }

  async function carregarClientes() {
    const { data } = await supabase.from('clientes').select('id, cpf, nome, cep, logradouro, numero, complemento, bairro, cidade, estado').order('nome')
    setClientes((data as ClienteSelect[]) ?? [])
  }

  async function carregarUsuarios() {
    const { data } = await supabase.from('usuarios').select('id, email, nome').order('nome')
    setUsuarios((data as Usuario[]) ?? [])
  }

  useEffect(() => {
    setCarregando(true)
    Promise.all([carregarVistorias(), carregarClientes(), carregarUsuarios()]).finally(() => setCarregando(false))
  }, [user?.id, user?.tipo_usuario])

  useEffect(() => {
    if (user?.tipo_usuario === 'Vistoriador' && !vistoriadorFiltroPadraoAplicado.current) {
      setFiltroStatus(['Novo', 'Em andamento'])
      vistoriadorFiltroPadraoAplicado.current = true
    }
  }, [user?.tipo_usuario])

  function vistoriaToForm(v: Vistoria): Omit<VistoriaForm, 'id_responsaveis'> {
    return {
      cpf_cliente: v.cpf_cliente ?? '',
      status: v.status,
      tipo_padrao: v.tipo_padrao ?? '',
      onde_ligado_inversor: v.onde_ligado_inversor ?? '',
      percurso_cabo_inversor: v.percurso_cabo_inversor ?? '',
      qtd_eletrodutos_inversor_cc: v.qtd_eletrodutos_inversor_cc != null ? String(v.qtd_eletrodutos_inversor_cc) : '',
      qtd_eletrodutos_inversor_ca: v.qtd_eletrodutos_inversor_ca != null ? String(v.qtd_eletrodutos_inversor_ca) : '',
      qtd_conduletes_inversor: v.qtd_conduletes_inversor != null ? String(v.qtd_conduletes_inversor) : '',
      qtd_eletrodutos_padrao: v.qtd_eletrodutos_padrao != null ? String(v.qtd_eletrodutos_padrao) : '',
      metragem_total_cabos_padrao: v.metragem_total_cabos_padrao != null ? String(v.metragem_total_cabos_padrao) : '',
      link_foto_fachada: v.link_foto_fachada ?? '',
      link_foto_padrao_entrada: v.link_foto_padrao_entrada ?? '',
      link_foto_disjuntor_padrao: v.link_foto_disjuntor_padrao ?? '',
      link_foto_poste_mais_proximo: v.link_foto_poste_mais_proximo ?? '',
      link_foto_ramal_entrada: v.link_foto_ramal_entrada ?? '',
      link_foto_local_inversor: v.link_foto_local_inversor ?? '',
      link_foto_aterramento: v.link_foto_aterramento ?? '',
      link_foto_estrutura_telhado: v.link_foto_estrutura_telhado ?? '',
      link_foto_telhado: v.link_foto_telhado ?? '',
      link_foto_print_mapa: v.link_foto_print_mapa ?? '',
      observacao: v.observacao ?? '',
    }
  }

  function abrirCadastro() {
    setVistoriaEmEdicaoId(null)
    setForm(formVazio)
    setClienteSearch('')
    setClienteDropdownOpen(false)
    setFotoErroPorCampo({})
    setFotoPreviewTemp((prev) => {
      Object.values(prev).forEach((url) => { if (url) URL.revokeObjectURL(url) })
      return {}
    })
    setModalAberto(true)
  }

  async function abrirParaEdicao(v: Vistoria) {
    const formFromV = vistoriaToForm(v)
    const { data: respData } = await supabase
      .from('vistoria_responsaveis')
      .select('id_usuario')
      .eq('vistoria_id', v.id)
    const idResponsaveis = (respData ?? []).map((r: { id_usuario: string }) => r.id_usuario)
    setForm({ ...formFromV, id_responsaveis: idResponsaveis })
    const cliente = clientes.find((c) => c.cpf === v.cpf_cliente)
    setClienteSearch(cliente ? `${cliente.nome ?? ''} — ${cliente.cpf}`.trim() : v.cpf_cliente)
    setVistoriaEmEdicaoId(v.id)
    setClienteDropdownOpen(false)
    setFotoErroPorCampo({})
    setFotoPreviewTemp((prev) => {
      Object.values(prev).forEach((url) => { if (url) URL.revokeObjectURL(url) })
      return {}
    })
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setModalConfirmarCancelarAberto(false)
    setVistoriaEmEdicaoId(null)
    setForm(formVazio)
    setClienteSearch('')
  }

  function perguntarCancelar() {
    setModalConfirmarCancelarAberto(true)
  }

  function selecionarCliente(c: ClienteSelect) {
    setForm((f) => ({ ...f, cpf_cliente: c.cpf }))
    setClienteSearch(`${c.nome ?? ''} — ${c.cpf}`.trim())
    setClienteDropdownOpen(false)
  }

  function limparCliente() {
    setForm((f) => ({ ...f, cpf_cliente: '' }))
    setClienteSearch('')
    setClienteDropdownOpen(false)
  }

  function abrirAgendar() {
    setAgendarCpfCliente('')
    setAgendarClienteSearch('')
    setAgendarClienteDropdownOpen(false)
    setAgendarIdResponsaveis([])
    setModalAgendarAberto(true)
  }

  function fecharAgendar() {
    setModalAgendarAberto(false)
    setAgendarCpfCliente('')
    setAgendarClienteSearch('')
    setAgendarIdResponsaveis([])
  }

  function selecionarClienteAgendar(c: ClienteSelect) {
    setAgendarCpfCliente(c.cpf)
    setAgendarClienteSearch(`${c.nome ?? ''} — ${c.cpf}`.trim())
    setAgendarClienteDropdownOpen(false)
  }

  function limparClienteAgendar() {
    setAgendarCpfCliente('')
    setAgendarClienteSearch('')
    setAgendarClienteDropdownOpen(false)
  }

  async function handleSalvarAgendar(e: React.FormEvent) {
    e.preventDefault()
    if (!agendarCpfCliente.trim()) {
      setMensagem({ titulo: 'Campos obrigatórios', texto: 'Selecione o cliente (CPF).', tipo: 'erro' })
      setModalMensagemAberto(true)
      return
    }
    if (agendarIdResponsaveis.length === 0) {
      setMensagem({ titulo: 'Campos obrigatórios', texto: 'Selecione ao menos um responsável.', tipo: 'erro' })
      setModalMensagemAberto(true)
      return
    }
    setAgendarSalvando(true)
    try {
      const { data: vistoria, error } = await supabase
        .from('vistorias')
        .insert({
          cpf_cliente: agendarCpfCliente.trim(),
          id_usuario: user.id,
          status: 'Novo',
        })
        .select('id')
        .single()
      if (error) throw error
      const vistoriaId = vistoria?.id
      if (vistoriaId) {
        await supabase.from('vistoria_responsaveis').insert(
          agendarIdResponsaveis.map((id_usuario) => ({ vistoria_id: vistoriaId, id_usuario }))
        )
      }
      setMensagem({ titulo: 'Sucesso', texto: 'Vistoria agendada com sucesso.', tipo: 'sucesso' })
      setModalMensagemAberto(true)
      fecharAgendar()
      await carregarVistorias()
    } catch (err) {
      setMensagem({ titulo: 'Erro', texto: err instanceof Error ? err.message : 'Erro ao agendar.', tipo: 'erro' })
      setModalMensagemAberto(true)
    } finally {
      setAgendarSalvando(false)
    }
  }

  function sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  }

  async function handleFotoChange(
    fieldKey: keyof VistoriaForm,
    file: File | null,
    clearPreview?: () => void
  ) {
    setFotoErroPorCampo((prev) => ({ ...prev, [fieldKey]: '' }))
    if (!file) {
      setForm((f) => ({ ...f, [fieldKey]: '' }))
      setFotoPreviewTemp((prev) => ({ ...prev, [fieldKey]: '' }))
      return
    }
    if (!file.type.startsWith('image/')) {
      setFotoErroPorCampo((prev) => ({ ...prev, [fieldKey]: 'Selecione uma imagem (JPG, PNG, etc.).' }))
      return
    }
    setFotoEnviando(fieldKey)
    setFotoNomeEnviando(file.name)
    try {
      const path = `${user?.id ?? 'anon'}/${Date.now()}_${String(fieldKey)}_${sanitizeFileName(file.name)}`
      const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(path, file, {
        contentType: file.type,
        upsert: true,
      })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(path)
      setForm((f) => ({ ...f, [fieldKey]: publicUrl }))
      setFotoErroPorCampo((prev) => ({ ...prev, [fieldKey]: '' }))
      clearPreview?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível enviar a foto.'
      setFotoErroPorCampo((prev) => ({ ...prev, [fieldKey]: msg }))
      setMensagem({
        titulo: 'Erro no upload',
        texto: msg + ' Verifique no Supabase: Storage > bucket "Fotos_vistoria" existe e está público (ou com política de upload).',
        tipo: 'erro',
      })
      setModalMensagemAberto(true)
    } finally {
      setFotoEnviando(null)
      setFotoNomeEnviando('')
    }
  }

  async function handleFotoChangeMulti(fieldKey: keyof VistoriaForm, files: FileList | null) {
    if (!files?.length) return
    const arquivos = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (arquivos.length === 0) {
      setFotoErroPorCampo((prev) => ({ ...prev, [fieldKey]: 'Selecione apenas imagens (JPG, PNG, etc.).' }))
      return
    }
    setFotoErroPorCampo((prev) => ({ ...prev, [fieldKey]: '' }))
    setFotoEnviando(fieldKey)
    setFotoNomeEnviando(`${arquivos.length} foto(s)`)
    const urlsExistentes = ((form[fieldKey] as string) || '').trim().split(DELIM_MULTI_FOTO).filter(Boolean)
    const novasUrls: string[] = []
    try {
      for (const file of arquivos) {
        const path = `${user?.id ?? 'anon'}/${Date.now()}_${String(fieldKey)}_${sanitizeFileName(file.name)}`
        const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(path, file, {
          contentType: file.type,
          upsert: true,
        })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(path)
        novasUrls.push(publicUrl)
      }
      setForm((f) => ({
        ...f,
        [fieldKey]: [...urlsExistentes, ...novasUrls].join(DELIM_MULTI_FOTO),
      }))
    } catch (e) {
      setFotoErroPorCampo((prev) => ({
        ...prev,
        [fieldKey]: e instanceof Error ? e.message : 'Erro ao enviar as fotos.',
      }))
      setMensagem({ titulo: 'Erro no upload', texto: e instanceof Error ? e.message : 'Erro ao enviar as fotos.', tipo: 'erro' })
      setModalMensagemAberto(true)
    } finally {
      setFotoEnviando(null)
      setFotoNomeEnviando('')
    }
  }

  function removerUmaFotoMulti(fieldKey: keyof VistoriaForm, urlToRemove: string) {
    const urls = ((form[fieldKey] as string) || '').split(DELIM_MULTI_FOTO).filter((u) => u.trim() && u !== urlToRemove)
    setForm((f) => ({ ...f, [fieldKey]: urls.join(DELIM_MULTI_FOTO) }))
  }

  function toggleResponsavel(id: string) {
    setForm((f) => ({
      ...f,
      id_responsaveis: f.id_responsaveis.includes(id)
        ? f.id_responsaveis.filter((x) => x !== id)
        : [...f.id_responsaveis, id],
    }))
  }

  function validarObrigatorios(): string | null {
    if (!form.cpf_cliente.trim()) return 'Selecione o cliente (CPF).'
    if (!form.tipo_padrao?.trim()) return 'Selecione o tipo do padrão.'
    if (!form.onde_ligado_inversor?.trim()) return 'Selecione onde será ligado o inversor.'
    if (!form.percurso_cabo_inversor?.trim()) return 'Preencha o percurso do cabo do inversor.'
    const qtdCc = form.qtd_eletrodutos_inversor_cc?.trim()
    const qtdCa = form.qtd_eletrodutos_inversor_ca?.trim()
    const qtdCond = form.qtd_conduletes_inversor?.trim()
    const qtdPad = form.qtd_eletrodutos_padrao?.trim()
    const metr = form.metragem_total_cabos_padrao?.trim()
    if (qtdCc === '' || qtdCa === '' || qtdCond === '' || qtdPad === '' || metr === '') {
      return 'Preencha todos os campos de Eletrodutos e cabos (informe 0 se não houver).'
    }
    if (form.id_responsaveis.length === 0) return 'Selecione ao menos um responsável.'
    return null
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const erro = validarObrigatorios()
    if (erro) {
      setMensagem({ titulo: 'Campos obrigatórios', texto: erro, tipo: 'erro' })
      setModalMensagemAberto(true)
      return
    }

    setSalvando(true)
    try {
      const payload = {
        cpf_cliente: form.cpf_cliente.trim(),
        status: form.status,
        tipo_padrao: form.tipo_padrao || null,
        onde_ligado_inversor: form.onde_ligado_inversor || null,
        percurso_cabo_inversor: form.percurso_cabo_inversor.trim() || null,
        qtd_eletrodutos_inversor_cc: form.qtd_eletrodutos_inversor_cc ? parseInt(form.qtd_eletrodutos_inversor_cc, 10) : null,
        qtd_eletrodutos_inversor_ca: form.qtd_eletrodutos_inversor_ca ? parseInt(form.qtd_eletrodutos_inversor_ca, 10) : null,
        qtd_conduletes_inversor: form.qtd_conduletes_inversor ? parseInt(form.qtd_conduletes_inversor, 10) : null,
        qtd_eletrodutos_padrao: form.qtd_eletrodutos_padrao ? parseInt(form.qtd_eletrodutos_padrao, 10) : null,
        metragem_total_cabos_padrao: form.metragem_total_cabos_padrao ? parseFloat(form.metragem_total_cabos_padrao) : null,
        link_foto_fachada: form.link_foto_fachada.trim() || null,
        link_foto_padrao_entrada: form.link_foto_padrao_entrada.trim() || null,
        link_foto_disjuntor_padrao: form.link_foto_disjuntor_padrao.trim() || null,
        link_foto_poste_mais_proximo: form.link_foto_poste_mais_proximo.trim() || null,
        link_foto_ramal_entrada: form.link_foto_ramal_entrada.trim() || null,
        link_foto_local_inversor: form.link_foto_local_inversor.trim() || null,
        link_foto_aterramento: form.link_foto_aterramento.trim() || null,
        link_foto_estrutura_telhado: form.link_foto_estrutura_telhado.trim() || null,
        link_foto_telhado: form.link_foto_telhado.trim() || null,
        link_foto_print_mapa: form.link_foto_print_mapa.trim() || null,
        observacao: form.observacao.trim() || null,
      }

      if (vistoriaEmEdicaoId) {
        const { error } = await supabase
          .from('vistorias')
          .update(payload)
          .eq('id', vistoriaEmEdicaoId)
        if (error) throw error
        await supabase.from('vistoria_responsaveis').delete().eq('vistoria_id', vistoriaEmEdicaoId)
        if (form.id_responsaveis.length > 0) {
          await supabase.from('vistoria_responsaveis').insert(
            form.id_responsaveis.map((id_usuario) => ({ vistoria_id: vistoriaEmEdicaoId, id_usuario }))
          )
        }
        setMensagem({ titulo: 'Sucesso', texto: 'Vistoria atualizada com sucesso.', tipo: 'sucesso' })
      } else {
        const { data: vistoria, error } = await supabase
          .from('vistorias')
          .insert({ ...payload, id_usuario: user.id })
          .select('id')
          .single()
        if (error) throw error
        const vistoriaId = vistoria?.id
        if (vistoriaId && form.id_responsaveis.length > 0) {
          await supabase.from('vistoria_responsaveis').insert(
            form.id_responsaveis.map((id_usuario) => ({ vistoria_id: vistoriaId, id_usuario }))
          )
        }
        setMensagem({ titulo: 'Sucesso', texto: 'Vistoria cadastrada com sucesso.', tipo: 'sucesso' })
      }
      setModalMensagemAberto(true)
      fecharModal()
      await carregarVistorias()
    } catch (e) {
      setMensagem({ titulo: 'Erro', texto: e instanceof Error ? e.message : 'Erro ao salvar.', tipo: 'erro' })
      setModalMensagemAberto(true)
    } finally {
      setSalvando(false)
    }
  }

  async function handleSair() {
    await signOut()
    navigate('/', { replace: true })
  }

  function gerarRelatorioPdf(v: Vistoria) {
    const logoUrl = `${window.location.origin}/LogoJSX.PNG`
    const cliente = clientes.find((c) => c.cpf === v.cpf_cliente)
    const partesEndereco = [
      cliente?.logradouro,
      cliente?.numero,
      cliente?.complemento,
      cliente?.bairro,
      [cliente?.cidade, cliente?.estado].filter(Boolean).join(' — '),
      cliente?.cep,
    ].filter(Boolean) as string[]
    const enderecoCompleto = partesEndereco.length > 0 ? partesEndereco.join(', ') : '—'

    const fotoLabels: Record<string, string> = {
      link_foto_fachada: 'Fachada do local',
      link_foto_padrao_entrada: 'Padrão de entrada',
      link_foto_disjuntor_padrao: 'Disjuntor padrão',
      link_foto_poste_mais_proximo: 'Poste mais próximo',
      link_foto_ramal_entrada: 'Ramal de entrada',
      link_foto_local_inversor: 'Local do inversor',
      link_foto_aterramento: 'Aterramento',
      link_foto_estrutura_telhado: 'Estrutura do telhado',
      link_foto_telhado: 'Telhado',
      link_foto_print_mapa: 'Print do mapa',
    }

    const fotosHtml = (
      [
        'link_foto_fachada',
        'link_foto_padrao_entrada',
        'link_foto_disjuntor_padrao',
        'link_foto_poste_mais_proximo',
        'link_foto_ramal_entrada',
        'link_foto_local_inversor',
        'link_foto_aterramento',
        'link_foto_estrutura_telhado',
        'link_foto_telhado',
        'link_foto_print_mapa',
      ] as const
    )
      .map((key) => {
        const val = v[key] as string | null | undefined
        const urls = val?.trim() ? val.split(DELIM_MULTI_FOTO).filter(Boolean) : []
        if (urls.length === 0) return `<p><strong>${fotoLabels[key]}:</strong> —</p>`
        return `<p><strong>${fotoLabels[key]}:</strong><br/><div style="text-align:center;">${urls.map((u) => `<img src="${u}" alt="" style="max-width:200px;max-height:150px;margin:4px;" />`).join(' ')}</div></p>`
      })
      .join('')

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório de Vistoria</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
    h1 { font-size: 18px; border-bottom: 1px solid #333; padding-bottom: 8px; }
    h2 { font-size: 14px; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; }
    .observacao { margin-top: 12px; white-space: pre-wrap; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div style="text-align:center; margin-bottom:16px;">
    <img src="${logoUrl}" alt="JSX" style="max-height:60px; max-width:180px; object-fit:contain;" />
  </div>
  <h1>Relatório de Vistoria</h1>
  <p><strong>Data do relatório:</strong> ${new Date().toLocaleString('pt-BR')}</p>

  <h2>Dados gerais</h2>
  <table>
    <tr><th>Cliente (nome)</th><td>${cliente?.nome?.trim() ?? '—'}</td></tr>
    <tr><th>CPF</th><td>${v.cpf_cliente || '—'}</td></tr>
    <tr><th>Endereço</th><td>${enderecoCompleto}</td></tr>
    <tr><th>Data de criação</th><td>${v.data_criacao ? new Date(v.data_criacao).toLocaleString('pt-BR') : '—'}</td></tr>
    <tr><th>Status</th><td>${v.status || '—'}</td></tr>
  </table>

  <h2>Padrão e inversor</h2>
  <table>
    <tr><th>Tipo do padrão</th><td>${v.tipo_padrao ?? '—'}</td></tr>
    <tr><th>Onde ligado o inversor</th><td>${v.onde_ligado_inversor ?? '—'}</td></tr>
    <tr><th>Percurso cabo inversor (m)</th><td>${v.percurso_cabo_inversor ?? '—'}</td></tr>
  </table>

  <h2>Eletrodutos e cabos</h2>
  <table>
    <tr><th>Qtd. eletrod. inv. CC</th><td>${v.qtd_eletrodutos_inversor_cc ?? '—'}</td></tr>
    <tr><th>Qtd. eletrod. inv. CA</th><td>${v.qtd_eletrodutos_inversor_ca ?? '—'}</td></tr>
    <tr><th>Qtd. conduletes inv.</th><td>${v.qtd_conduletes_inversor ?? '—'}</td></tr>
    <tr><th>Qtd. eletrod. padrão</th><td>${v.qtd_eletrodutos_padrao ?? '—'}</td></tr>
    <tr><th>Metragem cabos padrão (m)</th><td>${v.metragem_total_cabos_padrao ?? '—'}</td></tr>
  </table>

  <h2>Fotos</h2>
  ${fotosHtml}

  ${(v.observacao ?? '').trim() ? `<h2>Observação</h2><div class="observacao">${String(v.observacao).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}

  <script>
    window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
  </script>
</body>
</html>`

    const janela = window.open('', '_blank')
    if (janela) {
      janela.document.write(html)
      janela.document.close()
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Vistorias</h1>
        <nav className="nav-links">
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
        <section className="card">
          <div className="card-header-row">
            <h2>Lista de vistorias</h2>
            {(user?.tipo_usuario === 'Administrador' || user?.tipo_usuario === 'Administrativo') && (
              <button type="button" className="btn btn-primary" onClick={abrirAgendar}>
                Agendar Vistoria
              </button>
            )}
          </div>

          <div className="vistorias-filtros mb-3">
            <div className="row g-2 g-md-3 align-items-end">
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label small mb-1">Cliente (nome ou CPF)</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Buscar por nome ou CPF..."
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                />
              </div>
              <div className="col-12 col-sm-6 col-md-3" ref={filtroStatusRef}>
                <label className="form-label small mb-1">Status</label>
                <div className="dropdown">
                  <button
                    type="button"
                    className="form-select form-select-sm text-start d-flex align-items-center justify-content-between"
                    style={{ minHeight: '31px' }}
                    onClick={() => setFiltroStatusDropdownOpen((o) => !o)}
                    aria-expanded={filtroStatusDropdownOpen}
                    aria-haspopup="listbox"
                  >
                    <span className="text-truncate">
                      {filtroStatus.length === 0
                        ? 'Todos'
                        : filtroStatus.length === STATUS_VISTORIA.length
                          ? 'Todos'
                          : `${filtroStatus.length} selecionado(s)`}
                    </span>
                    <span className="dropdown-toggle ms-1" style={{ border: 'none', background: 'none', pointerEvents: 'none' }} />
                  </button>
                  {filtroStatusDropdownOpen && (
                    <ul
                      className="dropdown-menu show p-2 vistoria-status-checklist"
                      role="listbox"
                      style={{ minWidth: '220px', maxHeight: '280px', overflowY: 'auto' }}
                    >
                      {STATUS_VISTORIA.map((s) => (
                        <li key={s}>
                          <label className="dropdown-item d-flex align-items-center gap-2 mb-0 cursor-pointer">
                            <input
                              type="checkbox"
                              className="form-check-input flex-shrink-0"
                              checked={filtroStatus.includes(s)}
                              onChange={(e) => {
                                e.stopPropagation()
                                setFiltroStatus((prev) =>
                                  e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)
                                )
                              }}
                            />
                            <span>{s}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label small mb-1">Data início</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label small mb-1">Data fim</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={limparFiltros}>
                  Limpar filtros
                </button>
              </div>
            </div>
          </div>

          {carregando ? (
            <p className="placeholder-text">Carregando…</p>
          ) : vistorias.length === 0 ? (
            <p className="placeholder-text">Nenhuma vistoria cadastrada.</p>
          ) : vistoriasFiltradas.length === 0 ? (
            <p className="placeholder-text">Nenhuma vistoria encontrada com os filtros aplicados.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Tipo padrão</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vistoriasFiltradas.map((v) => {
                    const cliente = clientes.find((c) => c.cpf === v.cpf_cliente)
                    return (
                    <tr key={v.id}>
                      <td>
                        <button
                          type="button"
                          className="btn btn-link p-0 text-start text-decoration-none text-primary"
                          onClick={() => {
                            if (v.status === 'Novo') abrirParaEdicao(v)
                            else setVistoriaDetalhe(v)
                          }}
                        >
                          {cliente?.nome?.trim() || v.cpf_cliente}
                        </button>
                      </td>
                      <td>{new Date(v.data_criacao).toLocaleDateString('pt-BR')}</td>
                      <td>{v.status}</td>
                      <td>{v.tipo_padrao ?? '—'}</td>
                      <td className="text-center">
                        {STATUS_COM_RELATORIO.includes(v.status) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger p-1"
                            onClick={() => gerarRelatorioPdf(v)}
                            title="Gerar relatório em PDF"
                            aria-label="Gerar relatório em PDF"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zm0 12H8v-2h5v2zm0-4H8v-2h5v2zm0-4H8v-2h5v2z"/>
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <BSModal
        show={modalAberto}
        onHide={perguntarCancelar}
        size="xl"
        fullscreen="md-down"
        centered
        scrollable
        backdrop="static"
        keyboard={false}
        className="vistoria-modal"
      >
        <form onSubmit={handleSalvar} className="vistoria-form">
          <BSModal.Header closeButton className="border-bottom py-3">
            <BSModal.Title className="h5 mb-0">
              {vistoriaEmEdicaoId ? 'Editar vistoria' : 'Cadastrar vistoria'}
            </BSModal.Title>
          </BSModal.Header>
          <BSModal.Body className="modal-body-scroll py-3 py-md-4">
            <section className="vistoria-section mb-3 mb-md-4">
              <h6 className="vistoria-section-title">Dados gerais</h6>
              <div className="row g-2 g-md-3">
                <div className="col-12" ref={clienteSearchRef}>
                  <label className="form-label">Cliente (CPF) *</label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className="form-control text-truncate"
                      placeholder="Pesquisar por nome ou CPF..."
                      value={clienteSearch}
                      onChange={(e) => {
                        setClienteSearch(e.target.value)
                        setClienteDropdownOpen(true)
                        if (!e.target.value.trim()) setForm((f) => ({ ...f, cpf_cliente: '' }))
                      }}
                      onFocus={() => setClienteDropdownOpen(true)}
                      autoComplete="off"
                      style={{ minHeight: '38px' }}
                    />
                    {form.cpf_cliente && (
                      <button
                        type="button"
                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary text-decoration-none p-0 me-2"
                        style={{ fontSize: '1.2rem' }}
                        onClick={limparCliente}
                        title="Limpar"
                        aria-label="Limpar cliente"
                      >
                        ×
                      </button>
                    )}
                    {clienteDropdownOpen && (
                      <ul
                        className="list-group position-absolute w-100 shadow-sm mt-1"
                        style={{ maxHeight: '200px', overflowY: 'auto', zIndex: 1050 }}
                      >
                        {clientesFiltrados.length === 0 ? (
                          <li className="list-group-item text-muted">Nenhum cliente encontrado</li>
                        ) : (
                          clientesFiltrados.map((c) => (
                            <li
                              key={c.id}
                              role="button"
                              className="list-group-item list-group-item-action text-truncate"
                              onClick={() => selecionarCliente(c)}
                            >
                              {c.nome ?? '—'} — {c.cpf}
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as VistoriaForm['status'] }))}
                  >
                    {STATUS_VISTORIA.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="vistoria-section mb-3 mb-md-4">
              <h6 className="vistoria-section-title">Padrão e inversor</h6>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label">Tipo do padrão *</label>
                  <select
                    className="form-select"
                    value={form.tipo_padrao}
                    onChange={(e) => setForm((f) => ({ ...f, tipo_padrao: e.target.value }))}
                    required
                  >
                    <option value="">Selecione</option>
                    {TIPO_PADRAO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label">Onde será ligado o inversor *</label>
                  <select
                    className="form-select"
                    value={form.onde_ligado_inversor}
                    onChange={(e) => setForm((f) => ({ ...f, onde_ligado_inversor: e.target.value }))}
                    required
                  >
                    <option value="">Selecione</option>
                    {ONDE_LIGADO_INVERSOR.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label" title="Percurso do cabo do inversor até o padrão ou caixa de passagem">
                    Percurso cabo inversor (m) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="form-control"
                    value={form.percurso_cabo_inversor}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '' || /^\d+$/.test(v)) setForm((f) => ({ ...f, percurso_cabo_inversor: v }))
                    }}
                    placeholder="Metros (inteiro)"
                    required
                  />
                </div>
              </div>
            </section>

            <section className="vistoria-section mb-3 mb-md-4">
              <h6 className="vistoria-section-title">Eletrodutos e cabos *</h6>
              <div className="row g-2 g-md-3 align-items-end">
                <div className="col-6 col-md-4 col-lg-3">
                  <label className="form-label text-nowrap" title="Quantidade de eletrodutos inversor CC">Qtd. eletrod. inv. CC *</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={form.qtd_eletrodutos_inversor_cc}
                    onChange={(e) => setForm((f) => ({ ...f, qtd_eletrodutos_inversor_cc: e.target.value }))}
                  />
                </div>
                <div className="col-6 col-md-4 col-lg-3">
                  <label className="form-label text-nowrap" title="Quantidade de eletrodutos inversor CA">Qtd. eletrod. inv. CA *</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={form.qtd_eletrodutos_inversor_ca}
                    onChange={(e) => setForm((f) => ({ ...f, qtd_eletrodutos_inversor_ca: e.target.value }))}
                  />
                </div>
                <div className="col-6 col-md-4 col-lg-3">
                  <label className="form-label text-nowrap">Qtd. conduletes inv. *</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={form.qtd_conduletes_inversor}
                    onChange={(e) => setForm((f) => ({ ...f, qtd_conduletes_inversor: e.target.value }))}
                  />
                </div>
                <div className="col-6 col-md-4 col-lg-3">
                  <label className="form-label text-nowrap">Qtd. eletrod. padrão *</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={form.qtd_eletrodutos_padrao}
                    onChange={(e) => setForm((f) => ({ ...f, qtd_eletrodutos_padrao: e.target.value }))}
                  />
                </div>
                <div className="col-12 col-lg-6">
                  <label className="form-label">Metragem total cabos padrão (m) *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="form-control"
                    value={form.metragem_total_cabos_padrao}
                    onChange={(e) => setForm((f) => ({ ...f, metragem_total_cabos_padrao: e.target.value }))}
                  />
                </div>
              </div>
            </section>

            <section className="vistoria-section mb-3 mb-md-4">
              <h6 className="vistoria-section-title">Fotos</h6>
              <div className="row g-2 g-md-3">
                {[
                  { key: 'link_foto_fachada' as const, label: 'Foto fachada do local' },
                  { key: 'link_foto_padrao_entrada' as const, label: 'Foto padrão de entrada' },
                  { key: 'link_foto_disjuntor_padrao' as const, label: 'Foto disjuntor do padrão de entrada' },
                  { key: 'link_foto_poste_mais_proximo' as const, label: 'Foto do poste mais próximo' },
                  { key: 'link_foto_ramal_entrada' as const, label: 'Foto do ramal de entrada' },
                  { key: 'link_foto_local_inversor' as const, label: 'Foto do local do inversor' },
                  { key: 'link_foto_aterramento' as const, label: 'Foto do aterramento do sistema' },
                  { key: 'link_foto_estrutura_telhado' as const, label: 'Foto da estrutura do telhado' },
                  { key: 'link_foto_telhado' as const, label: 'Foto do telhado' },
                  { key: 'link_foto_print_mapa' as const, label: 'Foto do print do mapa' },
                ].map(({ key, label }) => {
                  const isMulti = CAMPOS_MULTI_FOTO.includes(key)
                  const enviando = fotoEnviando === key
                  const valor = (form[key] as string)?.trim() ?? ''
                  const urlsMulti = valor ? valor.split(DELIM_MULTI_FOTO).filter(Boolean) : []
                  const enviada = !enviando && (isMulti ? urlsMulti.length > 0 : !!valor)
                  const previewUrl = !isMulti && (fotoPreviewTemp[key] || valor)

                  if (isMulti) {
                    return (
                      <div className="col-12 col-sm-6 col-lg-4 vistoria-foto-cell" key={key}>
                        <label className="form-label">{label} (pode selecionar várias)</label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="form-control form-control-sm mb-1"
                          disabled={enviando}
                          onChange={(e) => {
                            handleFotoChangeMulti(key, e.target.files)
                            e.target.value = ''
                          }}
                        />
                        {enviando && (
                          <span className="text-primary small d-block mb-1">{fotoNomeEnviando}</span>
                        )}
                        {urlsMulti.length > 0 && (
                          <div className="d-flex flex-wrap gap-2 mb-2">
                            {urlsMulti.map((url) => (
                              <div key={url} className="position-relative d-inline-block">
                                <img
                                  src={url}
                                  alt="Preview"
                                  className="rounded border"
                                  style={{ maxHeight: 100, maxWidth: 100, objectFit: 'cover' }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger position-absolute top-0 end-0"
                                  style={{ padding: '0.1rem 0.35rem', fontSize: '0.75rem' }}
                                  onClick={() => removerUmaFotoMulti(key, url)}
                                  title="Remover esta foto"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="min-height-status-foto">
                          {enviada && !enviando && (
                            <span className="text-success small fw-medium">{urlsMulti.length} foto(s) carregada(s)</span>
                          )}
                          {!enviando && urlsMulti.length === 0 && !fotoErroPorCampo[key] && (
                            <span className="text-muted small">Nenhuma foto selecionada</span>
                          )}
                          {fotoErroPorCampo[key] && (
                            <span className="text-danger small" role="alert">Erro: {fotoErroPorCampo[key]}</span>
                          )}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className="col-12 col-sm-6 col-lg-4 vistoria-foto-cell" key={key}>
                      <label className="form-label">{label}</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control form-control-sm mb-1"
                        disabled={enviando}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) {
                            const objectUrl = URL.createObjectURL(f)
                            setFotoPreviewTemp((prev) => {
                              const old = prev[key]
                              if (old) URL.revokeObjectURL(old)
                              return { ...prev, [key]: objectUrl }
                            })
                            handleFotoChange(key, f, () => {
                              setFotoPreviewTemp((prev) => {
                                const url = prev[key]
                                if (url) URL.revokeObjectURL(url)
                                const next = { ...prev }
                                delete next[key]
                                return next
                              })
                            })
                          }
                          e.target.value = ''
                        }}
                      />
                      {previewUrl && (
                        <div className="mb-2">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="rounded border"
                            style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      )}
                      <div className="d-flex align-items-center gap-2 flex-wrap min-height-status-foto">
                        {enviando && (
                          <span className="text-primary small" title={fotoNomeEnviando}>
                            Enviando: {fotoNomeEnviando ? (fotoNomeEnviando.length > 25 ? fotoNomeEnviando.slice(0, 25) + '…' : fotoNomeEnviando) : '…'}
                          </span>
                        )}
                        {enviada && (
                          <>
                            <span className="text-success small fw-medium">✓ Foto carregada</span>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => {
                                setForm((f) => ({ ...f, [key]: '' }))
                                setFotoPreviewTemp((prev) => {
                                  const url = prev[key]
                                  if (url) URL.revokeObjectURL(url)
                                  const next = { ...prev }
                                  delete next[key]
                                  return next
                                })
                              }}
                            >
                              Remover
                            </button>
                          </>
                        )}
                        {!enviando && !enviada && !fotoErroPorCampo[key] && (
                          <span className="text-muted small">Nenhuma foto selecionada</span>
                        )}
                        {fotoErroPorCampo[key] && (
                          <span className="text-danger small" role="alert">
                            Erro: {fotoErroPorCampo[key]}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="vistoria-section mb-0">
              <h6 className="vistoria-section-title">Responsáveis *</h6>
              <div className="row g-2 g-md-2">
                {usuarios.map((u) => (
                  <div className="col-6 col-md-4 col-lg-3" key={u.id}>
                    <div className="form-check py-1">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`resp-${u.id}`}
                        checked={form.id_responsaveis.includes(u.id)}
                        onChange={() => toggleResponsavel(u.id)}
                      />
                      <label className="form-check-label text-truncate d-block" htmlFor={`resp-${u.id}`} title={u.nome || u.email}>
                        {u.nome || u.email}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              {usuarios.length === 0 && (
                <p className="text-muted small mb-0">Nenhum usuário cadastrado.</p>
              )}
            </section>

            <section className="vistoria-section mb-0">
              <label className="form-label" htmlFor="vistoria-observacao">Observação</label>
              <textarea
                id="vistoria-observacao"
                className="form-control"
                rows={3}
                placeholder="Anotações gerais sobre a vistoria (opcional)"
                value={form.observacao}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              />
            </section>
          </BSModal.Body>
          <BSModal.Footer>
            <button type="button" className="btn btn-secondary" onClick={perguntarCancelar}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </BSModal.Footer>
        </form>
      </BSModal>

      <BSModal
        show={modalAgendarAberto}
        onHide={fecharAgendar}
        centered
        className="vistoria-modal"
      >
        <form onSubmit={handleSalvarAgendar}>
          <BSModal.Header closeButton>
            <BSModal.Title className="h5 mb-0">Agendar Vistoria</BSModal.Title>
          </BSModal.Header>
          <BSModal.Body className="py-3 py-md-4">
            <section className="vistoria-section mb-3 mb-md-4">
              <h6 className="vistoria-section-title">Dados do agendamento</h6>
              <div className="row g-2 g-md-3">
                <div className="col-12" ref={agendarClienteSearchRef}>
                  <label className="form-label">Cliente (CPF) *</label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className="form-control text-truncate"
                      placeholder="Pesquisar por nome ou CPF..."
                      value={agendarClienteSearch}
                      onChange={(e) => {
                        setAgendarClienteSearch(e.target.value)
                        setAgendarClienteDropdownOpen(true)
                        if (!e.target.value.trim()) setAgendarCpfCliente('')
                      }}
                      onFocus={() => setAgendarClienteDropdownOpen(true)}
                      autoComplete="off"
                      style={{ minHeight: '38px' }}
                    />
                    {agendarCpfCliente && (
                      <button
                        type="button"
                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary text-decoration-none p-0 me-2"
                        style={{ fontSize: '1.2rem' }}
                        onClick={limparClienteAgendar}
                        title="Limpar"
                        aria-label="Limpar cliente"
                      >
                        ×
                      </button>
                    )}
                    {agendarClienteDropdownOpen && (
                      <ul
                        className="list-group position-absolute w-100 shadow-sm mt-1"
                        style={{ maxHeight: '200px', overflowY: 'auto', zIndex: 1050 }}
                      >
                        {clientesFiltradosAgendar.length === 0 ? (
                          <li className="list-group-item text-muted">Nenhum cliente encontrado</li>
                        ) : (
                          clientesFiltradosAgendar.map((c) => (
                            <li
                              key={c.id}
                              role="button"
                              className="list-group-item list-group-item-action text-truncate"
                              onClick={() => selecionarClienteAgendar(c)}
                            >
                              {c.nome ?? '—'} — {c.cpf}
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="vistoria-section mb-0">
              <label className="form-label" htmlFor="agendar-responsaveis">
                Responsáveis *
              </label>
              <select
                id="agendar-responsaveis"
                className="form-select"
                multiple
                size={Math.min(Math.max(usuarios.length, 3), 8)}
                value={agendarIdResponsaveis}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (opt) => opt.value)
                  setAgendarIdResponsaveis(selected)
                }}
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome || u.email}
                  </option>
                ))}
              </select>
              <small className="text-muted d-block mt-1">
                Segure Ctrl (ou Cmd no Mac) para selecionar mais de um.
              </small>
              {usuarios.length === 0 && (
                <p className="text-muted small mb-0 mt-1">Nenhum usuário cadastrado.</p>
              )}
            </section>
          </BSModal.Body>
          <BSModal.Footer>
            <button type="button" className="btn btn-secondary" onClick={fecharAgendar}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={agendarSalvando}>
              {agendarSalvando ? 'Salvando…' : 'Agendar'}
            </button>
          </BSModal.Footer>
        </form>
      </BSModal>

      <BSModal
        show={!!vistoriaDetalhe}
        onHide={() => setVistoriaDetalhe(null)}
        size="lg"
        centered
        scrollable
        className="vistoria-modal"
      >
        <BSModal.Header closeButton>
          <BSModal.Title className="h5 mb-0">Detalhes da vistoria</BSModal.Title>
        </BSModal.Header>
        <BSModal.Body className="py-3 py-md-4">
          {vistoriaDetalhe && (() => {
            const clienteDetalhe = clientes.find((c) => c.cpf === vistoriaDetalhe.cpf_cliente)
            const partesEndereco = [
              clienteDetalhe?.logradouro,
              clienteDetalhe?.numero,
              clienteDetalhe?.complemento,
              clienteDetalhe?.bairro,
              [clienteDetalhe?.cidade, clienteDetalhe?.estado].filter(Boolean).join(' — '),
              clienteDetalhe?.cep,
            ].filter(Boolean) as string[]
            const enderecoCompleto = partesEndereco.length > 0 ? partesEndereco.join(', ') : null
            return (
            <>
              <section className="vistoria-section mb-3 mb-md-4">
                <h6 className="vistoria-section-title">Dados gerais</h6>
                <dl className="row g-2 mb-0 small">
                  <dt className="col-sm-4 text-secondary">Nome do cliente</dt>
                  <dd className="col-sm-8">{clienteDetalhe?.nome?.trim() || '—'}</dd>
                  <dt className="col-sm-4 text-secondary">CPF</dt>
                  <dd className="col-sm-8">{vistoriaDetalhe.cpf_cliente || '—'}</dd>
                  {enderecoCompleto && (
                    <>
                      <dt className="col-sm-4 text-secondary">Endereço</dt>
                      <dd className="col-sm-8 text-break">{enderecoCompleto}</dd>
                    </>
                  )}
                  <dt className="col-sm-4 text-secondary">Data de criação</dt>
                  <dd className="col-sm-8">{vistoriaDetalhe.data_criacao ? new Date(vistoriaDetalhe.data_criacao).toLocaleString('pt-BR') : '—'}</dd>
                  <dt className="col-sm-4 text-secondary">Status</dt>
                  <dd className="col-sm-8">{vistoriaDetalhe.status || '—'}</dd>
                </dl>
              </section>

              <section className="vistoria-section mb-3 mb-md-4">
                <h6 className="vistoria-section-title">Padrão e inversor</h6>
                <dl className="row g-2 mb-0 small">
                  <dt className="col-sm-4 text-secondary">Tipo do padrão</dt>
                  <dd className="col-sm-8">{vistoriaDetalhe.tipo_padrao ?? '—'}</dd>
                  <dt className="col-sm-4 text-secondary">Onde ligado o inversor</dt>
                  <dd className="col-sm-8">{vistoriaDetalhe.onde_ligado_inversor ?? '—'}</dd>
                  <dt className="col-sm-4 text-secondary">Percurso cabo inversor (m)</dt>
                  <dd className="col-sm-8">{vistoriaDetalhe.percurso_cabo_inversor ?? '—'}</dd>
                </dl>
              </section>

              <section className="vistoria-section mb-3 mb-md-4">
                <h6 className="vistoria-section-title">Eletrodutos e cabos</h6>
                <dl className="row g-2 mb-0 small">
                  <dt className="col-sm-4 text-secondary">Qtd. eletrod. inv. CC</dt>
                  <dd className="col-sm-8">{vistoriaDetalhe.qtd_eletrodutos_inversor_cc ?? '—'}</dd>
                  <dt className="col-sm-4 text-secondary">Qtd. eletrod. inv. CA</dt>
                  <dd className="col-sm-8">{vistoriaDetalhe.qtd_eletrodutos_inversor_ca ?? '—'}</dd>
                  <dt className="col-sm-4 text-secondary">Qtd. conduletes inv.</dt>
                  <dd className="col-sm-8">{vistoriaDetalhe.qtd_conduletes_inversor ?? '—'}</dd>
                  <dt className="col-sm-4 text-secondary">Qtd. eletrod. padrão</dt>
                  <dd className="col-sm-8">{vistoriaDetalhe.qtd_eletrodutos_padrao ?? '—'}</dd>
                  <dt className="col-sm-4 text-secondary">Metragem cabos padrão (m)</dt>
                  <dd className="col-sm-8">{vistoriaDetalhe.metragem_total_cabos_padrao ?? '—'}</dd>
                </dl>
              </section>

              <section className="vistoria-section mb-3 mb-md-4">
                <h6 className="vistoria-section-title">Fotos</h6>
                <div className="row g-2 g-md-3">
                  {[
                    { key: 'link_foto_fachada' as const, label: 'Fachada do local' },
                    { key: 'link_foto_padrao_entrada' as const, label: 'Padrão de entrada' },
                    { key: 'link_foto_disjuntor_padrao' as const, label: 'Disjuntor padrão' },
                    { key: 'link_foto_poste_mais_proximo' as const, label: 'Poste mais próximo' },
                    { key: 'link_foto_ramal_entrada' as const, label: 'Ramal de entrada' },
                    { key: 'link_foto_local_inversor' as const, label: 'Local do inversor' },
                    { key: 'link_foto_aterramento' as const, label: 'Aterramento' },
                    { key: 'link_foto_estrutura_telhado' as const, label: 'Estrutura do telhado' },
                    { key: 'link_foto_telhado' as const, label: 'Telhado' },
                    { key: 'link_foto_print_mapa' as const, label: 'Print do mapa' },
                  ].map(({ key, label }) => {
                    const val = vistoriaDetalhe[key] as string | null | undefined
                    const urls = val?.trim() ? val.split(DELIM_MULTI_FOTO).filter(Boolean) : []
                    if (urls.length === 0) {
                      return (
                        <div className="col-6 col-md-4 col-lg-3" key={key}>
                          <div className="small text-secondary mb-1">{label}</div>
                          <span className="text-muted small">—</span>
                        </div>
                      )
                    }
                    return (
                      <div className="col-6 col-md-4 col-lg-3" key={key}>
                        <div className="small text-secondary mb-1">{label}</div>
                        <div className="d-flex flex-wrap gap-1">
                          {urls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="d-inline-block">
                              <img src={url} alt={label} className="rounded border" style={{ maxHeight: 80, maxWidth: 80, objectFit: 'cover' }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              {(vistoriaDetalhe.observacao ?? '').trim() && (
                <section className="vistoria-section mb-0">
                  <h6 className="vistoria-section-title">Observação</h6>
                  <p className="small mb-0 text-break">{vistoriaDetalhe.observacao}</p>
                </section>
              )}
            </>
            )
          })()}
        </BSModal.Body>
        <BSModal.Footer>
          <button type="button" className="btn btn-secondary" onClick={() => setVistoriaDetalhe(null)}>
            Fechar
          </button>
        </BSModal.Footer>
      </BSModal>

      <ModalConfirmar
        aberto={modalConfirmarCancelarAberto}
        onFechar={() => setModalConfirmarCancelarAberto(false)}
        titulo="Cancelar cadastro?"
        mensagem="Deseja cancelar? Os dados preenchidos serão perdidos."
        confirmarTexto="Sim, cancelar"
        cancelarTexto="Não"
        onConfirmar={fecharModal}
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
