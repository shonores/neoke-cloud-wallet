import type { CredentialStatus } from '../types';

interface StatusBadgeProps {
  status: CredentialStatus;
  className?: string;
}

const STATUS_CONFIG: Record<CredentialStatus, { dot: string; label: string; bg: string; text: string }> = {
  active:    { dot: 'bg-green-500',  label: 'Active',    bg: 'bg-green-100',  text: 'text-green-700'  },
  suspended: { dot: 'bg-yellow-500', label: 'Suspended', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  revoked:   { dot: 'bg-red-500',    label: 'Revoked',   bg: 'bg-red-100',    text: 'text-red-700'    },
  expired:   { dot: 'bg-gray-400',   label: 'Expired',   bg: 'bg-gray-100',   text: 'text-gray-600'   },
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden />
      {cfg.label}
    </span>
  );
}
