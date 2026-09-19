import React from 'react';

export function Card({
  title,
  subtitle,
  children,
  headerAction,
  className = '',
  bodyClassName = '',
}) {
  return (
    <div className={`bg-white border border-[#E2E8F0] rounded-[4px] shadow-none flex flex-col overflow-hidden ${className}`}>
      {(title || headerAction) && (
        <div className="bg-[#F8FAFC] px-3 py-2 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            {title && <h4 className="text-xs font-semibold text-[#0F172A]">{title}</h4>}
            {subtitle && <p className="text-[11px] text-[#64748B]">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={`p-3 flex-1 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
