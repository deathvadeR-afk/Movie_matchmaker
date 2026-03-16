/**
 * Main App Router
 * Sets up React Router with protected routes
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import App from './App';
import AdminPage from './pages/AdminPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { useAuth } from './contexts/AuthContext';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-cinema-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gold-600/20 border-t-gold-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to login with return URL
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

/**
 * Public Route Component
 * Redirects to home if user is already authenticated
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-cinema-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gold-600/20 border-t-gold-600 rounded-full animate-spin" />
            </div>
        );
    }

    // If already authenticated, redirect to home
    if (isAuthenticated) {
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
        return <Navigate to={from} replace />;
    }

    return <>{children}</>;
}

/**
 * App Router Content
 * Contains the route definitions
 */
function AppRouterContent() {
    return (
        <Routes>
            {/* Public Routes - accessible without login */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Protected Routes - require authentication */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <App />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute>
                        <AdminPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/analytics"
                element={
                    <ProtectedRoute>
                        <AnalyticsPage />
                    </ProtectedRoute>
                }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

/**
 * Main App Router
 */
export function AppRouter() {
    return (
        <BrowserRouter>
            <AppRouterContent />
        </BrowserRouter>
    );
}

export default AppRouter;
