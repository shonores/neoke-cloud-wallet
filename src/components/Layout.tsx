import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export default function Layout({ children, className = '' }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex justify-center">
      <div className={`w-full max-w-lg min-h-screen flex flex-col relative bg-[#F2F2F7] sm:shadow-2xl sm:shadow-black/5 ${className}`}>
        {children}
      </div>
    </div>
  );
}
