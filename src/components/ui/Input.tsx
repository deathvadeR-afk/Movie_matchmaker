import React, { forwardRef } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    variant?: 'default' | 'glow';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    variant = 'default',
    type = 'text',
    className = '',
    ...props
}, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const baseClasses = 'w-full px-4 py-3 bg-cinema-800/50 border-b-2 border-cinema-600 text-cream-100 placeholder-cream-400 font-body rounded-t-lg transition-all duration-200 focus:outline-none';

    const variantClasses = {
        default: 'focus:border-gold-600 focus:bg-cinema-800',
        glow: 'focus:border-gold-600 focus:bg-cinema-800 focus:shadow-[0_0_20px_rgba(212,168,83,0.2)]',
    };

    const errorClasses = error
        ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_20px_rgba(248,113,113,0.2)]'
        : variantClasses[variant];

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-cream-300 mb-2">
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-400">
                        {leftIcon}
                    </span>
                )}
                <input
                    ref={ref}
                    type={inputType}
                    className={`${baseClasses} ${errorClasses} ${leftIcon ? 'pl-11' : ''} ${(rightIcon || isPassword) ? 'pr-11' : ''} ${className}`}
                    {...props}
                />
                {(rightIcon || isPassword) && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                        {isPassword ? (
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-cream-400 hover:text-gold-500 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        ) : (
                            <span className="text-cream-400">{rightIcon}</span>
                        )}
                    </span>
                )}
            </div>
            {error && (
                <div className="flex items-center gap-1.5 mt-2 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}
            {hint && !error && (
                <p className="mt-2 text-sm text-cream-400">{hint}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
