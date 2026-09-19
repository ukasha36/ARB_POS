import React from 'react';

export function ContentContainer({ children, className = '' }) {
  return (
    <main className={`flex-1 overflow-y-auto bg-[#F8FAFC] p-3 flex flex-col ${className}`}>
      {children}
    </main>
  );
}
