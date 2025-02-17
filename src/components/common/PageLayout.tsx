import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export const PageLayout = ({ children, maxWidth = 'xl' }: PageLayoutProps) => {
  const maxWidths = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-3xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className={`container mx-auto px-4 py-8 ${maxWidths[maxWidth]}`}>
        {children}
      </main>
    </div>
  );
}; 