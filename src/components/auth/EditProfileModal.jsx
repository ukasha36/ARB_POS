import React, { useState, useEffect } from "react";
import {
  UserCheck,
  User,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { Button } from "../common/Button";

export function EditProfileModal() {
  const { isEditProfileOpen, setEditProfileOpen, currentUser, updateProfile } =
    useAuthStore();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isEditProfileOpen) {
      setDisplayName(currentUser?.displayName || "");
      setUsername(currentUser?.username || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus(null);
    }
  }, [isEditProfileOpen, currentUser]);

  if (!isEditProfileOpen) return null;

  const handleClose = () => {
    setStatus(null);
    setEditProfileOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    // Client-side validations
    if (!displayName.trim()) {
      setStatus({ type: "error", message: "User display name cannot be empty." });
      return;
    }

    if (!username.trim()) {
      setStatus({ type: "error", message: "Username cannot be empty." });
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        setStatus({
          type: "error",
          message: "Please enter your current password to verify identity.",
        });
        return;
      }
      if (newPassword.length < 4) {
        setStatus({
          type: "error",
          message: "New password must be at least 4 characters long.",
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        setStatus({
          type: "error",
          message: "New password and confirmation do not match.",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const res = await updateProfile({
        userId: currentUser?.id || 1,
        username: username.trim(),
        displayName: displayName.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword ? newPassword.trim() : undefined,
      });

      if (res.success) {
        setStatus({
          type: "success",
          message: "Profile updated successfully! Information saved.",
        });
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        setStatus({ type: "error", message: res.error || "Failed to update profile." });
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message || "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-[6px] border border-[#BFDBFE] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] px-5 py-3 text-white flex items-center justify-between border-b border-[#1D4ED8]">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1.5 rounded text-white">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Edit User Profile</h2>
              <p className="text-[11px] text-blue-100">
                Modify user details, username, and system password
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {status && (
          <div
            className={`mx-5 mt-4 p-3 rounded-[3px] text-xs font-semibold border flex items-center gap-2 ${
              status.type === "success"
                ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
                : "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            {/* Display Name */}
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-[#2563EB]" /> User Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. ARB Communication"
                required
                className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-[#2563EB]" /> Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                required
                className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          <div className="border-t border-[#E2E8F0] pt-3">
            <h3 className="text-[11px] font-bold text-[#1E293B] uppercase tracking-wider mb-2 flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#2563EB]" /> Security & Password Settings
            </h3>

            {/* Current Password */}
            <div className="mb-2.5">
              <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-[#2563EB]" /> Current Password
                </span>
                <span className="text-[10px] text-[#64748B] font-normal">
                  (Required to verify or change password)
                </span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB] pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-2 text-[#64748B] hover:text-[#0F172A]"
                >
                  {showCurrentPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* New Password & Confirm */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-[#2563EB]" /> New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep same"
                    className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB] pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2 text-[#64748B] hover:text-[#0F172A]"
                  >
                    {showNewPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-[#2563EB]" /> Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[3px] focus:outline-none focus:border-[#2563EB] pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2 text-[#64748B] hover:text-[#0F172A]"
                  >
                    {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[#64748B] mt-1.5">
              Tip: Leave New Password and Confirm Password blank if you only want to update your Display Name or Username.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Save}
              disabled={saving}
            >
              {saving ? "Saving Changes..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
