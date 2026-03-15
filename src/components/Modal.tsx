import { useEffect } from 'react'

type ModalProps = {
  aberto: boolean
  onFechar: () => void
  titulo: string
  children: React.ReactNode
  rodape?: React.ReactNode
}

export function Modal({ aberto, onFechar, titulo, children, rodape }: ModalProps) {
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    if (aberto) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div className="modal-overlay" onClick={onFechar} role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-titulo" className="modal-titulo">{titulo}</h2>
          <button type="button" className="modal-fechar" onClick={onFechar} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {rodape && <div className="modal-footer">{rodape}</div>}
      </div>
    </div>
  )
}

type ModalConfirmarProps = {
  aberto: boolean
  onFechar: () => void
  titulo: string
  mensagem: string
  confirmarTexto?: string
  cancelarTexto?: string
  emConfirmacao?: boolean
  onConfirmar: () => void | Promise<void>
}

export function ModalConfirmar({
  aberto,
  onFechar,
  titulo,
  mensagem,
  confirmarTexto = 'Confirmar',
  cancelarTexto = 'Cancelar',
  emConfirmacao = false,
  onConfirmar,
}: ModalConfirmarProps) {
  async function handleConfirmar() {
    await onConfirmar()
    onFechar()
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={titulo}
      rodape={
        <div className="modal-botoes">
          <button type="button" className="btn btn-secondary" onClick={onFechar} disabled={emConfirmacao}>
            {cancelarTexto}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirmar} disabled={emConfirmacao}>
            {emConfirmacao ? 'Aguarde…' : confirmarTexto}
          </button>
        </div>
      }
    >
      <p className="modal-mensagem">{mensagem}</p>
    </Modal>
  )
}

type ModalMensagemProps = {
  aberto: boolean
  onFechar: () => void
  titulo: string
  mensagem: string
  tipo?: 'sucesso' | 'erro' | 'info'
}

export function ModalMensagem({ aberto, onFechar, titulo, mensagem, tipo = 'info' }: ModalMensagemProps) {
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={titulo}
      rodape={
        <button type="button" className="btn btn-primary" onClick={onFechar}>
          OK
        </button>
      }
    >
      <p className={`modal-mensagem modal-mensagem--${tipo}`}>{mensagem}</p>
    </Modal>
  )
}
