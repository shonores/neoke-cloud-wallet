interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  className?: string;
  large?: boolean;
}

export default function PageHeader({ title, subtitle, onBack, className = '', large = false }: PageHeaderProps) {
  return (
    <header className={`px-5 ${onBack ? 'pt-6' : 'pt-12'} pb-6 ${className}`}>
      {onBack && (
        <button
          onClick={onBack}
          className="w-10 h-10 -ml-2 mb-4 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors"
          aria-label="Go back"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="#1c1c1e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <h1 className={`${large ? 'text-[32px]' : 'text-[28px]'} font-bold text-[#1c1c1e] leading-tight`}>
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-[15px] text-[#8e8e93] leading-snug">{subtitle}</p>}
    </header>
  );
}
