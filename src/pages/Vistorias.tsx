import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Modal as BSModal } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ModalConfirmar, ModalMensagem } from '../components/Modal'
import type { Cliente } from '../types/cliente'

type ClienteSelect = Pick<Cliente, 'id' | 'cpf' | 'nome' | 'cep' | 'logradouro' | 'numero' | 'complemento' | 'bairro' | 'cidade' | 'estado'>
import type { Usuario } from '../contexts/AuthContext'
import type { Vistoria, VistoriaForm, VistoriaCampo, ValorCampoEdicao, TipoCampoVistoria } from '../types/vistoria'
import { TIPO_PADRAO, ONDE_LIGADO_INVERSOR, STATUS_VISTORIA } from '../types/vistoria'

const GRUPOS_PADRAO_VISTORIA = [
  'Padrão e inversor',
  'Eletrodutos e cabos',
  'Fotos',
  'Observação',
  'Outros',
] as const

const VALOR_GRUPO_OUTRO = '__custom__'

const formVazio: VistoriaForm = {
  cpf_cliente: '',
  status: 'Novo',
  valoresPorCampo: {},
  id_responsaveis: [],
}

function valoresVaziosPorCampos(campos: VistoriaCampo[]): Record<number, ValorCampoEdicao> {
  const o: Record<number, ValorCampoEdicao> = {}
  for (const c of campos) {
    o[c.id] = { valorTexto: '', linkFoto: '' }
  }
  return o
}

/** Mantém colunas legadas em `vistorias` preenchidas para lista/PDF (campos com chave conhecida). */
function montarPayloadVistoriasLegado(campos: VistoriaCampo[], valoresPorCampo: Record<number, ValorCampoEdicao>) {
  const getVt = (chave: string) => valoresPorCampo[campos.find((c) => c.chave === chave)?.id ?? -1]?.valorTexto?.trim() ?? ''
  const getLf = (chave: string) => valoresPorCampo[campos.find((c) => c.chave === chave)?.id ?? -1]?.linkFoto?.trim() ?? ''

  const tipo = getVt('tipo_padrao')
  const percurso = getVt('percurso_cabo_inversor')
  const q = (ch: string) => {
    const s = getVt(ch)
    if (s === '') return null
    const n = parseInt(s, 10)
    return Number.isFinite(n) ? n : null
  }
  const metr = getVt('metragem_total_cabos_padrao')
  let metrNum: number | null = null
  if (metr !== '') {
    const f = parseFloat(metr.replace(',', '.'))
    metrNum = Number.isFinite(f) ? f : null
  }

  return {
    tipo_padrao: tipo ? (tipo as Vistoria['tipo_padrao']) : null,
    onde_ligado_inversor: getVt('onde_ligado_inversor') || null,
    percurso_cabo_inversor: percurso || null,
    qtd_eletrodutos_inversor_cc: q('qtd_eletrodutos_inversor_cc'),
    qtd_eletrodutos_inversor_ca: q('qtd_eletrodutos_inversor_ca'),
    qtd_conduletes_inversor: q('qtd_conduletes_inversor'),
    qtd_eletrodutos_padrao: q('qtd_eletrodutos_padrao'),
    metragem_total_cabos_padrao: metrNum,
    link_foto_fachada: getLf('link_foto_fachada') || null,
    link_foto_padrao_entrada: getLf('link_foto_padrao_entrada') || null,
    link_foto_disjuntor_padrao: getLf('link_foto_disjuntor_padrao') || null,
    link_foto_poste_mais_proximo: getLf('link_foto_poste_mais_proximo') || null,
    link_foto_ramal_entrada: getLf('link_foto_ramal_entrada') || null,
    link_foto_local_inversor: getLf('link_foto_local_inversor') || null,
    link_foto_aterramento: getLf('link_foto_aterramento') || null,
    link_foto_estrutura_telhado: getLf('link_foto_estrutura_telhado') || null,
    link_foto_telhado: getLf('link_foto_telhado') || null,
    link_foto_print_mapa: getLf('link_foto_print_mapa') || null,
    link_foto_croqui: getLf('link_foto_croqui') || null,
    link_foto_relatorio_tecnico: getLf('link_foto_relatorio_tecnico') || null,
    observacao: getVt('observacao') || null,
  }
}

function slugChaveCampo(nome: string) {
  const base = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48)
  return `campo_${base || 'novo'}_${Date.now().toString(36)}`
}

/** Chaves padrão mapeiam para colunas em `vistorias` (fallback se ainda não houver linha em vistoria_campo_valores). */
const LEGACY_CAMPO_PARA_COLUNA_VISTORIA: Partial<Record<string, keyof Vistoria>> = {
  tipo_padrao: 'tipo_padrao',
  onde_ligado_inversor: 'onde_ligado_inversor',
  percurso_cabo_inversor: 'percurso_cabo_inversor',
  qtd_eletrodutos_inversor_cc: 'qtd_eletrodutos_inversor_cc',
  qtd_eletrodutos_inversor_ca: 'qtd_eletrodutos_inversor_ca',
  qtd_conduletes_inversor: 'qtd_conduletes_inversor',
  qtd_eletrodutos_padrao: 'qtd_eletrodutos_padrao',
  metragem_total_cabos_padrao: 'metragem_total_cabos_padrao',
  link_foto_fachada: 'link_foto_fachada',
  link_foto_padrao_entrada: 'link_foto_padrao_entrada',
  link_foto_disjuntor_padrao: 'link_foto_disjuntor_padrao',
  link_foto_poste_mais_proximo: 'link_foto_poste_mais_proximo',
  link_foto_ramal_entrada: 'link_foto_ramal_entrada',
  link_foto_local_inversor: 'link_foto_local_inversor',
  link_foto_aterramento: 'link_foto_aterramento',
  link_foto_estrutura_telhado: 'link_foto_estrutura_telhado',
  link_foto_telhado: 'link_foto_telhado',
  link_foto_print_mapa: 'link_foto_print_mapa',
  link_foto_croqui: 'link_foto_croqui',
  link_foto_relatorio_tecnico: 'link_foto_relatorio_tecnico',
  observacao: 'observacao',
}

function inferTipoCampoFromChave(chave: string, permitirFotos: boolean): TipoCampoVistoria {
  if (permitirFotos) return 'foto'
  if (
    chave === 'percurso_cabo_inversor' ||
    chave.startsWith('qtd_') ||
    chave === 'metragem_total_cabos_padrao'
  ) {
    return 'numero'
  }
  return 'texto'
}

function normalizarTipoCampo(c: VistoriaCampo): TipoCampoVistoria {
  const t = c.tipo_campo
  if (t === 'foto' || t === 'texto' || t === 'numero') return t
  return inferTipoCampoFromChave(c.chave, c.permitir_fotos)
}

function campoEhFoto(c: VistoriaCampo): boolean {
  return normalizarTipoCampo(c) === 'foto'
}

function rotuloTipoCampo(c: VistoriaCampo): string {
  const n = normalizarTipoCampo(c)
  if (n === 'foto') return 'Foto'
  if (n === 'numero') return 'Números'
  return 'Texto'
}

function preencherValoresLegadoVistoria(v: Vistoria, campos: VistoriaCampo[], vals: Record<number, ValorCampoEdicao>) {
  for (const c of campos) {
    const col = LEGACY_CAMPO_PARA_COLUNA_VISTORIA[c.chave]
    if (!col) continue
    const bruto = v[col]
    if (bruto === null || bruto === undefined || bruto === '') continue
    const atual = vals[c.id] ?? { valorTexto: '', linkFoto: '' }
    if (campoEhFoto(c)) {
      if (atual.linkFoto.trim()) continue
      vals[c.id] = { ...atual, linkFoto: String(bruto) }
    } else {
      if (atual.valorTexto.trim()) continue
      vals[c.id] = { ...atual, valorTexto: typeof bruto === 'number' ? String(bruto) : String(bruto) }
    }
  }
}

function ordemGruposCampos(campos: VistoriaCampo[]): string[] {
  const sorted = [...campos].sort((a, b) => a.ordem - b.ordem)
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of sorted) {
    if (!seen.has(c.grupo)) {
      seen.add(c.grupo)
      out.push(c.grupo)
    }
  }
  return out
}

function colClassCampoVistoria(c: VistoriaCampo): string {
  if (campoEhFoto(c)) return 'col-12 col-sm-6 col-lg-4 vistoria-foto-cell'
  if (c.chave === 'observacao') return 'col-12'
  if (c.chave === 'metragem_total_cabos_padrao') return 'col-12 col-lg-6'
  if (c.chave.startsWith('qtd_')) return 'col-6 col-md-4 col-lg-3'
  if (c.chave === 'percurso_cabo_inversor') return 'col-12 col-sm-6 col-md-4'
  return 'col-12 col-sm-6'
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
  const [camposVistoria, setCamposVistoria] = useState<VistoriaCampo[]>([])
  const [fotoEnviando, setFotoEnviando] = useState<string | null>(null)
  const [fotoNomeEnviando, setFotoNomeEnviando] = useState<string>('')
  const [fotoErroPorCampo, setFotoErroPorCampo] = useState<Record<string, string>>({})
  const [fotoPreviewTemp, setFotoPreviewTemp] = useState<Record<string, string>>({})
  const [modalConfirmarCancelarAberto, setModalConfirmarCancelarAberto] = useState(false)
  const [vistoriaDetalhe, setVistoriaDetalhe] = useState<Vistoria | null>(null)
  const [detalheValores, setDetalheValores] = useState<Record<number, ValorCampoEdicao> | null>(null)
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

  const opcoesGrupoConfig = useMemo(() => {
    const set = new Set<string>()
    for (const g of GRUPOS_PADRAO_VISTORIA) set.add(g)
    for (const c of camposVistoria) {
      const g = c.grupo?.trim()
      if (g) set.add(g)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [camposVistoria])

  const DELIM_MULTI_FOTO = '|||'
  const STATUS_COM_RELATORIO = ['Aprovado', 'Aprovado com obra']
  const podeAdministracao =
    user?.tipo_usuario === 'Administrador' || user?.tipo_usuario === 'Administrativo'

  const [modalExcluirVistoriaAberto, setModalExcluirVistoriaAberto] = useState(false)
  const [vistoriaParaExcluir, setVistoriaParaExcluir] = useState<Vistoria | null>(null)
  const [excluindoVistoria, setExcluindoVistoria] = useState(false)

  const [modalConfigCamposAberto, setModalConfigCamposAberto] = useState(false)
  const [configCampoNome, setConfigCampoNome] = useState('')
  const [configTipoCampo, setConfigTipoCampo] = useState<TipoCampoVistoria>('texto')
  const [configCampoMultiFoto, setConfigCampoMultiFotos] = useState(false)
  const [configCampoGrupo, setConfigCampoGrupo] = useState('Outros')
  const [configSalvando, setConfigSalvando] = useState(false)
  const [configEditandoId, setConfigEditandoId] = useState<number | null>(null)

  const grupoConfigNoDropdown = opcoesGrupoConfig.includes(configCampoGrupo.trim())
  const valorSelectGrupo = grupoConfigNoDropdown ? configCampoGrupo.trim() : VALOR_GRUPO_OUTRO

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

  async function carregarCamposVistoria() {
    const { data, error } = await supabase.from('vistoria_campos').select('*').order('ordem', { ascending: true })
    if (error) {
      console.error(error)
      return
    }
    setCamposVistoria(
      (data ?? []).map((row) => {
        const c = row as VistoriaCampo
        return { ...c, tipo_campo: normalizarTipoCampo(c) }
      })
    )
  }

  useEffect(() => {
    setCarregando(true)
    Promise.all([carregarVistorias(), carregarClientes(), carregarUsuarios(), carregarCamposVistoria()]).finally(() =>
      setCarregando(false)
    )
  }, [user?.id, user?.tipo_usuario])

  useEffect(() => {
    if (user?.tipo_usuario === 'Vistoriador' && !vistoriadorFiltroPadraoAplicado.current) {
      setFiltroStatus(['Novo', 'Em andamento'])
      vistoriadorFiltroPadraoAplicado.current = true
    }
  }, [user?.tipo_usuario])

  useEffect(() => {
    if (!vistoriaDetalhe) {
      setDetalheValores(null)
      return
    }
    let cancel = false
    ;(async () => {
      let campos = camposVistoria
      if (campos.length === 0) {
        const { data } = await supabase.from('vistoria_campos').select('*').order('ordem', { ascending: true })
        campos = (data ?? []) as VistoriaCampo[]
      }
      const { data: valRows } = await supabase
        .from('vistoria_campo_valores')
        .select('campo_id, valor_texto, link_foto')
        .eq('vistoria_id', vistoriaDetalhe.id)
      if (cancel) return
      const base = valoresVaziosPorCampos(campos)
      for (const row of valRows ?? []) {
        base[row.campo_id] = {
          valorTexto: row.valor_texto ?? '',
          linkFoto: row.link_foto ?? '',
        }
      }
      preencherValoresLegadoVistoria(vistoriaDetalhe, campos, base)
      setDetalheValores(base)
      if (campos.length > 0 && camposVistoria.length === 0) {
        setCamposVistoria(campos.map((c) => ({ ...c, tipo_campo: normalizarTipoCampo(c) })))
      }
    })()
    return () => {
      cancel = true
    }
  }, [vistoriaDetalhe, camposVistoria])

  async function abrirParaEdicao(v: Vistoria) {
    let campos = camposVistoria
    if (campos.length === 0) {
      const { data } = await supabase.from('vistoria_campos').select('*').order('ordem', { ascending: true })
      campos = (data ?? []) as VistoriaCampo[]
      setCamposVistoria(campos.map((c) => ({ ...c, tipo_campo: normalizarTipoCampo(c) })))
    }
    const valoresBase = valoresVaziosPorCampos(campos)
    const { data: valRows } = await supabase
      .from('vistoria_campo_valores')
      .select('campo_id, valor_texto, link_foto')
      .eq('vistoria_id', v.id)
    for (const row of valRows ?? []) {
      valoresBase[row.campo_id] = {
        valorTexto: row.valor_texto ?? '',
        linkFoto: row.link_foto ?? '',
      }
    }
    preencherValoresLegadoVistoria(v, campos, valoresBase)

    const { data: respData } = await supabase
      .from('vistoria_responsaveis')
      .select('id_usuario')
      .eq('vistoria_id', v.id)
    const idResponsaveis = (respData ?? []).map((r: { id_usuario: string }) => r.id_usuario)
    setForm({
      cpf_cliente: v.cpf_cliente ?? '',
      status: v.status,
      valoresPorCampo: valoresBase,
      id_responsaveis: idResponsaveis,
    })
    const cliente = clientes.find((c) => c.cpf === v.cpf_cliente)
    setClienteSearch(cliente ? `${cliente.nome ?? ''} — ${cliente.cpf}`.trim() : v.cpf_cliente)
    setVistoriaEmEdicaoId(v.id)
    setClienteDropdownOpen(false)
    setFotoErroPorCampo({})
    setFotoPreviewTemp((prev) => {
      Object.values(prev).forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
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

  function resetFormConfigCampo() {
    setConfigEditandoId(null)
    setConfigCampoNome('')
    setConfigTipoCampo('texto')
    setConfigCampoMultiFotos(false)
    setConfigCampoGrupo('Outros')
  }

  function fecharConfigCampos() {
    setModalConfigCamposAberto(false)
    resetFormConfigCampo()
  }

  function abrirEditorCampoExistente(c: VistoriaCampo) {
    setConfigEditandoId(c.id)
    setConfigCampoNome(c.nome_campo)
    setConfigTipoCampo(normalizarTipoCampo(c))
    setConfigCampoMultiFotos(c.permite_multiplas_fotos)
    setConfigCampoGrupo(c.grupo)
  }

  async function salvarCampoConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!configCampoNome.trim()) {
      setMensagem({ titulo: 'Campo obrigatório', texto: 'Informe o nome do campo.', tipo: 'erro' })
      setModalMensagemAberto(true)
      return
    }
    const grupoSalvar =
      valorSelectGrupo === VALOR_GRUPO_OUTRO ? configCampoGrupo.trim() : valorSelectGrupo
    if (valorSelectGrupo === VALOR_GRUPO_OUTRO && !grupoSalvar) {
      setMensagem({
        titulo: 'Grupo obrigatório',
        texto: 'Escolha um grupo na lista ou digite o nome da seção em “Outro”.',
        tipo: 'erro',
      })
      setModalMensagemAberto(true)
      return
    }
    setConfigSalvando(true)
    try {
      const maxOrdem = camposVistoria.length ? Math.max(...camposVistoria.map((c) => c.ordem)) : 0
      const permitirFotos = configTipoCampo === 'foto'
      if (configEditandoId != null) {
        const { error } = await supabase
          .from('vistoria_campos')
          .update({
            nome_campo: configCampoNome.trim(),
            tipo_campo: configTipoCampo,
            permitir_fotos: permitirFotos,
            permite_multiplas_fotos: permitirFotos ? configCampoMultiFoto : false,
            grupo: grupoSalvar,
          })
          .eq('id', configEditandoId)
        if (error) throw error
        if (!permitirFotos) {
          await supabase.from('vistoria_campo_valores').update({ link_foto: null }).eq('campo_id', configEditandoId)
        }
      } else {
        const { error } = await supabase.from('vistoria_campos').insert({
          chave: slugChaveCampo(configCampoNome),
          nome_campo: configCampoNome.trim(),
          tipo_campo: configTipoCampo,
          permitir_fotos: permitirFotos,
          permite_multiplas_fotos: permitirFotos ? configCampoMultiFoto : false,
          grupo: grupoSalvar,
          ordem: maxOrdem + 10,
        })
        if (error) throw error
      }
      await carregarCamposVistoria()
      setMensagem({ titulo: 'Sucesso', texto: 'Campo salvo.', tipo: 'sucesso' })
      setModalMensagemAberto(true)
      resetFormConfigCampo()
    } catch (err) {
      setMensagem({
        titulo: 'Erro',
        texto: err instanceof Error ? err.message : 'Não foi possível salvar o campo.',
        tipo: 'erro',
      })
      setModalMensagemAberto(true)
    } finally {
      setConfigSalvando(false)
    }
  }

  async function excluirCampoConfig(c: VistoriaCampo) {
    if (!window.confirm(`Excluir o campo "${c.nome_campo}"?`)) return
    try {
      const { error } = await supabase.from('vistoria_campos').delete().eq('id', c.id)
      if (error) throw error
      await carregarCamposVistoria()
      if (configEditandoId === c.id) resetFormConfigCampo()
      setMensagem({ titulo: 'Sucesso', texto: 'Campo excluído.', tipo: 'sucesso' })
      setModalMensagemAberto(true)
    } catch (err) {
      setMensagem({
        titulo: 'Erro',
        texto:
          err instanceof Error
            ? err.message
            : 'Não foi possível excluir (verifique se não há dados em vistorias para este campo).',
        tipo: 'erro',
      })
      setModalMensagemAberto(true)
    }
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
    if (!user) return
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

  function fotoKey(campoId: number) {
    return `c${campoId}`
  }

  async function handleFotoChange(campoId: number, file: File | null, clearPreview?: () => void) {
    const fk = fotoKey(campoId)
    setFotoErroPorCampo((prev) => ({ ...prev, [fk]: '' }))
    if (!file) {
      setForm((f) => ({
        ...f,
        valoresPorCampo: {
          ...f.valoresPorCampo,
          [campoId]: { ...f.valoresPorCampo[campoId], valorTexto: '', linkFoto: '' },
        },
      }))
      setFotoPreviewTemp((prev) => ({ ...prev, [fk]: '' }))
      return
    }
    if (!file.type.startsWith('image/')) {
      setFotoErroPorCampo((prev) => ({ ...prev, [fk]: 'Selecione uma imagem (JPG, PNG, etc.).' }))
      return
    }
    setFotoEnviando(fk)
    setFotoNomeEnviando(file.name)
    try {
      const path = `${user?.id ?? 'anon'}/${Date.now()}_c${campoId}_${sanitizeFileName(file.name)}`
      const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(path, file, {
        contentType: file.type,
        upsert: true,
      })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(path)
      setForm((f) => ({
        ...f,
        valoresPorCampo: {
          ...f.valoresPorCampo,
          [campoId]: { ...f.valoresPorCampo[campoId], valorTexto: '', linkFoto: publicUrl },
        },
      }))
      setFotoErroPorCampo((prev) => ({ ...prev, [fk]: '' }))
      clearPreview?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível enviar a foto.'
      setFotoErroPorCampo((prev) => ({ ...prev, [fk]: msg }))
      setMensagem({
        titulo: 'Erro no upload',
        texto:
          msg +
          ' Verifique no Supabase: Storage > bucket "Fotos_vistoria" existe e está público (ou com política de upload).',
        tipo: 'erro',
      })
      setModalMensagemAberto(true)
    } finally {
      setFotoEnviando(null)
      setFotoNomeEnviando('')
    }
  }

  async function handleFotoChangeMulti(campoId: number, files: FileList | null) {
    if (!files?.length) return
    const arquivos = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const fk = fotoKey(campoId)
    if (arquivos.length === 0) {
      setFotoErroPorCampo((prev) => ({ ...prev, [fk]: 'Selecione apenas imagens (JPG, PNG, etc.).' }))
      return
    }
    setFotoErroPorCampo((prev) => ({ ...prev, [fk]: '' }))
    setFotoEnviando(fk)
    setFotoNomeEnviando(`${arquivos.length} foto(s)`)
    const atual = form.valoresPorCampo[campoId]?.linkFoto ?? ''
    const urlsExistentes = atual.trim().split(DELIM_MULTI_FOTO).filter(Boolean)
    const novasUrls: string[] = []
    try {
      for (const file of arquivos) {
        const path = `${user?.id ?? 'anon'}/${Date.now()}_c${campoId}_${sanitizeFileName(file.name)}`
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
        valoresPorCampo: {
          ...f.valoresPorCampo,
          [campoId]: {
            ...f.valoresPorCampo[campoId],
            valorTexto: '',
            linkFoto: [...urlsExistentes, ...novasUrls].join(DELIM_MULTI_FOTO),
          },
        },
      }))
    } catch (e) {
      setFotoErroPorCampo((prev) => ({
        ...prev,
        [fk]: e instanceof Error ? e.message : 'Erro ao enviar as fotos.',
      }))
      setMensagem({
        titulo: 'Erro no upload',
        texto: e instanceof Error ? e.message : 'Erro ao enviar as fotos.',
        tipo: 'erro',
      })
      setModalMensagemAberto(true)
    } finally {
      setFotoEnviando(null)
      setFotoNomeEnviando('')
    }
  }

  function removerUmaFotoMulti(campoId: number, urlToRemove: string) {
    const atual = form.valoresPorCampo[campoId]?.linkFoto ?? ''
    const urls = atual.split(DELIM_MULTI_FOTO).filter((u) => u.trim() && u !== urlToRemove)
    setForm((f) => ({
      ...f,
      valoresPorCampo: {
        ...f.valoresPorCampo,
        [campoId]: { ...f.valoresPorCampo[campoId], valorTexto: '', linkFoto: urls.join(DELIM_MULTI_FOTO) },
      },
    }))
  }

  function toggleResponsavel(id: string) {
    setForm((f) => ({
      ...f,
      id_responsaveis: f.id_responsaveis.includes(id)
        ? f.id_responsaveis.filter((x) => x !== id)
        : [...f.id_responsaveis, id],
    }))
  }

  function valorTextoCampo(chave: string): string {
    const c = camposVistoria.find((x) => x.chave === chave)
    if (!c) return ''
    return form.valoresPorCampo[c.id]?.valorTexto?.trim() ?? ''
  }

  function validarObrigatorios(): string | null {
    if (!form.cpf_cliente.trim()) return 'Selecione o cliente (CPF).'
    if (!valorTextoCampo('tipo_padrao')) return 'Selecione o tipo do padrão.'
    if (!valorTextoCampo('onde_ligado_inversor')) return 'Selecione onde será ligado o inversor.'
    if (!valorTextoCampo('percurso_cabo_inversor')) return 'Preencha o percurso do cabo do inversor.'
    const qtdCc = valorTextoCampo('qtd_eletrodutos_inversor_cc')
    const qtdCa = valorTextoCampo('qtd_eletrodutos_inversor_ca')
    const qtdCond = valorTextoCampo('qtd_conduletes_inversor')
    const qtdPad = valorTextoCampo('qtd_eletrodutos_padrao')
    const metr = valorTextoCampo('metragem_total_cabos_padrao')
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
      const legado = montarPayloadVistoriasLegado(camposVistoria, form.valoresPorCampo)
      const payload = {
        cpf_cliente: form.cpf_cliente.trim(),
        status: form.status,
        ...legado,
      }

      async function persistirValoresCampos(vistoriaId: string) {
        const rows = camposVistoria.map((c) => {
          const v = form.valoresPorCampo[c.id] ?? { valorTexto: '', linkFoto: '' }
          if (campoEhFoto(c)) {
            return {
              vistoria_id: vistoriaId,
              campo_id: c.id,
              valor_texto: null as string | null,
              link_foto: v.linkFoto.trim() || null,
            }
          }
          return {
            vistoria_id: vistoriaId,
            campo_id: c.id,
            valor_texto: v.valorTexto.trim() || null,
            link_foto: null as string | null,
          }
        })
        const { error: errVal } = await supabase.from('vistoria_campo_valores').upsert(rows, {
          onConflict: 'vistoria_id,campo_id',
        })
        if (errVal) throw errVal
      }

      if (vistoriaEmEdicaoId) {
        const { error } = await supabase.from('vistorias').update(payload).eq('id', vistoriaEmEdicaoId)
        if (error) throw error
        await persistirValoresCampos(vistoriaEmEdicaoId)
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
        if (vistoriaId) {
          await persistirValoresCampos(vistoriaId)
        }
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

  function patchValorCampo(campoId: number, patch: Partial<ValorCampoEdicao>) {
    setForm((f) => ({
      ...f,
      valoresPorCampo: {
        ...f.valoresPorCampo,
        [campoId]: {
          valorTexto: f.valoresPorCampo[campoId]?.valorTexto ?? '',
          linkFoto: f.valoresPorCampo[campoId]?.linkFoto ?? '',
          ...patch,
        },
      },
    }))
  }

  function renderCampoDinamico(c: VistoriaCampo) {
    const v = form.valoresPorCampo[c.id] ?? { valorTexto: '', linkFoto: '' }
    const fk = fotoKey(c.id)
    const enviando = fotoEnviando === fk
    const valorLf = v.linkFoto?.trim() ?? ''
    const urlsMulti = valorLf ? valorLf.split(DELIM_MULTI_FOTO).filter(Boolean) : []
    const enviadaFoto = !enviando && (c.permite_multiplas_fotos ? urlsMulti.length > 0 : !!valorLf)
    const previewUrl = !c.permite_multiplas_fotos && (fotoPreviewTemp[fk] || valorLf)

    if (campoEhFoto(c) && c.permite_multiplas_fotos) {
      return (
        <>
          <label className="form-label">{c.nome_campo} (pode selecionar várias)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="form-control form-control-sm mb-1"
            disabled={enviando}
            onChange={(e) => {
              handleFotoChangeMulti(c.id, e.target.files)
              e.target.value = ''
            }}
          />
          {enviando && <span className="text-primary small d-block mb-1">{fotoNomeEnviando}</span>}
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
                    onClick={() => removerUmaFotoMulti(c.id, url)}
                    title="Remover esta foto"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="min-height-status-foto">
            {enviadaFoto && !enviando && (
              <span className="text-success small fw-medium">{urlsMulti.length} foto(s) carregada(s)</span>
            )}
            {!enviando && urlsMulti.length === 0 && !fotoErroPorCampo[fk] && (
              <span className="text-muted small">Nenhuma foto selecionada</span>
            )}
            {fotoErroPorCampo[fk] && (
              <span className="text-danger small" role="alert">
                Erro: {fotoErroPorCampo[fk]}
              </span>
            )}
          </div>
        </>
      )
    }

    if (campoEhFoto(c)) {
      return (
        <>
          <label className="form-label">{c.nome_campo}</label>
          <input
            type="file"
            accept="image/*"
            className="form-control form-control-sm mb-1"
            disabled={enviando}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const objectUrl = URL.createObjectURL(file)
                setFotoPreviewTemp((prev) => {
                  const old = prev[fk]
                  if (old) URL.revokeObjectURL(old)
                  return { ...prev, [fk]: objectUrl }
                })
                handleFotoChange(c.id, file, () => {
                  setFotoPreviewTemp((prev) => {
                    const url = prev[fk]
                    if (url) URL.revokeObjectURL(url)
                    const next = { ...prev }
                    delete next[fk]
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
                Enviando:{' '}
                {fotoNomeEnviando
                  ? fotoNomeEnviando.length > 25
                    ? fotoNomeEnviando.slice(0, 25) + '…'
                    : fotoNomeEnviando
                  : '…'}
              </span>
            )}
            {enviadaFoto && (
              <>
                <span className="text-success small fw-medium">✓ Foto carregada</span>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => {
                    patchValorCampo(c.id, { linkFoto: '', valorTexto: '' })
                    setFotoPreviewTemp((prev) => {
                      const url = prev[fk]
                      if (url) URL.revokeObjectURL(url)
                      const next = { ...prev }
                      delete next[fk]
                      return next
                    })
                  }}
                >
                  Remover
                </button>
              </>
            )}
            {!enviando && !enviadaFoto && !fotoErroPorCampo[fk] && (
              <span className="text-muted small">Nenhuma foto selecionada</span>
            )}
            {fotoErroPorCampo[fk] && (
              <span className="text-danger small" role="alert">
                Erro: {fotoErroPorCampo[fk]}
              </span>
            )}
          </div>
        </>
      )
    }

    if (c.chave === 'tipo_padrao') {
      return (
        <>
          <label className="form-label">Tipo do padrão *</label>
          <select
            className="form-select"
            value={v.valorTexto}
            onChange={(e) => patchValorCampo(c.id, { valorTexto: e.target.value })}
            required
          >
            <option value="">Selecione</option>
            {TIPO_PADRAO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </>
      )
    }

    if (c.chave === 'onde_ligado_inversor') {
      return (
        <>
          <label className="form-label">Onde será ligado o inversor *</label>
          <select
            className="form-select"
            value={v.valorTexto}
            onChange={(e) => patchValorCampo(c.id, { valorTexto: e.target.value })}
            required
          >
            <option value="">Selecione</option>
            {ONDE_LIGADO_INVERSOR.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </>
      )
    }

    if (c.chave === 'percurso_cabo_inversor') {
      return (
        <>
          <label className="form-label" title="Percurso do cabo do inversor até o padrão ou caixa de passagem">
            Percurso cabo inversor (m) *
          </label>
          <input
            type="number"
            min={0}
            step={1}
            className="form-control"
            value={v.valorTexto}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || /^\d+$/.test(val)) patchValorCampo(c.id, { valorTexto: val })
            }}
            placeholder="Metros (inteiro)"
            required
          />
        </>
      )
    }

    if (c.chave.startsWith('qtd_')) {
      return (
        <>
          <label className="form-label text-nowrap">{c.nome_campo} *</label>
          <input
            type="number"
            min={0}
            className="form-control"
            value={v.valorTexto}
            onChange={(e) => patchValorCampo(c.id, { valorTexto: e.target.value })}
          />
        </>
      )
    }

    if (c.chave === 'metragem_total_cabos_padrao') {
      return (
        <>
          <label className="form-label">Metragem total cabos padrão (m) *</label>
          <input
            type="number"
            min={0}
            step={0.01}
            className="form-control"
            value={v.valorTexto}
            onChange={(e) => patchValorCampo(c.id, { valorTexto: e.target.value })}
          />
        </>
      )
    }

    if (c.chave === 'observacao') {
      return (
        <>
          <label className="form-label" htmlFor={`vistoria-observacao-${c.id}`}>
            {c.nome_campo}
          </label>
          <textarea
            id={`vistoria-observacao-${c.id}`}
            className="form-control"
            rows={3}
            placeholder="Anotações gerais sobre a vistoria (opcional)"
            value={v.valorTexto}
            onChange={(e) => patchValorCampo(c.id, { valorTexto: e.target.value })}
          />
        </>
      )
    }

    if (c.chave.startsWith('campo_') && normalizarTipoCampo(c) === 'numero') {
      return (
        <>
          <label className="form-label">{c.nome_campo}</label>
          <input
            type="number"
            className="form-control"
            value={v.valorTexto}
            onChange={(e) => patchValorCampo(c.id, { valorTexto: e.target.value })}
          />
        </>
      )
    }

    return (
      <>
        <label className="form-label">{c.nome_campo}</label>
        <input
          type="text"
          className="form-control"
          value={v.valorTexto}
          onChange={(e) => patchValorCampo(c.id, { valorTexto: e.target.value })}
        />
      </>
    )
  }

  function solicitarExclusaoVistoria(v: Vistoria) {
    setVistoriaParaExcluir(v)
    setModalExcluirVistoriaAberto(true)
  }

  async function executarExclusaoVistoria() {
    if (!vistoriaParaExcluir) return
    setExcluindoVistoria(true)
    try {
      const { error } = await supabase.from('vistorias').delete().eq('id', vistoriaParaExcluir.id)
      if (error) throw error
      if (vistoriaDetalhe?.id === vistoriaParaExcluir.id) {
        setVistoriaDetalhe(null)
        setDetalheValores(null)
      }
      if (vistoriaEmEdicaoId === vistoriaParaExcluir.id) {
        fecharModal()
      }
      setMensagem({ titulo: 'Sucesso', texto: 'Vistoria excluída.', tipo: 'sucesso' })
      setModalMensagemAberto(true)
      await carregarVistorias()
    } catch (e) {
      setMensagem({
        titulo: 'Erro',
        texto: e instanceof Error ? e.message : 'Não foi possível excluir a vistoria.',
        tipo: 'erro',
      })
      setModalMensagemAberto(true)
    } finally {
      setExcluindoVistoria(false)
    }
  }

  async function gerarRelatorioPdf(v: Vistoria) {
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

    let campos = camposVistoria
    if (campos.length === 0) {
      const { data } = await supabase.from('vistoria_campos').select('*').order('ordem', { ascending: true })
      campos = (data ?? []) as VistoriaCampo[]
    }
    const { data: valRows } = await supabase
      .from('vistoria_campo_valores')
      .select('campo_id, valor_texto, link_foto')
      .eq('vistoria_id', v.id)
    const vals = valoresVaziosPorCampos(campos)
    for (const row of valRows ?? []) {
      vals[row.campo_id] = {
        valorTexto: row.valor_texto ?? '',
        linkFoto: row.link_foto ?? '',
      }
    }
    preencherValoresLegadoVistoria(v, campos, vals)
    const legado = montarPayloadVistoriasLegado(campos, vals)

    const fotosHtml = campos
      .filter((c) => campoEhFoto(c))
      .sort((a, b) => a.ordem - b.ordem)
      .map((c) => {
        const val = vals[c.id]?.linkFoto
        const urls = val?.trim() ? val.split(DELIM_MULTI_FOTO).filter(Boolean) : []
        const label = c.nome_campo.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        if (urls.length === 0) return `<p><strong>${label}:</strong> —</p>`
        return `<p><strong>${label}:</strong><br/><div style="text-align:center;">${urls.map((u) => `<img src="${u}" alt="" style="max-width:200px;max-height:150px;margin:4px;" />`).join(' ')}</div></p>`
      })
      .join('')

    const escRel = (s: string) =>
      String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const extrasLinhas = campos
      .filter((c) => !campoEhFoto(c) && !LEGACY_CAMPO_PARA_COLUNA_VISTORIA[c.chave])
      .sort((a, b) => a.ordem - b.ordem)
      .map((c) => {
        const t = vals[c.id]?.valorTexto?.trim()
        if (!t) return ''
        return `<tr><th>${escRel(c.nome_campo)}</th><td>${escRel(t)}</td></tr>`
      })
      .filter(Boolean)
      .join('')
    const extrasSecao = extrasLinhas ? `<h2>Outros campos</h2><table>${extrasLinhas}</table>` : ''

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
    <tr><th>Tipo do padrão</th><td>${legado.tipo_padrao ?? '—'}</td></tr>
    <tr><th>Onde ligado o inversor</th><td>${legado.onde_ligado_inversor ?? '—'}</td></tr>
    <tr><th>Percurso cabo inversor (m)</th><td>${legado.percurso_cabo_inversor ?? '—'}</td></tr>
  </table>

  <h2>Eletrodutos e cabos</h2>
  <table>
    <tr><th>Qtd. eletrod. inv. CC</th><td>${legado.qtd_eletrodutos_inversor_cc ?? '—'}</td></tr>
    <tr><th>Qtd. eletrod. inv. CA</th><td>${legado.qtd_eletrodutos_inversor_ca ?? '—'}</td></tr>
    <tr><th>Qtd. conduletes inv.</th><td>${legado.qtd_conduletes_inversor ?? '—'}</td></tr>
    <tr><th>Qtd. eletrod. padrão</th><td>${legado.qtd_eletrodutos_padrao ?? '—'}</td></tr>
    <tr><th>Metragem cabos padrão (m)</th><td>${legado.metragem_total_cabos_padrao ?? '—'}</td></tr>
  </table>

  <h2>Fotos</h2>
  ${fotosHtml}

  ${extrasSecao}

  ${(legado.observacao ?? '').trim() ? `<h2>Observação</h2><div class="observacao">${String(legado.observacao).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}

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
        <section className="card">
          <div className="card-header-row">
            <h2>Lista de vistorias</h2>
            {podeAdministracao && (
              <>
                <button
                  type="button"
                  className="btn btn-outline-primary me-2"
                  onClick={() => {
                    resetFormConfigCampo()
                    setModalConfigCamposAberto(true)
                  }}
                >
                  Campos da vistoria
                </button>
                <button type="button" className="btn btn-primary" onClick={abrirAgendar}>
                  Agendar Vistoria
                </button>
              </>
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
              <div className="col-12 col-sm-6 col-md-2">
                <label className="form-label small mb-1">Data início</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                />
              </div>
              <div className="col-12 col-sm-6 col-md-2">
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
                        <div className="d-inline-flex flex-wrap gap-1 justify-content-center align-items-center">
                          {STATUS_COM_RELATORIO.includes(v.status) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger p-1"
                              onClick={() => {
                                void gerarRelatorioPdf(v)
                              }}
                              title="Gerar relatório em PDF"
                              aria-label="Gerar relatório em PDF"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zm0 12H8v-2h5v2zm0-4H8v-2h5v2zm0-4H8v-2h5v2z"/>
                              </svg>
                            </button>
                          )}
                          {podeAdministracao && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary p-1"
                              onClick={() => solicitarExclusaoVistoria(v)}
                              title="Excluir vistoria"
                              aria-label="Excluir vistoria"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6V1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    )
                  })}
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

            {ordemGruposCampos(camposVistoria).map((grupo) => (
              <section key={grupo} className="vistoria-section mb-3 mb-md-4">
                <h6 className="vistoria-section-title">
                  {grupo}
                  {grupo === 'Eletrodutos e cabos' ? ' *' : ''}
                </h6>
                <div className="row g-2 g-md-3 align-items-end">
                  {camposVistoria
                    .filter((c) => c.grupo === grupo)
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((c) => (
                      <div key={c.id} className={colClassCampoVistoria(c)}>
                        {renderCampoDinamico(c)}
                      </div>
                    ))}
                </div>
              </section>
            ))}

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
        scrollable
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
        onHide={() => {
          setVistoriaDetalhe(null)
          setDetalheValores(null)
        }}
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

              {!detalheValores ? (
                <p className="text-muted small">Carregando campos…</p>
              ) : (
                <>
                  {ordemGruposCampos(camposVistoria).map((grupo) => {
                    const list = camposVistoria
                      .filter((c) => c.grupo === grupo)
                      .sort((a, b) => a.ordem - b.ordem)
                    if (list.length === 0) return null
                    if (grupo === 'Fotos') {
                      return (
                        <section key={grupo} className="vistoria-section mb-3 mb-md-4">
                          <h6 className="vistoria-section-title">Fotos</h6>
                          <div className="row g-2 g-md-3">
                            {list.map((c) => {
                              const val = detalheValores[c.id]?.linkFoto
                              const urls = val?.trim() ? val.split(DELIM_MULTI_FOTO).filter(Boolean) : []
                              const label = c.nome_campo
                              if (urls.length === 0) {
                                return (
                                  <div className="col-6 col-md-4 col-lg-3" key={c.id}>
                                    <div className="small text-secondary mb-1">{label}</div>
                                    <span className="text-muted small">—</span>
                                  </div>
                                )
                              }
                              return (
                                <div className="col-6 col-md-4 col-lg-3" key={c.id}>
                                  <div className="small text-secondary mb-1">{label}</div>
                                  <div className="d-flex flex-wrap gap-1">
                                    {urls.map((url) => (
                                      <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="d-inline-block">
                                        <img
                                          src={url}
                                          alt={label}
                                          className="rounded border"
                                          style={{ maxHeight: 80, maxWidth: 80, objectFit: 'cover' }}
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </section>
                      )
                    }
                    if (grupo === 'Observação') {
                      const obs = list[0]
                      const txt = obs ? detalheValores[obs.id]?.valorTexto?.trim() ?? '' : ''
                      if (!txt) return null
                      return (
                        <section key={grupo} className="vistoria-section mb-0">
                          <h6 className="vistoria-section-title">Observação</h6>
                          <p className="small mb-0 text-break">{txt}</p>
                        </section>
                      )
                    }
                    return (
                      <section key={grupo} className="vistoria-section mb-3 mb-md-4">
                        <h6 className="vistoria-section-title">{grupo}</h6>
                        <dl className="row g-2 mb-0 small">
                          {list
                            .filter((c) => !campoEhFoto(c))
                            .map((c) => (
                              <div className="row w-100 m-0" key={c.id}>
                                <dt className="col-sm-4 text-secondary">{c.nome_campo}</dt>
                                <dd className="col-sm-8">{detalheValores[c.id]?.valorTexto?.trim() || '—'}</dd>
                              </div>
                            ))}
                        </dl>
                      </section>
                    )
                  })}
                </>
              )}
            </>
            )
          })()}
        </BSModal.Body>
        <BSModal.Footer>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setVistoriaDetalhe(null)
              setDetalheValores(null)
            }}
          >
            Fechar
          </button>
        </BSModal.Footer>
      </BSModal>

      <BSModal show={modalConfigCamposAberto} onHide={fecharConfigCampos} size="lg" centered scrollable className="vistoria-modal">
        <form onSubmit={salvarCampoConfig}>
          <BSModal.Header closeButton>
            <BSModal.Title className="h5 mb-0">Campos da vistoria</BSModal.Title>
          </BSModal.Header>
          <BSModal.Body className="modal-body-scroll py-3 py-md-4">
            <p className="small text-muted mb-3">
              Defina quais campos aparecem no modal Editar vistoria. Escolha o tipo: <strong>Foto</strong> (arquivos em{' '}
              <code>link_foto</code>), <strong>Texto</strong> ou <strong>Números</strong> (valores em{' '}
              <code>valor_texto</code>).
            </p>
            <div className="table-responsive mb-4">
              <table className="table table-sm table-striped align-middle">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Grupo</th>
                    <th>Tipo</th>
                    <th>Múltiplas</th>
                    <th className="text-end">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {[...camposVistoria]
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((c) => (
                      <tr key={c.id}>
                        <td>{c.nome_campo}</td>
                        <td className="small">{c.grupo}</td>
                        <td>{rotuloTipoCampo(c)}</td>
                        <td>{campoEhFoto(c) && c.permite_multiplas_fotos ? 'Sim' : '—'}</td>
                        <td className="text-end text-nowrap">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => abrirEditorCampoExistente(c)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => excluirCampoConfig(c)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {camposVistoria.length === 0 && <p className="text-muted small mb-0">Nenhum campo cadastrado.</p>}
            </div>
            <h6 className="vistoria-section-title mb-3">{configEditandoId != null ? 'Editar campo' : 'Novo campo'}</h6>
            <div className="row g-2 g-md-3">
              <div className="col-12">
                <label className="form-label">Nome do campo *</label>
                <input
                  type="text"
                  className="form-control"
                  value={configCampoNome}
                  onChange={(e) => setConfigCampoNome(e.target.value)}
                  placeholder="Ex.: Foto do medidor"
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label">Tipo do campo *</label>
                <select
                  className="form-select"
                  value={configTipoCampo}
                  onChange={(e) => {
                    const v = e.target.value as TipoCampoVistoria
                    setConfigTipoCampo(v)
                    if (v !== 'foto') setConfigCampoMultiFotos(false)
                  }}
                >
                  <option value="foto">Foto</option>
                  <option value="texto">Texto</option>
                  <option value="numero">Números</option>
                </select>
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label" htmlFor="cfg-grupo-vistoria">
                  Grupo (seção no formulário)
                </label>
                <select
                  id="cfg-grupo-vistoria"
                  className="form-select"
                  value={valorSelectGrupo}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === VALOR_GRUPO_OUTRO) setConfigCampoGrupo('')
                    else setConfigCampoGrupo(v)
                  }}
                >
                  {opcoesGrupoConfig.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value={VALOR_GRUPO_OUTRO}>Outro (digite abaixo)…</option>
                </select>
                {valorSelectGrupo === VALOR_GRUPO_OUTRO && (
                  <input
                    type="text"
                    className="form-control mt-2"
                    value={configCampoGrupo}
                    onChange={(e) => setConfigCampoGrupo(e.target.value)}
                    placeholder="Nome da seção"
                    aria-label="Nome personalizado da seção"
                  />
                )}
              </div>
              {configTipoCampo === 'foto' && (
                <div className="col-12">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="cfg-multi-fotos"
                      checked={configCampoMultiFoto}
                      onChange={(e) => setConfigCampoMultiFotos(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="cfg-multi-fotos">
                      Permitir várias fotos neste campo
                    </label>
                  </div>
                </div>
              )}
            </div>
          </BSModal.Body>
          <BSModal.Footer className="flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                resetFormConfigCampo()
              }}
            >
              Limpar formulário
            </button>
            <button type="button" className="btn btn-secondary" onClick={fecharConfigCampos}>
              Fechar
            </button>
            <button type="submit" className="btn btn-primary" disabled={configSalvando}>
              {configSalvando ? 'Salvando…' : 'Salvar campo'}
            </button>
          </BSModal.Footer>
        </form>
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

      <ModalConfirmar
        aberto={modalExcluirVistoriaAberto}
        onFechar={() => {
          if (!excluindoVistoria) {
            setModalExcluirVistoriaAberto(false)
            setVistoriaParaExcluir(null)
          }
        }}
        titulo="Excluir vistoria?"
        mensagem={
          vistoriaParaExcluir
            ? `Confirma excluir esta vistoria (CPF ${vistoriaParaExcluir.cpf_cliente})? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmarTexto="Excluir"
        cancelarTexto="Cancelar"
        emConfirmacao={excluindoVistoria}
        onConfirmar={executarExclusaoVistoria}
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
