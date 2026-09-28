import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import OverviewPage from './pages/OverviewPage';
import ReposListPage from './pages/ReposListPage';
import RepoPage from './pages/RepoPage';
import ReviewPage from './pages/ReviewPage';
import LandingPage from './pages/LandingPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';

// ---------------------------------------------------------------------------
// ProtectedRoute — shows landing page when not authenticated
// ---------------------------------------------------------------------------

function ProtectedApp() {
  const { authenticated, loading } = useAuth();

  // Show nothing while we check session (avoids flicker)
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'spin 1.2s linear infinite' }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p style={{ color: '#71717a', fontSize: '0.9rem' }}>Loading CodeWarden…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Not logged in → show marketing landing page
  if (!authenticated) {
    return <LandingPage />;
  }

  // Logged in → show the full dashboard
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="repos" element={<ReposListPage />} />
        <Route path="repos/:repoId" element={<RepoPage />} />
        <Route path="reviews/:reviewId" element={<ReviewPage />} />
      </Route>
      {/* Catch all — redirect unknown paths to dashboard root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* OAuth callback route — accessible before auth */}
          <Route path="/auth/success" element={<OAuthCallbackPage />} />
          {/* Everything else goes through the auth guard */}
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
