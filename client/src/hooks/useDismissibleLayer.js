import { useEffect } from 'react';

export function useDismissibleLayer({ ref, isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }

      onClose();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, ref]);
}
