import type { TipoCampoVistoria, ValorCampoEdicao } from './vistoria'

export const STATUS_INSTALACAO = ['Novo', 'Em andamento', 'Concluído', 'Cancelado'] as const
export type StatusInstalacao = (typeof STATUS_INSTALACAO)[number]

export type Instalacao = {
  id: string
  cpf_cliente: string
  id_usuario: string
  data_criacao: string
  status: StatusInstalacao
}

/** Configuração de campo dinâmico (tabela instalacao_campos). */
export type InstalacaoCampo = {
  id: number
  chave: string
  nome_campo: string
  tipo_campo?: TipoCampoVistoria
  permitir_fotos: boolean
  permite_multiplas_fotos: boolean
  ordem: number
  grupo: string
}

export type InstalacaoForm = {
  cpf_cliente: string
  status: StatusInstalacao
  valoresPorCampo: Record<number, ValorCampoEdicao>
  id_responsaveis: string[]
}
