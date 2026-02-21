import type { ReactNode } from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * Primary CTA button — indigo pill, full-width by default.
 * Use for all main action buttons across the app (Save, Continue, Upload, etc.)
 */
interface PrimaryButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
  className?: string;
}

export default function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
  type = 'button',
  fullWidth = true,
  className = '',
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${fullWidth ? 'w-full' : ''} flex items-center justify-center gap-2 py-4 rounded-full text-white font-semibold text-[17px] transition-opacity active:opacity-80 disabled:opacity-50 ${className}`}
      style={{ backgroundColor: '#5B4FE9' }}
    >
      {loading ? <LoadingSpinner size="sm" /> : children}
    </button>
  );
}
