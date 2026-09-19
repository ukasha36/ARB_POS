import React, { useState, useEffect } from 'react';
import { User, UserCog, Database, Clock, Calendar, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';

export function StatusBar() {
  const { currentUser, setEditProfileOpen } = useAuthStore();
  const [dbInfo, setDbInfo] = useState({ status: 'Local', mode: 'WAL' });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Clock interval
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch DB status from main process
    api.db.getStatus().then((res) => {
      if (res.success) {
        setDbInfo(res);
      }
    });
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const usernameDisplay = currentUser?.displayName || 'ARB Communication';

  return (
    <footer className="bg-[#1E293B] text-white px-3 py-1 text-[11px] font-mono flex items-center justify-between border-t border-[#0F172A] select-none z-20">
      {/* Left section: Logged in user & DB info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[#38BDF8] font-bold">
            <User className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>{usernameDisplay}</span>
          </div>
          <button
            onClick={() => setEditProfileOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#334155] hover:bg-[#2563EB] text-[#E2E8F0] hover:text-white transition-colors text-[10px] font-sans font-semibold cursor-pointer"
            title="Edit User Name, Username, and Password"
          >
            <UserCog className="w-3 h-3 text-[#38BDF8]" />
            <span>Edit Profile</span>
          </button>
        </div>

        <span className="text-[#475569]">|</span>

        <div className="flex items-center gap-1.5 text-[#94A3B8]">
          <Database className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>Database: <strong className="text-white font-normal">{dbInfo.status} ({dbInfo.mode || 'WAL'})</strong></span>
        </div>

        <span className="text-[#475569]">|</span>

        <div className="flex items-center gap-1 text-[#22C55E] font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Ready</span>
        </div>
      </div>

      {/* Right section: System Date & Live Clock */}
      <div className="flex items-center gap-3 text-[#94A3B8]">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-[#38BDF8]" />
          <span>{formattedDate}</span>
        </div>

        <span className="text-[#475569]">|</span>

        <div className="flex items-center gap-1 font-semibold text-white">
          <Clock className="w-3 h-3 text-[#38BDF8]" />
          <span>{formattedTime}</span>
        </div>
      </div>
    </footer>
  );
}
