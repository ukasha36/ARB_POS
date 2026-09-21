import React, { useState } from "react";
import { Package, Users, Building2 } from "lucide-react";
import logo from "../assets/logo.png";
import { ReceivablesModal } from "../components/dashboard/ReceivablesModal";
import { PayablesModal } from "../components/dashboard/PayablesModal";
import { StockStatusModal } from "../components/dashboard/StockStatusModal";

export function WelcomePage() {
  const [receivablesModalOpen, setReceivablesModalOpen] = useState(false);
  const [payablesModalOpen, setPayablesModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);

  return (
    <div className="h-full flex flex-col items-center justify-between p-4 md:p-8 select-none overflow-y-auto">
      <div className="w-full max-w-4xl flex flex-col items-center text-center space-y-6 my-auto">
        {/* Logo & Hero */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-[#BFDBFE] shadow-sm flex flex-col items-center w-full relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#EFF6FF] rounded-full filter blur-xl opacity-70 pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#EFF6FF] rounded-full filter blur-xl opacity-70 pointer-events-none" />

          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] shadow-xs mb-4">
            <img
              src={logo}
              alt="ARB Communication Logo"
              className="h-24 md:h-32 w-auto object-contain transition-transform hover:scale-105 duration-200"
            />
          </div>

          <div className="space-y-1.5 z-10">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Welcome to ARB Communication POS
            </h1>
          </div>
        </div>

        {/* Receivables / Payables / Stock */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          <button
            type="button"
            onClick={() => setReceivablesModalOpen(true)}
            className="flex items-center gap-3 p-3.5 bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] rounded-[4px] hover:bg-[#BBF7D0] transition-colors shadow-2xs"
          >
            <div className="p-1.5 bg-[#16A34A] rounded text-white shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm">Receivables</div>
              <div className="text-[10px] opacity-80">
                Customer outstanding balances
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPayablesModalOpen(true)}
            className="flex items-center gap-3 p-3.5 bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] rounded-[4px] hover:bg-[#FECACA] transition-colors shadow-2xs"
          >
            <div className="p-1.5 bg-[#DC2626] rounded text-white shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm">Payables</div>
              <div className="text-[10px] opacity-80">
                Supplier outstanding liabilities
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStockModalOpen(true)}
            className="flex items-center gap-3 p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] rounded-[4px] hover:bg-[#DBEAFE] transition-colors shadow-2xs"
          >
            <div className="p-1.5 bg-[#2563EB] rounded text-white shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm">Stock / Inventory</div>
              <div className="text-[10px] opacity-80">On-hand stock status</div>
            </div>
          </button>
        </div>
      </div>

      <ReceivablesModal
        isOpen={receivablesModalOpen}
        onClose={() => setReceivablesModalOpen(false)}
      />
      <PayablesModal
        isOpen={payablesModalOpen}
        onClose={() => setPayablesModalOpen(false)}
      />
      <StockStatusModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
      />
    </div>
  );
}
