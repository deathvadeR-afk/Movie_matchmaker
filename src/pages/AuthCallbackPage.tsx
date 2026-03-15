/**
 * Auth Callback Page
 * Handles OAuth callback from Supabase
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        async function handleCallback() {
            try {
                // Check for error in URL params first
                const urlParams = new URLSearchParams(window.location.search);
                const errorParam = urlParams.get('error');
                const errorDescription = urlParams.get('error_description');

                if (errorParam) {
                    setError(errorDescription || errorParam);
                    setIsProcessing(false);
                    return;
                }

                // Check if session exists (Supabase auto-populates from URL hash)
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setError(sessionError.message || 'Authentication failed');
                    setIsProcessing(false);
                    return;
                }

                if (session) {
                    // Session found - redirect to home
                    const timer = setTimeout(() => {
                        navigate('/', { replace: true });
                    }, 1000);
                    return () => clearTimeout(timer);
                } else {
                    // No session - might be an error or user cancelled
                    setError('Authentication was not completed');
                }
            } catch (err) {
                console.error('Auth callback error:', err);
                setError('An unexpected error occurred');
            } finally {
                setIsProcessing(false);
            }
        }

        handleCallback();
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen bg-cinema-950 flex items-center justify-center px-6">
                <div className="max-w-md text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h1 className="text-2xl font-display font-bold text-cream-100 mb-4">
                        Authentication Failed
                    </h1>
                    <p className="text-cream-300 mb-6">{error}</p>
                    <a
                        href="/login"
                        className="inline-flex items-center justify-center px-6 py-3 bg-gold-600 text-cinema-950 font-medium rounded-lg hover:bg-gold-500 transition-colors"
                    >
                        Back to Login
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cinema-950 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-12 h-12 text-gold-600 animate-spin mx-auto mb-4" />
                <p className="text-cream-300">Completing sign in...</p>
            </div>
        </div>
    );
}
