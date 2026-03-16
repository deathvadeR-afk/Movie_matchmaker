import React, { useState, useRef, useEffect } from 'react';
import { OTT_PLATFORMS, OTTPlatform } from '../../types';
import { ChevronDown, X, Check } from 'lucide-react';

interface OTTSelectorProps {
    selectedPlatforms: string[];
    onChange: (platforms: string[]) => void;
    disabled?: boolean;
}

export function OTTSelector({ selectedPlatforms, onChange, disabled }: OTTSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const togglePlatform = (platformId: string) => {
        if (selectedPlatforms.includes(platformId)) {
            onChange(selectedPlatforms.filter(p => p !== platformId));
        } else {
            onChange([...selectedPlatforms, platformId]);
        }
    };

    const clearAll = () => {
        onChange([]);
    };

    const selectedPlatformData = OTT_PLATFORMS.filter(p => selectedPlatforms.includes(p.id));

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200
                    ${disabled
                        ? 'bg-cinema-800/50 border-cinema-700/50 cursor-not-allowed opacity-50'
                        : 'bg-cinema-800/50 border-cinema-700/50 hover:border-gold-600/30 hover:text-gold-500 cursor-pointer text-cream-300'
                    }
                `}
            >
                <span className="text-sm">
                    {selectedPlatforms.length === 0
                        ? '📺 All Streaming'
                        : `${selectedPlatforms.length} Platform${selectedPlatforms.length > 1 ? 's' : ''}`}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Selected Platforms Chips */}
            {selectedPlatforms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {selectedPlatformData.map(platform => (
                        <span
                            key={platform.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: platform.color + '20', color: platform.color }}
                        >
                            {platform.name}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    togglePlatform(platform.id);
                                }}
                                className="hover:bg-white/20 rounded-full p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 mt-2 w-72 bg-cinema-900 border border-cinema-700/50 rounded-lg shadow-xl animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-cinema-700/50">
                        <span className="text-sm font-medium text-cream-200">Filter by Platform</span>
                        {selectedPlatforms.length > 0 && (
                            <button
                                type="button"
                                onClick={clearAll}
                                className="text-xs text-gold-500 hover:text-gold-400"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Platform List */}
                    <div className="max-h-64 overflow-y-auto py-1">
                        {OTT_PLATFORMS.map(platform => {
                            const isSelected = selectedPlatforms.includes(platform.id);
                            return (
                                <button
                                    key={platform.id}
                                    type="button"
                                    onClick={() => togglePlatform(platform.id)}
                                    className={`
                    w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                    ${isSelected ? 'bg-gold-600/10' : 'hover:bg-cinema-800/50'}
                  `}
                                >
                                    {/* Checkbox */}
                                    <div className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                    ${isSelected ? 'bg-gold-600 border-gold-600' : 'border-cinema-600'}
                  `}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>

                                    {/* Platform Logo/Icon */}
                                    <div
                                        className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white"
                                        style={{ backgroundColor: platform.color }}
                                    >
                                        {platform.logo}
                                    </div>

                                    {/* Platform Name */}
                                    <span className={`flex-1 ${isSelected ? 'text-cream-100' : 'text-cream-300'}`}>
                                        {platform.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
