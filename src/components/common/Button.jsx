import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  title = '',
}) {
  const baseStyle = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-[3px]';

  const sizes = {
    sm: 'px-2 py-1 text-xs gap-1 h-7',
    md: 'px-3 py-1.5 text-xs gap-1.5 h-8',
    lg: 'px-4 py-2 text-sm gap-2 h-9',
  };

  const variants = {
    primary: 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white border border-[#1D4ED8] shadow-sm active:bg-[#1E40AF]',
    secondary: 'bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE]',
    outline: 'bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1]',
    danger: 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-[#991B1B]',
    warning: 'bg-[#D97706] hover:bg-[#B45309] text-white border border-[#92400E]',
    ghost: 'bg-transparent hover:bg-[#F1F5F9] text-[#475569]',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </button>
  );
}
