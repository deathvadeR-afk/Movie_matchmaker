import React from 'react';
import { StreamingProvider, ProviderType } from '../../types';

interface StreamingBadgeProps {
    provider: StreamingProvider;
    size?: 'sm' | 'md' | 'lg';
    showName?: boolean;
    className?: string;
}

interface StreamingBadgeListProps {
    providers: StreamingProvider[];
    maxVisible?: number;
    size?: 'sm' | 'md' | 'lg';
    showNames?: boolean;
    className?: string;
}

interface StreamingAvailabilityProps {
    providers: StreamingProvider[];
    region?: string;
    className?: string;
}

/**
 * Get color classes based on provider type
 */
function getTypeColor(type: ProviderType): string {
    switch (type) {
        case 'flatrate':
            return 'bg-green-600/20 border-green-500/30 text-green-400';
        case 'rent':
            return 'bg-orange-600/20 border-orange-500/30 text-orange-400';
        case 'buy':
            return 'bg-blue-600/20 border-blue-500/30 text-blue-400';
        case 'free':
            return 'bg-purple-600/20 border-purple-500/30 text-purple-400';
        default:
            return 'bg-cinema-700 border-cinema-600 text-cream-300';
    }
}

/**
 * Get icon for provider type
 */
function getTypeIcon(type: ProviderType): string {
    switch (type) {
        case 'flatrate':
            return '📺';
        case 'rent':
            return '💰';
        case 'buy':
            return '🛒';
        case 'free':
            return '🎬';
        default:
            return '📱';
    }
}

/**
 * Get label for provider type
 */
function getTypeLabel(type: ProviderType): string {
    switch (type) {
        case 'flatrate':
            return 'Stream';
        case 'rent':
            return 'Rent';
        case 'buy':
            return 'Buy';
        case 'free':
            return 'Free';
        default:
            return 'Watch';
    }
}

/**
 * Get size classes
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg') {
    switch (size) {
        case 'sm':
            return {
                container: 'w-6 h-6',
                image: 'w-5 h-5',
                text: 'text-xs',
                padding: 'px-1.5 py-0.5'
            };
        case 'lg':
            return {
                container: 'w-10 h-10',
                image: 'w-8 h-8',
                text: 'text-sm',
                padding: 'px-3 py-1.5'
            };
        default: // md
            return {
                container: 'w-8 h-8',
                image: 'w-6 h-6',
                text: 'text-xs',
                padding: 'px-2 py-1'
            };
    }
}

/**
 * Single StreamingBadge component
 */
export function StreamingBadge({
    provider,
    size = 'md',
    showName = false,
    className = ''
}: StreamingBadgeProps) {
    const sizeClasses = getSizeClasses(size);
    const typeColor = getTypeColor(provider.type);

    return (
        <div
            className={`
                inline-flex items-center gap-1.5 rounded-full border
                ${typeColor} ${sizeClasses.padding}
                ${className}
            `}
            title={`${provider.name} - ${getTypeLabel(provider.type)}`}
        >
            {provider.logo ? (
                <img
                    src={provider.logo}
                    alt={provider.name}
                    className={`${sizeClasses.image} rounded object-contain bg-cinema-900`}
                    loading="lazy"
                />
            ) : (
                <span className="text-base">{getTypeIcon(provider.type)}</span>
            )}
            {showName && (
                <span className={`font-medium ${sizeClasses.text}`}>
                    {provider.name}
                </span>
            )}
        </div>
    );
}

/**
 * StreamingBadgeList - displays a list of streaming providers
 * Shows up to maxVisible providers, then shows "+N more" indicator
 */
export function StreamingBadgeList({
    providers,
    maxVisible = 4,
    size = 'sm',
    showNames = false,
    className = ''
}: StreamingBadgeListProps) {
    if (!providers || providers.length === 0) {
        return (
            <span className="text-xs text-cream-500 italic">
                Not available to stream
            </span>
        );
    }

    const visibleProviders = providers.slice(0, maxVisible);
    const remainingCount = providers.length - maxVisible;

    return (
        <div className={`flex flex-wrap gap-1.5 ${className}`}>
            {visibleProviders.map((provider, index) => (
                <StreamingBadge
                    key={`${provider.name}-${provider.type}-${index}`}
                    provider={provider}
                    size={size}
                    showName={showNames}
                />
            ))}
            {remainingCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 text-xs text-cream-400 bg-cinema-800 rounded-full border border-cinema-700">
                    +{remainingCount} more
                </span>
            )}
        </div>
    );
}

/**
 * StreamingAvailability - shows streaming availability with type indicators
 * Groups providers by type and shows count per type
 */
export function StreamingAvailability({
    providers,
    region,
    className = ''
}: StreamingAvailabilityProps) {
    if (!providers || providers.length === 0) {
        return (
            <div className={`flex items-center gap-2 text-sm text-cream-500 ${className}`}>
                <span className="text-lg">📡</span>
                <span>Not available to stream</span>
            </div>
        );
    }

    // Group by type
    const byType = {
        flatrate: providers.filter(p => p.type === 'flatrate'),
        rent: providers.filter(p => p.type === 'rent'),
        buy: providers.filter(p => p.type === 'buy'),
        free: providers.filter(p => p.type === 'free')
    };

    const hasAny = byType.flatrate.length > 0
        || byType.rent.length > 0
        || byType.buy.length > 0
        || byType.free.length > 0;

    if (!hasAny) {
        return (
            <div className={`flex items-center gap-2 text-sm text-cream-500 ${className}`}>
                <span className="text-lg">📡</span>
                <span>Not available to stream</span>
            </div>
        );
    }

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {byType.flatrate.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-600/20 border border-green-500/30 rounded-lg">
                    <span className="text-green-400 text-sm">📺</span>
                    <span className="text-xs text-green-400 font-medium">
                        Stream {byType.flatrate.length > 1 && `(${byType.flatrate.length})`}
                    </span>
                    <div className="flex -space-x-1">
                        {byType.flatrate.slice(0, 3).map((p, i) => (
                            p.logo ? (
                                <img
                                    key={i}
                                    src={p.logo}
                                    alt={p.name}
                                    className="w-5 h-5 rounded object-contain bg-cinema-900 ring-1 ring-cinema-800"
                                    title={p.name}
                                    loading="lazy"
                                />
                            ) : (
                                <span key={i} className="w-5 h-5 flex items-center justify-center bg-cinema-700 rounded text-xs">
                                    {p.name[0]}
                                </span>
                            )
                        ))}
                    </div>
                </div>
            )}

            {byType.rent.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-600/20 border border-orange-500/30 rounded-lg">
                    <span className="text-orange-400 text-sm">💰</span>
                    <span className="text-xs text-orange-400 font-medium">
                        Rent {byType.rent.length > 1 && `(${byType.rent.length})`}
                    </span>
                </div>
            )}

            {byType.buy.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                    <span className="text-blue-400 text-sm">🛒</span>
                    <span className="text-xs text-blue-400 font-medium">
                        Buy {byType.buy.length > 1 && `(${byType.buy.length})`}
                    </span>
                </div>
            )}

            {byType.free.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded-lg">
                    <span className="text-purple-400 text-sm">🎬</span>
                    <span className="text-xs text-purple-400 font-medium">
                        Free {byType.free.length > 1 && `(${byType.free.length})`}
                    </span>
                </div>
            )}

            {region && (
                <span className="text-xs text-cream-500 self-center ml-1">
                    in {region}
                </span>
            )}
        </div>
    );
}

/**
 * Compact StreamingIndicator - shows just the main streaming icon for cards
 */
export function StreamingIndicator({
    hasStreaming,
    className = ''
}: {
    hasStreaming: boolean;
    className?: string;
}) {
    return (
        <div
            className={`
                inline-flex items-center justify-center w-6 h-6 rounded-full
                ${hasStreaming
                    ? 'bg-green-600/30 border border-green-500/50'
                    : 'bg-cinema-800 border border-cinema-700'
                }
                ${className}
            `}
            title={hasStreaming ? 'Available to stream' : 'Not available to stream'}
        >
            <span className={hasStreaming ? 'text-green-400' : 'text-cream-500'}>
                {hasStreaming ? '📺' : '📡'}
            </span>
        </div>
    );
}

export default StreamingBadge;
