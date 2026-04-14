import { useEffect } from 'react';

export function FormModal({ title, children, onClose, footer, isOpen, hideHeader = false, cardClassName = '' }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-modal="true"
        aria-label={hideHeader ? title : undefined}
        className={`modal-card${cardClassName ? ` ${cardClassName}` : ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {!hideHeader ? (
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="modal-close" onClick={onClose} type="button">
              x
            </button>
          </div>
        ) : null}
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-actions">{footer}</div> : null}
      </section>
    </div>
  );
}
