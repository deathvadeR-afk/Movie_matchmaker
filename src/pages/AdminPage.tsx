/**
 * Admin Page - Protected route for viewing subscription stats
 * Add your email to the allowed list to access
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard } from '../components/AdminDashboard';
import { Shield, X, AlertCircle, Loader2 } from 'lucide-react';

// ⚠️ IMPORTANT: Add your email here to access the admin panel
const ALLOWED_ADMIN_EMAILS = [
    'sagarroy54321@gmail.com', // Replace with your email
];

interface AdminPageProps {
    onClose?: () => void;
}

export function AdminPage({ onClose }: AdminPageProps) {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        checkAuthorization();
    }, [user, isAuthenticated, authLoading]);

    async function checkAuthorization() {
        setIsChecking(true);

        // Wait for auth to finish loading
        if (authLoading) {
            return;
        }

        // Check if user is logged in
        if (!isAuthenticated || !user) {
            setIsAuthorized(false);
            setIsChecking(false);
            return;
        }

        // Check if email is in allowed list (case insensitive)
        const userEmail = user.email?.toLowerCase();
        const isAllowed = ALLOWED_ADMIN_EMAILS.some(
            email => email.toLowerCase() === userEmail
        );

        setIsAuthorized(isAllowed);
        setIsChecking(false);
    }

    // Loading state
    if (isChecking || authLoading) {
        return (
            <div className="min-h-screen bg-cinema-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gold-600" />
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-cinema-950 flex items-center justify-center p-4">
                <div className="bg-cinema-800 border border-cinema-700 rounded-2xl p-8 max-w-md w-full text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
                        <Shield className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-cream-100 mb-2">Access Denied</h1>
                    <p className="text-cream-400">
                        You need to be logged in to view this page.
                    </p>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="mt-6 px-6 py-2 bg-cinema-700 hover:bg-cinema-600 text-cream-100 rounded-lg transition-colors"
                        >
                            Go Back
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Not authorized
    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-cinema-950 flex items-center justify-center p-4">
                <div className="bg-cinema-800 border border-cinema-700 rounded-2xl p-8 max-w-md w-full text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-full mb-4">
                        <AlertCircle className="w-8 h-8 text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-cream-100 mb-2">Access Denied</h1>
                    <p className="text-cream-400 mb-4">
                        Your email ({user?.email}) is not authorized to view this page.
                    </p>
                    <p className="text-cream-500 text-sm">
                        Contact the administrator to get access.
                    </p>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="mt-6 px-6 py-2 bg-cinema-700 hover:bg-cinema-600 text-cream-100 rounded-lg transition-colors"
                        >
                            Go Back
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Authorized - show dashboard
    return (
        <div className="min-h-screen bg-cinema-950 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold-600/20 rounded-lg">
                            <Shield className="w-6 h-6 text-gold-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-display font-bold text-cream-100">Admin Panel</h1>
                            <p className="text-cream-400">Subscription & User Analytics</p>
                        </div>
                    </div>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-cinema-700 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6 text-cream-400" />
                        </button>
                    )}
                </div>

                {/* Dashboard */}
                <AdminDashboard />
            </div>
        </div>
    );
}

/**
 * Quick setup: Replace with your email to access admin
 * 
 * Edit this file: src/pages/AdminPage.tsx
 * Find: const ALLOWED_ADMIN_EMAILS = [...]
 * Replace with: const ALLOWED_ADMIN_EMAILS = ['your-email@gmail.com']
 */

export default AdminPage;
