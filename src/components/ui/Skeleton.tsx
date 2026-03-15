import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

export function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
}: SkeletonProps) {
    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    const style: React.CSSProperties = {
        width: width,
        height: height,
    };

    return (
        <div
            className={`
        animate-pulse bg-cinema-700/50
        ${variantClasses[variant]}
        ${className}
      `}
            style={style}
        />
    );
}

// Movie card skeleton
export function MovieCardSkeleton() {
    return (
        <div className="rounded-xl overflow-hidden bg-cinema-800">
            <Skeleton height={280} />
            <div className="p-3 space-y-2">
                <Skeleton height={20} width="80%" />
                <Skeleton height={14} width="40%" />
            </div>
        </div>
    );
}

// Text skeleton
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height={16}
                    width={i === lines - 1 ? '60%' : '100%'}
                    variant="text"
                />
            ))}
        </div>
    );
}

export default Skeleton;
