/**
 * Subscription Preference Modal
 * Allows users to opt-in to paid subscription or bring their own API key
 */

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Key, Check, AlertCircle, Loader2 } from 'lucide-react';
import { saveSubscriptionPreference, getSubscriptionPlans } from '../lib/subscription';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

interface Plan {
    id: string;
    name: string;
    price_inr: number;
    features: Record<string, unknown>;
}

export function SubscriptionModal({ isOpen, onClose, onComplete }: SubscriptionModalProps) {
    const [selectedOption, setSelectedOption] = useState<'api' | 'premium' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadPlans();
        }
    }, [isOpen]);

    async function loadPlans() {
        try {
            const data = await getSubscriptionPlans();
            setPlans(data);
        } catch (err) {
            console.error('Error loading plans:', err);
        }
    }

    async function handleSubmit() {
        if (!selectedOption) {
            setError('Please select an option');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await saveSubscriptionPreference(
                selectedOption === 'premium', // willingToPay
                selectedOption === 'premium' ? 30 : 0, // preferredPricePoint
                [] // paymentMethodInterest
            );
            onComplete();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    }

    if (!isOpen) return null;

    const premiumPlan = plans.find(p => p.id === 'premium');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cinema-950/80 backdrop-blur-sm">
            <div className="bg-cinema-800 border border-gold-600/20 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-elevated">
                {/* Header */}
                <div className="p-6 border-b border-cinema-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-display font-bold text-cream-100">Choose Your Plan</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-cinema-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-cream-400" />
                        </button>
                    </div>
                    <p className="text-cream-400 mt-2">
                        Get the most out of AI-powered movie recommendations
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Option 1: Bring Your Own API Key */}
                    <button
                        onClick={() => setSelectedOption('api')}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedOption === 'api'
                            ? 'border-gold-500 bg-gold-500/10'
                            : 'border-cinema-600 hover:border-cinema-500'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${selectedOption === 'api' ? 'bg-gold-600' : 'bg-cinema-600'}`}>
                                <Key className="w-6 h-6 text-cinema-950" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-cream-100 text-lg">Bring Your Own API Key</h3>
                                <p className="text-cream-400 text-sm mt-1">
                                    Use your own Gemini API key. You'll need to create one at makersuite.google.com/app/apikey
                                </p>
                                <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                                    <Check className="w-4 h-4" />
                                    <span>Free to use</span>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-cinema-700" />
                        <span className="text-cream-500 text-sm">OR</span>
                        <div className="flex-1 h-px bg-cinema-700" />
                    </div>

                    {/* Option 2: Premium Subscription */}
                    <button
                        onClick={() => setSelectedOption('premium')}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedOption === 'premium'
                            ? 'border-premium-500 bg-premium-600/10'
                            : 'border-cinema-600 hover:border-cinema-500'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${selectedOption === 'premium' ? 'bg-premium-600' : 'bg-cinema-600'}`}>
                                <CreditCard className="w-6 h-6 text-cream-100" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-cream-100 text-lg">Premium Plan</h3>
                                    {premiumPlan && (
                                        <span className="px-2 py-0.5 bg-premium-600/20 text-premium-400 text-xs rounded-full">
                                            ₹{premiumPlan.price_inr}/month
                                        </span>
                                    )}
                                </div>
                                <p className="text-cream-400 text-sm mt-1">
                                    We'll provide the API key. Just sit back and enjoy recommendations!
                                </p>
                                <ul className="mt-3 space-y-1">
                                    <li className="flex items-center gap-2 text-green-400 text-sm">
                                        <Check className="w-4 h-4" />
                                        <span>500 AI recommendations/month</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-green-400 text-sm">
                                        <Check className="w-4 h-4" />
                                        <span>Priority support</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-green-400 text-sm">
                                        <Check className="w-4 h-4" />
                                        <span>No API key needed</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </button>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <span className="text-red-300 text-sm">{error}</span>
                        </div>
                    )}

                    {/* Note */}
                    <div className="p-3 bg-gold-600/10 border border-gold-600/30 rounded-lg">
                        <p className="text-gold-400 text-sm">
                            💡 <strong>Tip:</strong> You can change your preference anytime in Settings.
                            If you choose "Bring Your Own API Key" but later want to switch to Premium,
                            we'll give you a pro-rated credit!
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-cinema-700">
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedOption || isLoading}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${selectedOption
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
                            <span>Continue</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SubscriptionModal;
