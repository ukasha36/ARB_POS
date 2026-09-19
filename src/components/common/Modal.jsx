import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-md',
  showClose = true,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px]">
      <div className={`bg-white rounded-[4px] border border-[#CBD5E1] shadow-lg w-full ${width} overflow-hidden flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="bg-[#EFF6FF] px-4 py-2.5 border-b border-[#BFDBFE] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1E40AF] tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
            {title}
          </h3>
          {showClose && (
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A] hover:bg-[#DBEAFE] p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto text-xs text-[#0F172A] flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="bg-[#F8FAFC] px-4 py-2 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
