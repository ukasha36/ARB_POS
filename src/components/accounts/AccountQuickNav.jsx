import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function AccountQuickNav({ onNavigate, onSearch, currentCode }) {
  const { currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(searchTerm);
  };

  const usernameDisplay = currentUser?.displayName || 'ARB Communication';

  return (
    <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-3 py-1 flex items-center justify-between text-xs select-none">
      {/* Navigation Buttons + Search Form */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-0.5 border border-[#BFDBFE] rounded-[3px] bg-white p-0.5 shadow-2xs">
          <button
            type="button"
            title="First Record"
            onClick={() => onNavigate('first')}
            className="p-1 hover:bg-[#DBEAFE] text-[#1E40AF] rounded transition-colors"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Previous Record"
            onClick={() => onNavigate('prev')}
            className="p-1 hover:bg-[#DBEAFE] text-[#1E40AF] rounded transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Next Record"
            onClick={() => onNavigate('next')}
            className="p-1 hover:bg-[#DBEAFE] text-[#1E40AF] rounded transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Last Record"
            onClick={() => onNavigate('last')}
            className="p-1 hover:bg-[#DBEAFE] text-[#1E40AF] rounded transition-colors"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="text-[#94A3B8] font-mono mx-1">|</span>

        {/* Quick Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
          <label className="text-[11px] font-bold text-[#1E40AF] uppercase tracking-wider">
            Search:
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Code, Title, Short Name, Tel..."
            className="w-48 px-2 py-0.5 text-xs bg-white text-[#0F172A] border border-[#BFDBFE] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
          />
          <button
            type="submit"
            className="px-2 py-0.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-bold rounded-[3px] transition-colors flex items-center gap-1"
          >
            <Search className="w-3 h-3" />
            GO
          </button>
        </form>
      </div>

      {/* Logged in User indicator */}
      <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#1E40AF]">
        <User className="w-3.5 h-3.5 text-[#2563EB]" />
        <span>{usernameDisplay}</span>
      </div>
    </div>
  );
}
