import React from 'react';

export function FormLabel({ children, required, className = '' }) {
  return (
    <label className={`block text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-1 ${className}`}>
      {children}
      {required && <span className="text-[#DC2626] ml-0.5">*</span>}
    </label>
  );
}

export function InputField({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder = '',
  required = false,
  error = '',
  disabled = false,
  className = '',
  autoFocus = false,
}) {
  return (
    <div className={`mb-3 ${className}`}>
      {label && <FormLabel required={required}>{label}</FormLabel>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border ${
          error ? 'border-[#DC2626]' : 'border-[#CBD5E1]'
        } rounded-[3px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:bg-[#F1F5F9] transition-colors`}
      />
      {error && <span className="text-[11px] text-[#DC2626] mt-0.5 block">{error}</span>}
    </div>
  );
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  error = '',
  disabled = false,
  className = '',
}) {
  return (
    <div className={`mb-3 ${className}`}>
      {label && <FormLabel required={required}>{label}</FormLabel>}
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-2.5 py-1.5 text-xs bg-white text-[#0F172A] border ${
          error ? 'border-[#DC2626]' : 'border-[#CBD5E1]'
        } rounded-[3px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:bg-[#F1F5F9] transition-colors`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-[11px] text-[#DC2626] mt-0.5 block">{error}</span>}
    </div>
  );
}
