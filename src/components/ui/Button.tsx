import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'premium';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseClasses = 'relative inline-flex items-center justify-center font-medium transition-all duration-300 ease-out rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600/50 focus:ring-offset-2 focus:ring-offset-cinema-900 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        primary: 'bg-gold-600 text-cinema-950 hover:bg-gold-500 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]',
        secondary: 'bg-transparent border border-gold-600/50 text-gold-600 hover:bg-gold-600/10 hover:border-gold-600 hover:shadow-glow active:scale-[0.98]',
        ghost: 'bg-transparent text-cream-200 hover:bg-cinema-700 hover:text-cream-100',
        premium: 'bg-premium-600 text-cream-100 hover:bg-premium-500 hover:shadow-lg hover:shadow-premium-600/30 hover:scale-[1.02] active:scale-[0.98]',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm gap-1.5',
        md: 'px-5 py-2.5 text-base gap-2',
        lg: 'px-6 py-3 text-lg gap-2.5',
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <>
                    {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
                    {children}
                    {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
                </>
            )}
        </button>
    );
}

export default Button;
