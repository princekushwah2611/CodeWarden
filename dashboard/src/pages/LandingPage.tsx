import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Tiny icon primitives (inline SVG so no extra deps)
// ---------------------------------------------------------------------------

const ShieldIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58l-.01-2.24c-3.34.72-4.04-1.42-4.04-1.42-.54-1.38-1.33-1.74-1.33-1.74-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22l-.01 3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const LockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const BookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// ---------------------------------------------------------------------------
// Feature cards data
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: <LockIcon />,
    title: 'OWASP Security Scan',
    desc: 'Detects SQL injection, XSS, hardcoded secrets, unsafe deserialization, and more — powered by Semgrep + Claude.',
  },
  {
    icon: <BookIcon />,
    title: 'Standards RAG Agent',
    desc: 'Upload your team\'s style guide once. CodeWarden retrieves the relevant sections for every PR automatically.',
  },
  {
    icon: <ZapIcon />,
    title: 'Instant PR Feedback',
    desc: 'Reviews post within seconds of a PR being opened. Line-level GitHub comments with explanations, not just rule IDs.',
  },
];

const HOW_IT_WORKS = [
  { step: '1', label: 'Connect GitHub', desc: 'Sign in and install the CodeWarden App on your org or repos.' },
  { step: '2', label: 'Upload your standards', desc: 'Drop your team\'s markdown style guide — CodeWarden learns it via vector embeddings.' },
  { step: '3', label: 'Open a PR', desc: 'CodeWarden automatically reviews every PR, posts inline comments, and approves or blocks based on your threshold.' },
];

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const { login } = useAuth();
  const [params] = useSearchParams();
  const authError = params.get('auth_error');
  const [installLoading, setInstallLoading] = useState(false);

  const handleInstallApp = async () => {
    setInstallLoading(true);
    try {
      const res = await fetch('/api/auth/install-url', { credentials: 'include' });
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setInstallLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── NAV ── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: '#6366f1' }}>
          <ShieldIcon />
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>CodeWarden</span>
        </div>
        <button
          onClick={login}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: '#24292f', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '0.5rem 1.1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <GitHubIcon /> Sign in with GitHub
        </button>
      </nav>

      {/* ── ERROR BANNER ── */}
      {authError && (
        <div style={{ background: '#3f1212', color: '#fca5a5', padding: '0.75rem 2rem', textAlign: 'center', fontSize: '0.875rem' }}>
          ⚠️ Authentication failed ({authError}). Please try again.
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ textAlign: 'center', padding: '5rem 1.5rem 4rem', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '9999px', padding: '0.35rem 1rem', fontSize: '0.8rem', fontWeight: 600,
          marginBottom: '1.75rem', letterSpacing: '0.04em',
        }}>
          <ShieldIcon /> AGENTIC AI CODE REVIEW
        </div>

        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1.25rem' }}>
          Every PR reviewed before
          <br />
          <span style={{ color: '#6366f1' }}>a human reads a line.</span>
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.7, margin: '0 auto 2.5rem', maxWidth: '560px' }}>
          CodeWarden watches every pull request for security risks and standards drift — then posts precise, line-level comments within seconds.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* PRIMARY CTA */}
          <button
            onClick={login}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              background: '#24292f', color: '#fff', border: '1.5px solid #444',
              borderRadius: '10px', padding: '0.85rem 1.75rem',
              fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 0 0 0 #6366f1',
              transition: 'box-shadow 0.2s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.35)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 0 #6366f1';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            <GitHubIcon />
            Connect with GitHub
          </button>

          {/* INSTALL APP BUTTON */}
          <button
            onClick={handleInstallApp}
            disabled={installLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              background: 'transparent', color: '#6366f1', border: '1.5px solid rgba(99,102,241,0.5)',
              borderRadius: '10px', padding: '0.85rem 1.75rem',
              fontSize: '1rem', fontWeight: 600, cursor: installLoading ? 'wait' : 'pointer',
              opacity: installLoading ? 0.7 : 1,
              transition: 'border-color 0.2s, transform 0.15s',
            }}
            onMouseEnter={(e) => { if (!installLoading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.5)'; }}
          >
            {installLoading ? 'Redirecting…' : '⚡ Install GitHub App'}
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '1rem', opacity: 0.7 }}>
          Free to connect · No credit card required · Works with GitHub Cloud
        </p>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem 1.5rem 5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '1.75rem', transition: 'border-color 0.2s',
            }}
              onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.5)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
            >
              <div style={{ color: '#6366f1', marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.9rem', marginBottom: '0.5rem' }}>How it works</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>Three steps from zero to automated code review.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} style={{ textAlign: 'left' }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                  background: 'rgba(99,102,241,0.15)', border: '1.5px solid rgba(99,102,241,0.4)',
                  color: '#818cf8', fontWeight: 800, fontSize: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem',
                }}>
                  {item.step}
                </div>
                <h4 style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{item.label}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT'S CHECKED ── */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.9rem', marginBottom: '2rem', textAlign: 'center' }}>What CodeWarden checks</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            'SQL injection (A01)',
            'Hardcoded secrets & API keys',
            'Broken authentication patterns',
            'Unsafe deserialization',
            'Missing input validation',
            'XSS vulnerabilities',
            'Insecure direct object references',
            'Team naming conventions',
            'Error handling patterns',
            'Import / module standards',
            'Missing error boundaries',
            'Undocumented public APIs',
          ].map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
              <CheckIcon /> {item}
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ textAlign: 'center', padding: '4rem 1.5rem 5rem', borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '1rem' }}>
          Ready to stop reviewing PRs manually?
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Connect your GitHub account and install the App — CodeWarden is running in under 5 minutes.
        </p>
        <button
          onClick={login}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
            background: '#6366f1', color: '#fff', border: 'none',
            borderRadius: '10px', padding: '0.9rem 2rem',
            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
            transition: 'opacity 0.2s, transform 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          <GitHubIcon /> Connect with GitHub — it's free
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <span style={{ color: '#6366f1' }}>🛡️</span> CodeWarden · Agentic AI Code Review
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Built with Claude + Semgrep + ChromaDB</span>
      </footer>
    </div>
  );
}
