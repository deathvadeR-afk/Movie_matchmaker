import React from 'react';
import { Star } from 'lucide-react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hover?: boolean;
}

export function Card({ children, className = '', onClick, hover = true }: CardProps) {
    return (
        <div
            className={`
        bg-cinema-800/80 backdrop-blur-sm border border-cinema-700/50 rounded-xl
        transition-all duration-300 ease-out
        shadow-card
        ${hover ? 'hover:border-gold-600/30 hover:shadow-elevated hover:shadow-glow hover:-translate-y-0.5' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

// Movie Card specific component
interface MovieCardProps {
    title: string;
    posterUrl?: string;
    rating?: number;
    year?: number;
    overview?: string;
    onClick?: () => void;
    className?: string;
}

export function MovieCard({
    title,
    posterUrl,
    rating,
    year,
    overview,
    onClick,
    className = ''
}: MovieCardProps) {
    return (
        <div
            className={`
        relative overflow-hidden rounded-xl bg-cinema-800 
        transition-all duration-300 ease-out cursor-pointer
        shadow-card group
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
            onClick={onClick}
        >
            {/* Poster */}
            <div className="relative aspect-[2/3] overflow-hidden">
                {posterUrl ? (
                    <img
                        src={posterUrl}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full bg-cinema-700 flex items-center justify-center">
                        <span className="text-cream-400 font-display text-4xl">🎬</span>
                    </div>
                )}

                {/* Rating badge */}
                {rating !== undefined && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-cinema-950/80 backdrop-blur-sm rounded-lg">
                        <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-500" />
                        <span className="text-sm font-medium text-cream-100">{rating.toFixed(1)}</span>
                    </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-cinema-950 via-cinema-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    {overview && (
                        <p className="text-sm text-cream-200 line-clamp-3 mb-2">{overview}</p>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="p-3">
                <h3 className="font-display font-semibold text-cream-100 line-clamp-1 group-hover:text-gold-500 transition-colors">
                    {title}
                </h3>
                {year && (
                    <p className="text-sm text-cream-400 mt-1">{year}</p>
                )}
            </div>
        </div>
    );
}

export default Card;
