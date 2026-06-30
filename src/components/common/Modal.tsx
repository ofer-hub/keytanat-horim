import React, { useEffect } from 'react';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: string;
}

export default function Modal({ onClose, children, title, maxWidth = '560px' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth }}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              aria-label="סגור"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
