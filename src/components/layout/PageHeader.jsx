import React from 'react';
import { useNavigationStore } from '../../store/useNavigationStore';

export function PageHeader({ actionButtons }) {
  const { activeModuleTitle, activeCategory } = useNavigationStore();

  return (
    <div className="bg-white px-4 py-2 border-b border-[#E2E8F0] flex items-center justify-between select-none">
      <div>
        <div className="text-[10px] font-bold text-[#2563EB] tracking-wider uppercase">
          {activeCategory}
        </div>
        <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          {activeModuleTitle}
        </h2>
      </div>
      {actionButtons && <div className="flex items-center gap-2">{actionButtons}</div>}
    </div>
  );
}
