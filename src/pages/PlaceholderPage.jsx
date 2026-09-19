import React from "react";
import { useNavigationStore } from "../store/useNavigationStore";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { Plus, Search, Filter, Printer, Download, Layers } from "lucide-react";
import { useToolbarStore } from "../store/useToolbarStore";

export function PlaceholderPage() {
  const { activeModuleTitle, activeCategory, activeModuleId } =
    useNavigationStore();
  const { triggerAction } = useToolbarStore();

  return (
    <div className="space-y-4">
      {/* Action Header Card */}
      <div className="bg-white p-3 border border-[#E2E8F0] rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#2563EB]" />
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">
              {activeModuleTitle} Module
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Module Key:{" "}
              <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-[#2563EB]">
                {activeModuleId}
              </code>
            </p>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <Card title={`${activeModuleTitle} Workspace`}>
        <div className="py-12 px-6 text-center space-y-3 bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-[4px]">
          <div className="w-12 h-12 bg-[#EFF6FF] text-[#2563EB] rounded-full flex items-center justify-center mx-auto border border-[#BFDBFE]">
            <Layers className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-[#0F172A]">
              {activeCategory} — {activeModuleTitle}
            </h4>
          </div>
        </div>
      </Card>
    </div>
  );
}
