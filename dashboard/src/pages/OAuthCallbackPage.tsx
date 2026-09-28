import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Handles the redirect back from GitHub OAuth.
 * GitHub sends the user to /auth/success after a successful callback on the server.
 * This page refreshes the auth state and forwards to the dashboard.
 */
export default function OAuthCallbackPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const error = params.get('error');
    if (error) {
      navigate(`/?auth_error=${error}`, { replace: true });
      return;
    }

    // Refresh auth state then go to dashboard
    refresh().then(() => {
      navigate('/', { replace: true });
    });
  }, [refresh, navigate, params]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        gap: '1rem',
      }}
    >
      {/* Animated shield spinner */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animation: 'spin 1s linear infinite' }}
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
        Signing you in…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
