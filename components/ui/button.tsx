import type { ButtonHTMLAttributes } from 'react';

const variants = {
  default: 'bg-slate-100 text-slate-950 hover:bg-slate-200',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
  ghost: 'bg-transparent text-slate-100 hover:bg-slate-900',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost';
}

export function Button({ className = '', variant = 'default', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
