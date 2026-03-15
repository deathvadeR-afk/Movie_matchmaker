/**
 * Admin Dashboard - Track Subscription Statistics
 * View how many users are opting for premium
 */

import React, { useState, useEffect } from 'react';
import {
    Users,
    Crown,
    DollarSign,
    TrendingUp,
    RefreshCw,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { getSubscriptionStats } from '../lib/subscription';

interface SubscriptionStats {
    totalUsers: number;
    freeUsers: number;
    premiumUsers: number;
    willingToPay: number;
    averagePrice: number;
}

const TARGET_PREMIUM_USERS = 100; // Target for buying a paid API key

export function AdminDashboard() {
    const [stats, setStats] = useState<SubscriptionStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getSubscriptionStats();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load stats');
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-8 h-8 animate-spin text-gold-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const progressPercent = Math.min((stats.willingToPay / TARGET_PREMIUM_USERS) * 100, 100);
    const canAffordApiKey = stats.willingToPay >= 10; // After 10 users, we can consider it

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-display font-bold text-cream-100">Subscription Dashboard</h2>
                    <p className="text-cream-400">Track user subscription decisions</p>
                </div>
                <button
                    onClick={loadStats}
                    className="p-2 hover:bg-cinema-700 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-5 h-5 text-cream-400" />
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Users */}
                <div className="bg-cinema-800 rounded-xl p-4 border border-cinema-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold-600/20 rounded-lg">
                            <Users className="w-5 h-5 text-gold-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cream-100">{stats.totalUsers}</p>
                            <p className="text-cream-400 text-sm">Total Users</p>
                        </div>
                    </div>
                </div>

                {/* Free Users */}
                <div className="bg-cinema-800 rounded-xl p-4 border border-cinema-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <Users className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cream-100">{stats.freeUsers}</p>
                            <p className="text-cream-400 text-sm">Free (BYOK)</p>
                        </div>
                    </div>
                </div>

                {/* Premium Users */}
                <div className="bg-cinema-800 rounded-xl p-4 border border-cinema-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-premium-600/20 rounded-lg">
                            <Crown className="w-5 h-5 text-premium-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cream-100">{stats.premiumUsers}</p>
                            <p className="text-cream-400 text-sm">Premium</p>
                        </div>
                    </div>
                </div>

                {/* Willing to Pay */}
                <div className="bg-cinema-800 rounded-xl p-4 border border-cinema-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold-600/20 rounded-lg">
                            <DollarSign className="w-5 h-5 text-gold-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cream-100">{stats.willingToPay}</p>
                            <p className="text-cream-400 text-sm">Willing to Pay</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress to Goal */}
            <div className="bg-cinema-800 rounded-xl p-6 border border-cinema-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-gold-500" />
                        <h3 className="font-semibold text-cream-100">Progress to Paid API Key</h3>
                    </div>
                    <span className="text-2xl font-bold text-cream-100">
                        {stats.willingToPay} / {TARGET_PREMIUM_USERS}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="h-4 bg-cinema-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-green-500' : 'bg-gold-600'
                            }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <p className="text-cream-400 text-sm mt-3">
                    {progressPercent >= 100
                        ? '🎉 Target reached! You can now consider purchasing a paid API key.'
                        : `Need ${TARGET_PREMIUM_USERS - stats.willingToPay} more users willing to pay to reach the goal.`
                    }
                </p>
            </div>

            {/* Financial Viability */}
            <div className={`rounded-xl p-6 border ${canAffordApiKey
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-cinema-800 border-cinema-700'
                }`}>
                <div className="flex items-center gap-3 mb-3">
                    {canAffordApiKey ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                        <AlertCircle className="w-6 h-6 text-gray-400" />
                    )}
                    <h3 className={`font-semibold ${canAffordApiKey ? 'text-green-300' : 'text-white'}`}>
                        Financial Viability Check
                    </h3>
                </div>

                <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                        <span className="text-gray-400">Monthly potential revenue:</span>{' '}
                        <span className="font-bold text-white">₹{stats.willingToPay * 30}</span>
                    </p>
                    <p className="text-gray-300">
                        <span className="text-gray-400">Average willingness to pay:</span>{' '}
                        <span className="font-bold text-white">₹{stats.averagePrice}</span>
                    </p>

                    {canAffordApiKey ? (
                        <p className="text-green-300 mt-4">
                            ✅ With {stats.willingToPay} users, you have enough to cover a paid API key!
                        </p>
                    ) : (
                        <p className="text-gray-400 mt-4">
                            Keep promoting premium! Once you have enough users, you can provide a shared API key for premium users.
                        </p>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={loadStats}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Stats
                </button>

                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                        💡 <strong>Tip:</strong> Check this dashboard periodically to see how many users are interested in premium.
                        Once you reach the target, you can purchase a shared API key for premium users.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
