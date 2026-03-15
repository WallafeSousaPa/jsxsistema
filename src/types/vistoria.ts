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

export type VistoriaForm = {
  cpf_cliente: string
  status: StatusVistoria
  tipo_padrao: string
  onde_ligado_inversor: string
  percurso_cabo_inversor: string
  qtd_eletrodutos_inversor_cc: string
  qtd_eletrodutos_inversor_ca: string
  qtd_conduletes_inversor: string
  qtd_eletrodutos_padrao: string
  metragem_total_cabos_padrao: string
  link_foto_fachada: string
  link_foto_padrao_entrada: string
  link_foto_disjuntor_padrao: string
  link_foto_poste_mais_proximo: string
  link_foto_ramal_entrada: string
  link_foto_local_inversor: string
  link_foto_aterramento: string
  link_foto_estrutura_telhado: string
  link_foto_telhado: string
  link_foto_print_mapa: string
  link_foto_croqui: string
  link_foto_relatorio_tecnico: string
  observacao: string
  id_responsaveis: string[]
}
