import { FormModal } from './FormModal.jsx';

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  confirmButtonClassName = 'primary-button',
  onConfirm,
  onClose,
  isConfirming = false
}) {
  return (
    <FormModal
      footer={
        <>
          <button className="secondary-button" onClick={onClose} type="button">
            {cancelLabel}
          </button>
          <button className={confirmButtonClassName} disabled={isConfirming} onClick={onConfirm} type="button">
            {isConfirming ? 'Processing...' : confirmLabel}
          </button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <p className="muted">{message}</p>
    </FormModal>
  );
}
