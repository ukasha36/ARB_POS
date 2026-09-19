import React, { useEffect } from "react";
import {
  Plus,
  Save,
  Edit3,
  Trash2,
  XCircle,
  Search,
  List,
  Play,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { useToolbarStore } from "../../store/useToolbarStore";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";

export function TopToolbar() {
  const {
    activeAction,
    lastActionMessage,
    isDeleteConfirmOpen,
    isExecuting,
    disabledActions,
    triggerAction,
    confirmDelete,
    cancelDelete,
  } = useToolbarStore();

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't intercept if an input is active unless specific shortcuts
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "SELECT" ||
          activeElement.tagName === "TEXTAREA");

      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        triggerAction("insert");
      } else if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        triggerAction("save");
      } else if (e.ctrlKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        triggerAction("edit");
      } else if (e.key === "Escape") {
        e.preventDefault();
        triggerAction("abort");
      } else if (e.key === "Delete" && !isInput) {
        e.preventDefault();
        triggerAction("delete");
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [triggerAction]);

  const toolbarButtons = [
    // { id: 'insert', label: 'Insert', shortcut: 'Ctrl+N', icon: Plus, variant: 'primary' },
    // { id: 'save', label: 'Save', shortcut: 'Ctrl+S', icon: Save, variant: 'primary' },
    // { id: 'edit', label: 'Edit', shortcut: 'Ctrl+E', icon: Edit3, variant: 'secondary' },
    // { id: 'delete', label: 'Delete', shortcut: 'Delete', icon: Trash2, variant: 'danger' },
    // { id: 'abort', label: 'Abort', shortcut: 'Esc', icon: XCircle, variant: 'outline' },
    // { id: 'query', label: 'Query', shortcut: '', icon: Search, variant: 'outline' },
    // { id: 'list', label: 'List', shortcut: '', icon: List, variant: 'outline' },
    // {
    //   id: "execute",
    //   label: "Execute",
    //   shortcut: "",
    //   icon: Play,
    //   variant: "secondary",
    // },
    { id: "exit", label: "Exit", shortcut: "", icon: LogOut, variant: "ghost" },
  ];

  return (
    <>
      <div className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-3 py-1.5 flex items-center justify-between shadow-xs select-none z-20">
        <div className="flex items-center gap-1 flex-wrap">
          {toolbarButtons.map((btn) => {
            const Icon = btn.icon;
            const isDisabled = disabledActions[btn.id];
            const isActive = activeAction === btn.id;

            return (
              <button
                key={btn.id}
                disabled={isDisabled}
                onClick={() => triggerAction(btn.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs font-semibold transition-all border ${
                  isActive
                    ? "bg-[#EFF6FF] border-[#2563EB] text-[#1D4ED8] ring-1 ring-[#2563EB]"
                    : btn.id === "insert" || btn.id === "save"
                      ? "bg-[#2563EB] text-white border-[#1D4ED8] hover:bg-[#1D4ED8]"
                      : btn.id === "delete"
                        ? "bg-[#DC2626] text-white border-[#B91C1C] hover:bg-[#B91C1C]"
                        : "bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{btn.label}</span>
                {btn.shortcut && (
                  <span
                    className={`ml-1 text-[10px] px-1 py-0.2 rounded font-normal ${
                      btn.id === "insert" ||
                      btn.id === "save" ||
                      btn.id === "delete"
                        ? "bg-white/20 text-white"
                        : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
                    }`}
                  >
                    {btn.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Status Notification Feedback */}
        {lastActionMessage && (
          <div className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] animate-pulse">
            {lastActionMessage}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={cancelDelete}
        title="Confirm Delete Action"
        width="max-w-sm"
        footer={
          <>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={confirmDelete}>
              Delete Record
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 py-1">
          <div className="bg-[#FEE2E2] p-2 rounded-full text-[#DC2626]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-xs text-[#0F172A]">
              Are you sure you want to delete this record?
            </p>
            <p className="text-[11px] text-[#64748B] mt-1">
              This action will permanently remove the record from the database.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
