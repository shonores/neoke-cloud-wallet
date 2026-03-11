import React from 'react';

interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SectionCard({ title, children, className = '' }: SectionCardProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {title && (
        <p className="px-1 text-[11px] text-[#8e8e93] font-semibold uppercase tracking-wide">
          {title}
        </p>
      )}
      <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-black/[0.02]">
        {children}
      </div>
    </div>
  );
}
