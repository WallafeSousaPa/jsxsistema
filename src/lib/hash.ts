/**
 * Gera hash SHA-256 da senha para comparação com o armazenado em usuarios.senha_hash.
 * O banco deve armazenar o hash em minúsculo (hex).
 */
export async function hashSenha(senha: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(senha)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hex
}
