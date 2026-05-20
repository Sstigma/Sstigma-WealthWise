import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({
  title,
  onClose,
  children,
  width = 'max-w-lg',
  centerInContent = false,
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      className={`fixed inset-y-0 right-0 z-50 flex items-center justify-center p-4 ${
        centerInContent ? 'left-0 md:left-56' : 'left-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`relative w-full ${width} max-h-[calc(100vh-2rem)] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
