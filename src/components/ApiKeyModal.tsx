/**
 * API Key Modal
 * Allows users to input their own Gemini API key
 */

import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, Check, AlertCircle, Loader2, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { saveApiKey, validateApiKeyFormat, testApiKey } from '../lib/apiKeyManager';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export function ApiKeyModal({ isOpen, onClose, onComplete }: ApiKeyModalProps) {
    const [apiKey, setApiKey] = useState('');
    const [keyName, setKeyName] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);

    // Reset form when modal opens/closes
    React.useEffect(() => {
        if (!isOpen) {
            setApiKey('');
            setKeyName('');
            setError(null);
            setSuccess(false);
            setValidationResult(null);
        }
    }, [isOpen]);

    function handleKeyChange(value: string) {
        setApiKey(value);
        setValidationResult(null);

        // Validate on change if there's enough input
        if (value.length >= 10) {
            const result = validateApiKeyFormat('gemini', value);
            setValidationResult(result);
        }
    }

    async function handleSubmit() {
        // Validate first
        const validation = validateApiKeyFormat('gemini', apiKey);
        if (!validation.valid) {
            setError(validation.message);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Save the key
            await saveApiKey('gemini', apiKey, keyName || 'My Gemini Key');

            // Test the key
            const testResult = await testApiKey('gemini', apiKey);

            if (testResult.success) {
                setSuccess(true);
                setTimeout(() => {
                    onComplete();
                }, 1500);
            } else {
                setError(testResult.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    }

    function handleSkip() {
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cinema-950/80 backdrop-blur-sm">
            <div className="bg-cinema-800 border border-gold-600/20 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-elevated">
                {/* Header */}
                <div className="p-6 border-b border-cinema-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gold-600/20 rounded-lg">
                                <Key className="w-6 h-6 text-gold-500" />
                            </div>
                            <h2 className="text-xl font-display font-bold text-cream-100">Add Your API Key</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-cinema-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    <p className="text-gray-400 mt-2">
                        To use AI recommendations, you need to provide your own Gemini API key
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* What is API Key */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <h4 className="font-medium text-blue-300 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            What is an API Key?
                        </h4>
                        <p className="text-blue-200/80 text-sm mt-2">
                            An API key is like a password that allows our app to use Google's AI (Gemini).
                            You can get one for free at Google AI Studio.
                        </p>
                        <a
                            href="https://makersuite.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-3 text-sm text-blue-400 hover:text-blue-300"
                        >
                            Get free API key <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    {/* API Key Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Gemini API Key <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => handleKeyChange(e.target.value)}
                                placeholder="AIza..."
                                className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-600 rounded"
                            >
                                {showKey ? (
                                    <EyeOff className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <Eye className="w-5 h-5 text-gray-400" />
                                )}
                            </button>
                        </div>

                        {/* Validation feedback */}
                        {validationResult && (
                            <div className={`mt-2 flex items-center gap-2 text-sm ${validationResult.valid ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {validationResult.valid ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <AlertCircle className="w-4 h-4" />
                                )}
                                <span>{validationResult.message}</span>
                            </div>
                        )}
                    </div>

                    {/* Key Name (optional) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Key Name (optional)
                        </label>
                        <input
                            type="text"
                            value={keyName}
                            onChange={(e) => setKeyName(e.target.value)}
                            placeholder="My Gemini Key"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="text-gray-500 text-xs mt-1">
                            Give your key a name to remember which one this is
                        </p>
                    </div>

                    {/* Success message */}
                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                            <span className="text-green-300 text-sm">API key saved successfully!</span>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <span className="text-red-300 text-sm">{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-cinema-700 flex gap-3">
                    <button
                        onClick={handleSkip}
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 bg-cinema-700 hover:bg-cinema-600 text-cream-300 rounded-lg font-medium transition-colors"
                    >
                        Skip for now
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!apiKey || isLoading}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${apiKey
                            ? 'bg-gold-600 hover:bg-gold-500 text-cinema-950 hover:shadow-glow'
                            : 'bg-cinema-600 text-cream-400 cursor-not-allowed'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <span>Save API Key</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ApiKeyModal;
