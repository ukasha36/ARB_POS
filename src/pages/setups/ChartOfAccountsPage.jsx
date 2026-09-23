import React, { useState, useEffect } from "react";
import {
  FileText,
  Save,
  Trash2,
  BookOpen,
  Check,
  AlertCircle,
  Building2,
  Edit,
  Shield,
} from "lucide-react";
import { AccountQuickNav } from "../../components/accounts/AccountQuickNav";
import { AccountListModal } from "../../components/accounts/AccountListModal";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { api } from "../../services/api";
import { useToolbarStore } from "../../store/useToolbarStore";
import { formatCurrency } from "../../utils/formatters";

export function ChartOfAccountsPage() {
  const { triggerAction } = useToolbarStore();

  const initialFormState = {
    id: null,
    code: "",
    title: "",
    account_type: "CUSTOMER",
    purchase_enabled: false,
    sale_enabled: true,
    opening_balance: 0.0,
    opening_balance_type: "Dr",
    opening_date: new Date().toISOString().split("T")[0],
    address_1: "",
    address_2: "",
    telephone_1: "",
    telephone_2: "",
    fax: "",
    mobile: "",
    gst_number: "",
    ntn_number: "",
    remarks: "",
    area_id: "",
    sub_area_id: "",
    note_head_id: "",
    salesman_id: "",
    booker_id: "",
    item_category_id: "",
    category_id: "",
    credit_limit: 0.0,
    aging_days: 0,
    status: "Active",
    short_name: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [lookups, setLookups] = useState({
    areas: [],
    subAreas: [],
    salesmen: [],
    categories: [],
  });
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0.0);
  const [ledgerNotification, setLedgerNotification] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null,
    dependencies: null,
  });

  // Sensitive field warning modal
  const [sensitiveWarningModal, setSensitiveWarningModal] = useState({
    isOpen: false,
    changedFields: [],
    onConfirm: null,
  });

  // Track original values for sensitive field detection
  const [originalSensitiveValues, setOriginalSensitiveValues] = useState({});

  useEffect(() => {
    loadLookups();
    handleNewRecord();
  }, []);

  const loadLookups = async () => {
    try {
      const res = await api.accounts.getLookups();
      if (res.success && res.data) {
        setLookups(res.data);
      }
    } catch (err) {
      console.error("Failed to load account lookups", err);
    }
  };

  const handleNewRecord = async () => {
    try {
      const res = await api.accounts.getNextCode();
      const newCode = res.success && res.code ? res.code : "1003";
      setFormData({
        ...initialFormState,
        code: newCode,
      });
      setCurrentBalance(0.0);
      setOriginalSensitiveValues({});
      setStatusMessage({
        type: "info",
        text: `Prepared new account record. Generated Code: ${newCode}`,
      });
    } catch (err) {
      setFormData({ ...initialFormState, code: "1003" });
      setOriginalSensitiveValues({});
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTypeChange = (e) => {
    const typeVal = e.target.value;
    let purch = false;
    let sale = false;
    let drCr = "Dr";

    if (
      typeVal === "CUSTOMER" ||
      typeVal === "SALES" ||
      typeVal === "HANDY_RECEIVABLE"
    ) {
      sale = true;
    }
    if (
      typeVal === "SUPPLIER" ||
      typeVal === "PURCHASES" ||
      typeVal === "HANDY_PAYABLE"
    ) {
      purch = true;
      drCr = "Cr";
    }
    if (typeVal === "CAPITAL" || typeVal === "REVENUE" || typeVal === "BANK") {
      drCr = "Cr";
    }

    setFormData((prev) => ({
      ...prev,
      account_type: typeVal,
      purchase_enabled: purch,
      sale_enabled: sale,
      opening_balance_type: drCr,
    }));
  };

  const loadSelectedAccount = async (account) => {
    setFormData({
      id: account.id,
      code: account.code || "",
      title: account.title || "",
      account_type: account.account_type || "CUSTOMER",
      purchase_enabled: Boolean(account.purchase_enabled),
      sale_enabled: Boolean(account.sale_enabled),
      opening_balance: account.opening_balance || 0.0,
      opening_balance_type: account.opening_balance_type || "Dr",
      opening_date:
        account.opening_date || new Date().toISOString().split("T")[0],
      address_1: account.address_1 || "",
      address_2: account.address_2 || "",
      telephone_1: account.telephone_1 || "",
      telephone_2: account.telephone_2 || "",
      fax: account.fax || "",
      mobile: account.mobile || "",
      gst_number: account.gst_number || "",
      ntn_number: account.ntn_number || "",
      remarks: account.remarks || "",
      area_id: account.area_id || "",
      sub_area_id: account.sub_area_id || "",
      note_head_id: account.note_head_id || "",
      salesman_id: account.salesman_id || "",
      booker_id: account.booker_id || "",
      item_category_id: account.item_category_id || "",
      category_id: account.category_id || "",
      credit_limit: account.credit_limit || 0.0,
      aging_days: account.aging_days || 0,
      status: account.status || "Active",
      short_name: account.short_name || "",
    });

    setOriginalSensitiveValues({
      account_type: account.account_type || "CUSTOMER",
      opening_balance: account.opening_balance || 0.0,
      opening_balance_type: account.opening_balance_type || "Dr",
      opening_date:
        account.opening_date || new Date().toISOString().split("T")[0],
    });

    if (account.id) {
      const balRes = await api.accounts.getBalance(account.id);
      if (balRes.success) setCurrentBalance(balRes.balance);
    }
    setStatusMessage({
      type: "info",
      text: `Loaded account '${account.title}' [${account.code}]`,
    });
  };

  const handleDelete = async () => {
    if (!formData.id) {
      setStatusMessage({
        type: "error",
        text: "No existing record selected to delete.",
      });
      return;
    }

    try {
      const res = await api.accounts.checkDependencies(formData.id);
      if (res.success && res.data) {
        const dep = res.data;
        setDeleteModal({
          isOpen: true,
          type: dep.canHardDelete ? "unused" : "used",
          dependencies: dep,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to check account dependencies",
        });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message });
    }
  };

  const handleDeleteConfirm = async () => {
    const { type, dependencies } = deleteModal;
    if (!formData.id) return;

    try {
      const res = await api.accounts.delete(formData.id);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
        if (res.action === "deleted") {
          handleNewRecord();
        } else if (res.action === "deactivated") {
          if (dependencies?.account) {
            await loadSelectedAccount(dependencies.account);
          }
        }
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to delete account",
        });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setDeleteModal({ isOpen: false, type: null, dependencies: null });
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!formData.code || !formData.title || !formData.account_type) {
      setStatusMessage({
        type: "error",
        text: "Validation Error: Code, Title, and Account Type are required.",
      });
      return;
    }

    if (formData.id) {
      const sensitiveFields = [
        "account_type",
        "opening_balance",
        "opening_balance_type",
        "opening_date",
      ];
      const changedFields = sensitiveFields.filter(
        (field) => formData[field] !== originalSensitiveValues[field],
      );

      if (changedFields.length > 0) {
        try {
          const depRes = await api.accounts.checkDependencies(formData.id);
          if (depRes.success && depRes.data && !depRes.data.canHardDelete) {
            setSensitiveWarningModal({
              isOpen: true,
              changedFields,
              onConfirm: () => executeSave(),
            });
            return;
          }
        } catch (err) {
          console.warn(
            "Could not check dependencies for sensitive save warning:",
            err,
          );
        }
      }
    }

    await executeSave();
  };

  const executeSave = async () => {
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await api.accounts.save(formData);
      if (res.success && res.data) {
        setFormData(res.data);
        setStatusMessage({
          type: "success",
          text: `Account '${res.data.title}' [${res.data.code}] saved successfully!`,
        });
        if (res.data.id) {
          const balRes = await api.accounts.getBalance(res.data.id);
          if (balRes.success) setCurrentBalance(balRes.balance);

          setOriginalSensitiveValues({
            account_type: res.data.account_type,
            opening_balance: res.data.opening_balance,
            opening_balance_type: res.data.opening_balance_type,
            opening_date: res.data.opening_date,
          });
        }
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to save account",
        });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickNav = async (direction) => {
    try {
      const res = await api.accounts.getQuickNav({
        currentCode: formData.code,
        direction,
      });
      if (res.success && res.data) {
        loadSelectedAccount(res.data);
      }
    } catch (err) {
      console.error("QuickNav failed", err);
    }
  };

  const handleSearchGo = async (term) => {
    if (!term || !term.trim()) return;
    try {
      const res = await api.accounts.list({ search: term });
      if (res.success && res.data && res.data.length > 0) {
        loadSelectedAccount(res.data[0]);
      } else {
        setStatusMessage({
          type: "error",
          text: `No account found matching '${term}'`,
        });
      }
    } catch (err) {
      console.error("Search GO failed", err);
    }
  };

  const handleOpenLedger = () => {
    setLedgerNotification({
      code: formData.code,
      title: formData.title || "Selected Account",
      balance: currentBalance,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] select-none text-xs space-y-2">
      {/* 1. Sub-Header Section */}
      <div className="bg-white px-3 py-2 border-b border-[#E2E8F0] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            ACCOUNT SETUP
            {formData.id && (
              <span className="px-1.5 py-0.5 bg-[#FEF3C7] text-[#92400E] text-[10px] font-mono rounded border border-[#FDE68A] flex items-center gap-1">
                <Edit className="w-3 h-3" />
                EDITING: {formData.code}
              </span>
            )}
          </h2>
          <p className="text-[11px] text-[#64748B]">
            Company / Supplier / Customer / Expense / Bank Setup
          </p>
        </div>

        {/* Local Toolbar Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsListModalOpen(true)}
          >
            View All Accounts
          </Button>
        </div>
      </div>

      {/* 2. Quick Navigation Bar */}
      {/* <AccountQuickNav
        onNavigate={handleQuickNav}
        onSearch={handleSearchGo}
        currentCode={formData.code}
      /> */}

      {/* Status Message Notification Bar */}
      {statusMessage && (
        <div
          className={`mx-3 px-3 py-1.5 rounded-[3px] text-xs font-semibold flex items-center justify-between border ${statusMessage.type === "success"
            ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
            : statusMessage.type === "error"
              ? "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
              : "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]"
            }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <Check className="w-4 h-4 text-[#16A34A]" />
            ) : statusMessage.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-[#DC2626]" />
            ) : (
              <Building2 className="w-4 h-4 text-[#2563EB]" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Main Form Grid */}
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* LEFT SECTION: PRIMARY ACCOUNT DETAILS */}
          <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-3 space-y-3">
            <div className="bg-[#EFF6FF] px-2.5 py-1 rounded-[3px] border border-[#BFDBFE] text-[#1E40AF] font-bold text-xs flex items-center justify-between">
              <span>PRIMARY ACCOUNT DETAILS</span>
              {formData.id && (
                <span className="text-[11px] font-mono font-normal">
                  Balance:{" "}
                  <strong
                    className={
                      currentBalance >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"
                    }
                  >
                    {formatCurrency(currentBalance)}
                  </strong>
                </span>
              )}
            </div>

            {/* Code & Title with Ledger Button */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Code <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="Account Code"
                  required
                  className="w-full px-2 py-1 text-xs font-mono font-bold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="col-span-8">
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>
                    Title <span className="text-[#DC2626]">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenLedger}
                    className="px-1.5 py-0.2 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE] rounded text-[10px] font-bold transition-colors flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    [Ledger]
                  </button>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. SHAHID / AL-MADINA TRADERS"
                  required
                  className="w-full px-2.5 py-1 text-xs font-bold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* Account Type & Purchase/Sale Flags */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-7">
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Account Type <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  name="account_type"
                  value={formData.account_type}
                  onChange={handleTypeChange}
                  className="w-full px-2 py-1 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="SUPPLIER">Supplier</option>
                  <option value="BANK">Bank</option>
                  <option value="CASH">Cash</option>
                  <option value="EXPENSE">Expense</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="CAPITAL">Capital</option>
                  <option value="AGENT">Agent</option>
                  <option value="CHEQUE_IN_HAND">Cheque in Hand</option>
                  <option value="OTHER_INCOME">Other Income</option>
                  <option value="INACTIVE_CUSTOMER">In Active Customer</option>
                  <option value="INSURANCE_TRACKER">Insurance Tracker</option>
                  <option value="SALES">Sales</option>
                  <option value="PURCHASES">Purchases</option>
                  <option value="HANDY_PAYABLE">Handy Payable</option>
                  <option value="HANDY_RECEIVABLE">Handy Receivable</option>
                </select>
              </div>

              <div className="col-span-5 flex items-center gap-3 pt-4">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    name="purchase_enabled"
                    checked={formData.purchase_enabled}
                    onChange={handleInputChange}
                    className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>Purchase □</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    name="sale_enabled"
                    checked={formData.sale_enabled}
                    onChange={handleInputChange}
                    className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>Sale □</span>
                </label>
              </div>
            </div>

            {/* Opening Balance */}
            <div className="grid grid-cols-12 gap-2 bg-[#F8FAFC] p-2 border border-[#E2E8F0] rounded-[3px]">
              <div className="col-span-5">
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Opening Balance (PKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="opening_balance"
                  value={formData.opening_balance}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 text-xs font-mono font-bold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Dr / Cr
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-1 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="opening_balance_type"
                      value="Dr"
                      checked={formData.opening_balance_type === "Dr"}
                      onChange={handleInputChange}
                    />
                    <span>Dr</span>
                  </label>
                  <label className="inline-flex items-center gap-1 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="opening_balance_type"
                      value="Cr"
                      checked={formData.opening_balance_type === "Cr"}
                      onChange={handleInputChange}
                    />
                    <span>Cr</span>
                  </label>
                </div>
              </div>

              <div className="col-span-4">
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Opening Date
                </label>
                <input
                  type="date"
                  name="opening_date"
                  value={formData.opening_date}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-[#1E40AF] uppercase tracking-wider block border-b border-[#E2E8F0] pb-1">
                CONTACT DETAILS & ADDRESS
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748B]">
                    Address 1
                  </label>
                  <input
                    type="text"
                    name="address_1"
                    value={formData.address_1}
                    onChange={handleInputChange}
                    placeholder="Street address line 1"
                    className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748B]">
                    Address 2
                  </label>
                  <input
                    type="text"
                    name="address_2"
                    value={formData.address_2}
                    onChange={handleInputChange}
                    placeholder="Area / City / Zip"
                    className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748B]">
                    Telephone 1
                  </label>
                  <input
                    type="text"
                    name="telephone_1"
                    value={formData.telephone_1}
                    onChange={handleInputChange}
                    placeholder="Phone 1"
                    className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748B]">
                    Telephone 2
                  </label>
                  <input
                    type="text"
                    name="telephone_2"
                    value={formData.telephone_2}
                    onChange={handleInputChange}
                    placeholder="Phone 2"
                    className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748B]">
                    Mobile
                  </label>
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="Cell phone"
                    className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748B]">
                    Fax
                  </label>
                  <input
                    type="text"
                    name="fax"
                    value={formData.fax}
                    onChange={handleInputChange}
                    placeholder="Fax number"
                    className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748B]">
                    GST #
                  </label>
                  <input
                    type="text"
                    name="gst_number"
                    value={formData.gst_number}
                    onChange={handleInputChange}
                    placeholder="Sales Tax Registration No."
                    className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748B]">
                    NTN #
                  </label>
                  <input
                    type="text"
                    name="ntn_number"
                    value={formData.ntn_number}
                    onChange={handleInputChange}
                    placeholder="National Tax Number"
                    className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#64748B]">
                  Remarks
                </label>
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="Special instructions or notes"
                  className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                />
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: CLASSIFICATION / CREDIT SETTINGS */}
          <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-3 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="bg-[#EFF6FF] px-2.5 py-1 rounded-[3px] border border-[#BFDBFE] text-[#1E40AF] font-bold text-xs">
                CLASSIFICATION & CREDIT CONTROL
              </div>

              {/* Area & Sub Area - simplified per client requirement (defaults to null) */}
              <input
                type="hidden"
                name="area_id"
                value={formData.area_id || ""}
              />
              <input
                type="hidden"
                name="sub_area_id"
                value={formData.sub_area_id || ""}
              />

              {/* Salesman & Booker */}
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="hidden"
                  name="salesman_id"
                  value={formData.salesman_id || ""}
                />
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Booker / Agent
                  </label>
                  <input
                    type="text"
                    name="booker_id"
                    value={formData.booker_id}
                    onChange={handleInputChange}
                    placeholder="Booker / Agent Name"
                    className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>
              </div>

              {/* Note Head & Item Category */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Note Head
                  </label>
                  <input
                    type="text"
                    name="note_head_id"
                    value={formData.note_head_id}
                    onChange={handleInputChange}
                    placeholder="General Ledger Note Head"
                    className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    placeholder="Category"
                    className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>
              </div>

              {/* Credit Control */}
              <div className="bg-[#FEF3C7] p-2.5 border border-[#FDE68A] rounded-[3px] space-y-2">
                <span className="text-[11px] font-bold text-[#92400E] uppercase tracking-wider block">
                  CREDIT CONTROL & AGING LIMITS (PKR)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#78350F] uppercase">
                      Credit Limit (Rs.)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      name="credit_limit"
                      value={formData.credit_limit}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 text-xs font-mono font-bold bg-white text-[#0F172A] border border-[#FCD34D] rounded-[3px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#78350F] uppercase">
                      Aging Days (Max)
                    </label>
                    <input
                      type="number"
                      name="aging_days"
                      value={formData.aging_days}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 text-xs font-mono font-bold bg-white text-[#0F172A] border border-[#FCD34D] rounded-[3px]"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Short Name */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0]">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1 text-xs font-bold bg-white border border-[#CBD5E1] rounded-[3px]"
                  >
                    <option value="Active">☑ Active</option>
                    <option value="Inactive">☒ Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Short Name / Alias
                  </label>
                  <input
                    type="text"
                    name="short_name"
                    value={formData.short_name}
                    onChange={handleInputChange}
                    placeholder="Short alias"
                    className="w-full px-2 py-1 text-xs uppercase bg-white border border-[#CBD5E1] rounded-[3px]"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Button */}
            <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
              <Button variant="outline" size="sm" onClick={handleNewRecord}>
                Reset
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Save}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Account Directory Search Drawer/Modal */}
      <AccountListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        onSelectAccount={loadSelectedAccount}
        onRequestDelete={async (account) => {
          await loadSelectedAccount(account);
          handleDelete();
        }}
      />

      {/* Ledger Navigation Notification Modal */}
      {ledgerNotification && (
        <Modal
          isOpen={Boolean(ledgerNotification)}
          onClose={() => setLedgerNotification(null)}
          title={`Ledger Navigation - ${ledgerNotification.title}`}
          width="max-w-md"
        >
          <div className="space-y-3">
            <div className="bg-[#EFF6FF] p-3 rounded border border-[#BFDBFE] flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-[#2563EB]" />
              <div>
                <h4 className="font-bold text-xs text-[#0F172A]">
                  {ledgerNotification.title}
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Account Code:{" "}
                  <code className="font-mono text-[#2563EB]">
                    {ledgerNotification.code}
                  </code>
                </p>
                <p className="text-[11px] text-[#47556A] font-medium mt-1">
                  Current Net Balance:{" "}
                  <strong className="font-mono">
                    {formatCurrency(ledgerNotification.balance)}
                  </strong>
                </p>
              </div>
            </div>
            <p className="text-xs text-[#475569]">
              Detailed statement & ledger transaction line breakdown will be
              available in Phase 3.
            </p>
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setLedgerNotification(null)}
              >
                OK
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Account Modal - Unused */}
      {deleteModal.isOpen && deleteModal.type === "unused" && (
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() =>
            setDeleteModal({ isOpen: false, type: null, dependencies: null })
          }
          title="Delete Account"
          width="max-w-md"
        >
          <div className="space-y-3">
            <div className="bg-[#DCFCE7] p-3 rounded border border-[#86EFAC] flex items-center gap-3">
              <Check className="w-6 h-6 text-[#16A34A]" />
              <div>
                <h4 className="font-bold text-xs text-[#0F172A]">
                  Account Can Be Safely Deleted
                </h4>
                <p className="text-[11px] text-[#166534]">
                  No linked transactions or financial records.
                </p>
              </div>
            </div>
            <div className="space-y-2 text-[11px] text-[#475569]">
              <p>
                <strong>Code:</strong> {deleteModal.dependencies?.account?.code}
              </p>
              <p>
                <strong>Title:</strong>{" "}
                {deleteModal.dependencies?.account?.title}
              </p>
              <p>
                <strong>Type:</strong>{" "}
                {deleteModal.dependencies?.account?.account_type}
              </p>
            </div>
            <p className="text-xs text-[#64748B]">
              This action cannot be undone. The account will be permanently
              removed.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    type: null,
                    dependencies: null,
                  })
                }
              >
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
                Delete Account
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Account Modal - Used (Cannot Delete) */}
      {deleteModal.isOpen && deleteModal.type === "used" && (
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() =>
            setDeleteModal({ isOpen: false, type: null, dependencies: null })
          }
          title="Account Cannot Be Deleted"
          width="max-w-md"
        >
          <div className="space-y-3">
            <div className="bg-[#FEF2F2] p-3 rounded border border-[#FCA5A5] flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-[#DC2626]" />
              <div>
                <h4 className="font-bold text-xs text-[#0F172A]">
                  Account Has Financial History
                </h4>
                <p className="text-[11px] text-[#991B1B]">
                  Cannot be permanently deleted due to existing records.
                </p>
              </div>
            </div>
            <div className="space-y-2 text-[11px] text-[#475569]">
              <p>
                <strong>Code:</strong> {deleteModal.dependencies?.account?.code}
              </p>
              <p>
                <strong>Title:</strong>{" "}
                {deleteModal.dependencies?.account?.title}
              </p>
              <p>
                <strong>Type:</strong>{" "}
                {deleteModal.dependencies?.account?.account_type}
              </p>
              <p>
                <strong>Total Ledger Lines:</strong>{" "}
                {deleteModal.dependencies?.totalLedgerLines}
              </p>
              <p>
                <strong>Total Transactions:</strong>{" "}
                {deleteModal.dependencies?.totalEntries}
              </p>
              {deleteModal.dependencies?.hasOpeningBalance && (
                <p className="text-[#DC2626]">
                  <strong>Opening Balance:</strong> Yes (non-zero)
                </p>
              )}
              <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                <p className="font-bold text-xs text-[#475569] mb-1">
                  Breakdown by Transaction Type:
                </p>
                {Object.entries(
                  deleteModal.dependencies?.byEntryType || {},
                ).map(([type, count]) => (
                  <p key={type} className="text-[10px] text-[#64748B] ml-2">
                    • {type}: {count} line(s)
                  </p>
                ))}
              </div>
            </div>
            <p className="text-xs text-[#64748B]">
              Recommended action: Deactivate the account to preserve history.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    type: null,
                    dependencies: null,
                  })
                }
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Shield}
                onClick={handleDeleteConfirm}
              >
                Deactivate Account
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Sensitive Field Change Warning Modal */}
      {sensitiveWarningModal.isOpen && (
        <Modal
          isOpen={sensitiveWarningModal.isOpen}
          onClose={() =>
            setSensitiveWarningModal({
              isOpen: false,
              changedFields: [],
              onConfirm: null,
            })
          }
          title="Warning: Sensitive Fields Modified"
          width="max-w-md"
        >
          <div className="space-y-3">
            <div className="bg-[#FEF3C7] p-3 rounded border border-[#FDE68A] flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-[#92400E]" />
              <div>
                <h4 className="font-bold text-xs text-[#0F172A]">
                  Critical Fields Changed
                </h4>
                <p className="text-[11px] text-[#78350F]">
                  This account has existing financial activity.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-[#475569]">
              The following sensitive fields have been modified:
            </p>
            <ul className="list-disc list-inside text-[11px] text-[#475569] space-y-1">
              {sensitiveWarningModal.changedFields.map((field) => (
                <li key={field}>{field.replace(/_/g, " ")}</li>
              ))}
            </ul>
            <p className="text-xs text-[#DC2626]">
              Changing these fields may affect historical balances and reports.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSensitiveWarningModal({
                    isOpen: false,
                    changedFields: [],
                    onConfirm: null,
                  })
                }
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (sensitiveWarningModal.onConfirm)
                    sensitiveWarningModal.onConfirm();
                  setSensitiveWarningModal({
                    isOpen: false,
                    changedFields: [],
                    onConfirm: null,
                  });
                }}
              >
                Save Anyway
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
