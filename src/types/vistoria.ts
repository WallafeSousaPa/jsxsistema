export const STATUS_VISTORIA = ['Novo', 'Em andamento', 'Aprovado', 'Aprovado com obra', 'Cancelado'] as const
export const TIPO_PADRAO = ['monofásico', 'bifásico', 'trifásico'] as const
export const ONDE_LIGADO_INVERSOR = ['quadro do cliente', 'caixa de passagem', 'padrão de entrada'] as const

export type StatusVistoria = (typeof STATUS_VISTORIA)[number]
export type TipoPadrao = (typeof TIPO_PADRAO)[number]
export type OndeLigadoInversor = (typeof ONDE_LIGADO_INVERSOR)[number]

export type Vistoria = {
  id: string
  cpf_cliente: string
  id_usuario: string
  data_criacao: string
  status: StatusVistoria
  tipo_padrao: TipoPadrao | null
  onde_ligado_inversor: string | null
  percurso_cabo_inversor: string | null
  qtd_eletrodutos_inversor_cc: number | null
  qtd_eletrodutos_inversor_ca: number | null
  qtd_conduletes_inversor: number | null
  qtd_eletrodutos_padrao: number | null
  metragem_total_cabos_padrao: number | null
  link_foto_fachada: string | null
  link_foto_padrao_entrada: string | null
  link_foto_disjuntor_padrao: string | null
  link_foto_poste_mais_proximo: string | null
  link_foto_ramal_entrada: string | null
  link_foto_local_inversor: string | null
  link_foto_aterramento: string | null
  link_foto_estrutura_telhado: string | null
  link_foto_telhado: string | null
  link_foto_print_mapa: string | null
  link_foto_croqui: string | null
  link_foto_relatorio_tecnico: string | null
  observacao: string | null
}

/** Tipo de entrada do campo (definido em Campos da vistoria). */
export const TIPO_CAMPO_VISTORIA = ['foto', 'texto', 'numero'] as const
export type TipoCampoVistoria = (typeof TIPO_CAMPO_VISTORIA)[number]

/** Configuração de campo dinâmico (tabela vistoria_campos). */
export type VistoriaCampo = {
  id: number
  chave: string
  nome_campo: string
  /** Preferir `tipo_campo`; `permitir_fotos` permanece sincronizado (foto = true). */
  tipo_campo?: TipoCampoVistoria
  permitir_fotos: boolean
  permite_multiplas_fotos: boolean
  ordem: number
  grupo: string
}

/** Valor por campo na edição (tabela vistoria_campo_valores). */
export type ValorCampoEdicao = {
  valorTexto: string
  linkFoto: string
}

export type VistoriaForm = {
  cpf_cliente: string
  status: StatusVistoria
  /** id do campo → texto ou link(s) conforme permitir_fotos */
  valoresPorCampo: Record<number, ValorCampoEdicao>
  id_responsaveis: string[]
}
