import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'gold' | 'premium' | 'success' | 'warning' | 'error';
    className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    const variantClasses = {
        default: 'bg-cinema-700 text-cream-200 border-cinema-600',
        gold: 'bg-gold-600/10 text-gold-500 border-gold-600/30',
        premium: 'bg-premium-600/10 text-premium-400 border-premium-500/30',
        success: 'bg-green-900/20 text-green-400 border-green-500/30',
        warning: 'bg-amber-900/20 text-amber-400 border-amber-500/30',
        error: 'bg-red-900/20 text-red-400 border-red-500/30',
    };

    return (
        <span
            className={`
        inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full
        border transition-colors
        ${variantClasses[variant]}
        ${className}
      `}
        >
            {children}
        </span>
    );
}

// Status dot indicator
interface StatusDotProps {
    status?: 'online' | 'offline' | 'busy' | 'away';
    pulse?: boolean;
}

export function StatusDot({ status = 'online', pulse = false }: StatusDotProps) {
    const statusColors = {
        online: 'bg-green-400',
        offline: 'bg-cream-400',
        busy: 'bg-red-400',
        away: 'bg-amber-400',
    };

    return (
        <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full ${statusColors[status]} opacity-75`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${statusColors[status]}`} />
        </span>
    );
}

export default Badge;
