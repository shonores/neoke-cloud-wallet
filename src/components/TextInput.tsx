import React from 'react';

interface TextInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  multiline?: boolean;
  error?: string;
  // Explicitly allow common input props that might conflict or be needed
  type?: string;
}

export default function TextInput({ multiline = false, error, className = '', ...props }: TextInputProps) {
  const baseClass = `w-full bg-white border border-black/8 rounded-[20px] px-4 py-4 text-[16px] text-[#1c1c1e] placeholder-[#c7c7cc] focus:outline-none focus:border-[#5B4FE9] focus:ring-1 focus:ring-[#5B4FE9]/10 shadow-sm transition-all disabled:opacity-50 ${
    error ? 'border-red-500/50 focus:border-red-500' : ''
  } ${className}`;

  return (
    <div className="space-y-2">
      {multiline ? (
        <textarea className={`${baseClass} resize-none`} {...props} />
      ) : (
        <input className={baseClass} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {error && <p className="px-1 text-[13px] text-red-500 font-medium animate-in fade-in slide-in-from-top-1">{error}</p>}
    </div>
  );
}
