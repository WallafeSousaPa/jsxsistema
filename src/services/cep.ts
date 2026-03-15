/**
 * Resposta da API ViaCEP (https://viacep.com.br)
 */
export type ViaCepResponse = {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

/**
 * Busca endereço pelo CEP e retorna dados para preencher o formulário.
 * Campos: logradouro, bairro, cidade (localidade), estado (uf).
 */
export async function buscarCep(cep: string): Promise<{
  ok: boolean
  logradouro?: string
  bairro?: string
  cidade?: string
  estado?: string
  mensagem?: string
}> {
  const apenasNumeros = cep.replace(/\D/g, '')
  if (apenasNumeros.length !== 8) {
    return { ok: false, mensagem: 'CEP deve ter 8 dígitos.' }
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${apenasNumeros}/json/`)
    const data = (await res.json()) as ViaCepResponse

    if (data.erro) {
      return { ok: false, mensagem: 'CEP não encontrado.' }
    }

    return {
      ok: true,
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
    }
  } catch {
    return { ok: false, mensagem: 'Erro ao buscar CEP. Tente novamente.' }
  }
}
