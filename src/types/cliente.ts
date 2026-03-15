export type Cliente = {
  id: string
  cpf: string
  nome: string
  telefone: string | null
  email: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  criado_em?: string
}

export type ClienteForm = {
  nome: string
  cpf: string
  telefone: string
  email: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

export type KitSolar = {
  id: string
  cpf_cliente: string
  marca_inversor: string | null
  modelo_inversor: string | null
  quantidade_inversor: number | null
  marca_painel: string | null
  modelo_painel: string | null
  quantidade_painel: number | null
  criado_em?: string
}

export type KitSolarForm = {
  marca_inversor: string
  modelo_inversor: string
  quantidade_inversor: string
  marca_painel: string
  modelo_painel: string
  quantidade_painel: string
}

/** Linha na tabela temporária de kits (idTemp para key no React e remoção) */
export type KitLinha = KitSolarForm & { idTemp: string }
