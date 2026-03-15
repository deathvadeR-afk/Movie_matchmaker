/**
 * Onboarding Flow
 * Complete user onboarding: API Key → Subscription Preference
 */

import React, { useState, useEffect } from 'react';
import {
    X,
    Key,
    Eye,
    EyeOff,
    Check,
    AlertCircle,
    Loader2,
    ExternalLink,
    ArrowRight,
    Crown,
    Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveApiKey, validateApiKeyFormat, testApiKey } from '../lib/apiKeyManager';
import { saveSubscriptionPreference } from '../lib/subscription';

interface OnboardingFlowProps {
    isOpen: boolean;
    onComplete: () => void;
}

/**
 * Step 1: API Key Input with Instructions
 */
function ApiKeyStep({ onNext }: { onNext: () => void }) {
    const [apiKey, setApiKey] = useState('');
    const [keyName, setKeyName] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(1);

    async function handleSubmit() {
        if (!apiKey) {
            setError('Please enter your API key');
            return;
        }

        const validation = validateApiKeyFormat('gemini', apiKey);
        if (!validation.valid) {
            setError(validation.message);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Test the key first
            const testResult = await testApiKey('gemini', apiKey);

            if (!testResult.success) {
                setError(testResult.message);
                setIsLoading(false);
                return;
            }

            // Save the key
            await saveApiKey('gemini', apiKey, keyName || 'My API Key');

            // Move to step 2 (subscription)
            setStep(2);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    }

    if (step === 2) {
        return <SubscriptionStep onComplete={onNext} />;
    }

    return (
        <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold-600 text-cinema-950 font-bold">1</div>
                <div className="flex-1 h-1 bg-cinema-700 rounded">
                    <div className="h-full bg-gold-600 rounded" style={{ width: '50%' }} />
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cinema-700 text-cream-400">2</div>
            </div>

            {/* Step 1: Instructions */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-600/20 rounded-full mb-4">
                    <Key className="w-8 h-8 text-gold-500" />
                </div>
                <h2 className="text-2xl font-display font-bold text-cream-100">Set Up Your API Key</h2>
                <p className="text-cream-400 mt-2">
                    You need a free Google Gemini API key to use AI features
                </p>
            </div>

            {/* Instructions */}
            <div className="bg-gold-600/10 border border-gold-600/30 rounded-xl p-4">
                <h4 className="font-medium text-gold-400 mb-3">How to get your free API key:</h4>
                <ol className="space-y-2 text-sm text-cream-300">
                    <li className="flex items-start gap-2">
                        <span className="text-gold-500 font-bold">1.</span>
                        <span>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-gold-400">Google AI Studio <ExternalLink className="w-3 h-3 inline" /></a></span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-gold-500 font-bold">2.</span>
                        <span>Sign in with your Google account</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-gold-500 font-bold">3.</span>
                        <span>Click "Create API Key" button</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-gold-500 font-bold">4.</span>
                        <span>Copy the key and paste below</span>
                    </li>
                </ol>
            </div>

            {/* API Key Input */}
            <div>
                <label className="block text-sm font-medium text-cream-300 mb-2">
                    Your Gemini API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                    <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIza..."
                        className="w-full px-4 py-3 pr-12 bg-cinema-800 border border-cinema-600 rounded-lg text-cream-100 placeholder-cream-400 focus:outline-none focus:ring-2 focus:ring-gold-600 focus:border-gold-600"
                    />
                    <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-cinema-700 rounded"
                    >
                        {showKey ? <EyeOff className="w-5 h-5 text-cream-400" /> : <Eye className="w-5 h-5 text-cream-400" />}
                    </button>
                </div>
            </div>

            {/* Key Name (optional) */}
            <div>
                <label className="block text-sm font-medium text-cream-300 mb-2">
                    Name this key (optional)
                </label>
                <input
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="My Gemini Key"
                    className="w-full px-4 py-3 bg-cinema-800 border border-cinema-600 rounded-lg text-cream-100 placeholder-cream-400 focus:outline-none focus:ring-2 focus:ring-gold-600 focus:border-gold-600"
                />
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-red-300 text-sm">{error}</span>
                </div>
            )}

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={!apiKey || isLoading}
                className={`w-full py-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${apiKey && !isLoading
                    ? 'bg-gold-600 hover:bg-gold-500 text-cinema-950 hover:shadow-glow'
                    : 'bg-cinema-600 text-cream-400 cursor-not-allowed'
                    }`}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Verifying...</span>
                    </>
                ) : (
                    <>
                        <span>Continue</span>
                        <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>

            {/* Skip option */}
            <button
                onClick={onNext}
                className="w-full text-center text-cream-500 hover:text-cream-400 text-sm"
            >
                I'll set up my API key later →
            </button>
        </div>
    );
}

/**
 * Step 2: Subscription Preference
 */
function SubscriptionStep({ onComplete }: { onComplete: () => void }) {
    const [selected, setSelected] = useState<'api' | 'premium' | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit() {
        if (!selected) return;

        setIsLoading(true);
        try {
            await saveSubscriptionPreference(
                selected === 'premium',
                selected === 'premium' ? 30 : 0,
                []
            );
            onComplete();
        } catch (error) {
            console.error('Error saving preference:', error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-cinema-950">
                    <Check className="w-4 h-4" />
                </div>
                <div className="flex-1 h-1 bg-cinema-700 rounded">
                    <div className="h-full bg-gold-600 rounded" style={{ width: '100%' }} />
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold-600 text-cinema-950 font-bold">2</div>
            </div>

            {/* Success message */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-full">
                    <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                    <p className="text-green-400 font-medium">API key verified successfully!</p>
                    <p className="text-green-400/70 text-sm">Now choose how you'd like to use the app</p>
                </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
                {/* Option 1: Free with own key */}
                <button
                    onClick={() => setSelected('api')}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selected === 'api'
                        ? 'border-gold-500 bg-gold-500/10'
                        : 'border-cinema-600 hover:border-cinema-500'
                        }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${selected === 'api' ? 'bg-gold-600' : 'bg-cinema-600'}`}>
                            <Key className="w-6 h-6 text-cinema-950" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-cream-100">Free - Bring Your Own Key</h3>
                            <p className="text-cream-400 text-sm">Use your own Gemini API key (free tier has limits)</p>
                        </div>
                        <div className="text-green-400 font-medium">Free</div>
                    </div>
                </button>

                {/* Option 2: Premium */}
                <button
                    onClick={() => setSelected('premium')}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selected === 'premium'
                        ? 'border-premium-500 bg-premium-600/10'
                        : 'border-cinema-600 hover:border-cinema-500'
                        }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${selected === 'premium' ? 'bg-premium-600' : 'bg-cinema-600'}`}>
                            <Crown className="w-6 h-6 text-cream-100" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-cream-100">Premium</h3>
                                <span className="px-2 py-0.5 bg-premium-600/20 text-premium-400 text-xs rounded-full">Best Value</span>
                            </div>
                            <p className="text-cream-400 text-sm">We provide the API key • No setup needed</p>
                        </div>
                        <div className="text-premium-400 font-bold">₹30/mo</div>
                    </div>

                    {/* Premium features */}
                    {selected === 'premium' && (
                        <div className="mt-4 pt-4 border-t border-cinema-600">
                            <p className="text-cream-300 text-sm mb-2">Includes:</p>
                            <ul className="grid grid-cols-2 gap-2 text-sm">
                                <li className="flex items-center gap-1 text-green-400"><Sparkles className="w-3 h-3" /> Personalized AI</li>
                                <li className="flex items-center gap-1 text-green-400"><Sparkles className="w-3 h-3" /> Priority Support</li>
                                <li className="flex items-center gap-1 text-green-400"><Sparkles className="w-3 h-3" /> Advanced Analytics</li>
                                <li className="flex items-center gap-1 text-green-400"><Sparkles className="w-3 h-3" /> Unlimited History</li>
                            </ul>
                        </div>
                    )}
                </button>
            </div>

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={!selected || isLoading}
                className={`w-full py-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${selected && !isLoading
                    ? 'bg-premium-600 hover:bg-premium-500 text-cream-100'
                    : 'bg-cinema-600 text-cream-400 cursor-not-allowed'
                    }`}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                    </>
                ) : (
                    <>
                        <span>Complete Setup</span>
                        <Check className="w-5 h-5" />
                    </>
                )}
            </button>
        </div>
    );
}

/**
 * Main Onboarding Flow Component
 */
export function OnboardingFlow({ isOpen, onComplete }: OnboardingFlowProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cinema-950/80 backdrop-blur-sm">
            <div className="bg-cinema-800 border border-gold-600/20 rounded-2xl max-w-lg w-full p-6 shadow-elevated">
                <ApiKeyStep onNext={onComplete} />
            </div>
        </div>
    );
}

export default OnboardingFlow;
