import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  icon, 
  isLoading, 
  children, 
  className = '',
  ...props 
}: ButtonProps) => {
  const baseStyles = "rounded-full font-semibold transition-all duration-200 flex items-center justify-center";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg",
    secondary: "bg-gray-600 text-white hover:bg-gray-700",
    ghost: "text-gray-600 hover:bg-gray-100"
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading}
      {...props}
    >
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {icon && !isLoading && icon}
        {children}
      </div>
    </button>
  );
}; 