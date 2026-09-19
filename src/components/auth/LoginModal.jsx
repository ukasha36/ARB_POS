import React, { useState } from "react";
import {
  Lock,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Eye,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { Button } from "../common/Button";
import logo from "../../assets/logo.png";

export function LoginModal() {
  const { isLoginModalOpen, login, isLoading, error } = useAuthStore();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);

  // Toggle the boolean state
  const togglePasswordVisibility = () => {
    setShowPassword((prevShowPassword) => !prevShowPassword);
  };

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-[6px] border border-[#BFDBFE] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Branding with ARB Communication Logo */}
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] px-6 py-4 text-white flex items-center gap-4 border-b border-[#1D4ED8]">
          <div className="bg-white p-2 rounded-md shadow-xs shrink-0 flex items-center justify-center">
            <img
              src={logo}
              alt="ARB Communication Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">
              ARB Communication
            </h1>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
            <Lock className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              System Authentication
            </h2>
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] px-3 py-2 rounded-[3px] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-[#2563EB]" /> Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
                className="w-full px-3 py-2 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1 flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-[#2563EB]" /> Password
              </label>
              <div className="w-full relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full relative px-3 py-2 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
                <div
                  onClick={togglePasswordVisibility}
                  className="cursor-pointer absolute top-3 right-4"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#EFF6FF] p-2.5 rounded-[3px] border border-[#BFDBFE] text-[11px] text-[#1E40AF] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2563EB]" />
            <span>
              Default credentials populated for Phase 2 system access.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={Lock}
              disabled={isLoading}
              className="w-full font-semibold shadow-md"
            >
              {isLoading ? "Authenticating..." : "Log In to System"}
            </Button>
          </div>
        </form>

        <div className="bg-[#F8FAFC] px-6 py-2 border-t border-[#E2E8F0] text-center text-[10px] text-[#64748B]">
          ARB Communication
        </div>
      </div>
    </div>
  );
}
