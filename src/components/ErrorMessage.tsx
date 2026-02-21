interface ErrorMessageProps {
  message: string;
  className?: string;
}

export default function ErrorMessage({ message, className = '' }: ErrorMessageProps) {
  return (
    <div
      className={`flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm ${className}`}
      role="alert"
    >
      <span className="text-lg leading-none mt-0.5 flex-shrink-0" aria-hidden>⚠</span>
      <p className="flex-1 leading-relaxed">{message}</p>
    </div>
  );
}
