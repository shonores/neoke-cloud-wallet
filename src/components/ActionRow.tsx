import React from 'react';

interface ActionRowProps {
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  trailingChevron?: boolean;
  className?: string;
  showBorder?: boolean;
}

export default function ActionRow({
  label,
  subLabel,
  icon,
  onClick,
  destructive = false,
  trailingChevron = true,
  className = '',
  showBorder = true,
}: ActionRowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-4 text-left active:bg-black/5 transition-colors ${
        showBorder ? 'border-b border-black/[0.04] last:border-0' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon && <div className="flex-shrink-0 text-[#8e8e93]">{icon}</div>}
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] ${destructive ? 'text-red-500 font-medium' : 'text-[#1c1c1e] font-medium'}`}>
            {label}
          </p>
          {subLabel && <p className="text-[13px] text-[#8e8e93] mt-0.5 truncate font-mono">{subLabel}</p>}
        </div>
      </div>
      {trailingChevron && (
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="flex-shrink-0 ml-3">
          <path d="M1 1l5 5-5 5" stroke="#c7c7cc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
