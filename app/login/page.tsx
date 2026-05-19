"use client";
import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setError('Incorrect password. Please try again.'); return; }
      router.push(params.get('redirect') ?? '/');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', font: '600 13px/20px var(--font-body)', color: '#242424', marginBottom: 6 }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter access password"
          autoFocus
          style={{
            display: 'block', width: '100%', height: 44, padding: '0 14px',
            border: `1.5px solid ${error ? '#DB1D1D' : '#E4E4E4'}`,
            borderRadius: 8, background: '#fff', outline: 'none',
            fontSize: 14, color: '#242424',
            boxSizing: 'border-box', transition: 'border-color 150ms',
          }}
          onFocus={e => { e.target.style.borderColor = error ? '#DB1D1D' : '#067A46'; e.target.style.boxShadow = '0 0 0 3px rgba(6,122,70,.15)'; }}
          onBlur={e  => { e.target.style.borderColor = error ? '#DB1D1D' : '#E4E4E4'; e.target.style.boxShadow = 'none'; }}
        />
        {error && (
          <div style={{ fontSize: 12, color: '#DB1D1D', marginTop: 6 }}>{error}</div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !password}
        style={{
          width: '100%', height: 44, borderRadius: 8, border: 0,
          background: loading || !password ? '#E4E4E4' : '#067A46',
          color: loading || !password ? '#BBB' : '#fff',
          fontSize: 15, fontWeight: 600,
          cursor: loading || !password ? 'not-allowed' : 'pointer',
          transition: 'all 200ms',
        }}
      >
        {loading ? 'Signing in…' : 'Sign in →'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #035624 0%, #067A46 50%, #00A846 100%)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 40px', width: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Logo — matches the sidebar brand post-login */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#96DC14',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#035624', fontWeight: 700, fontSize: 18,
          }}>P</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#242424' }}>Procurement Analytics</div>
            <div style={{ fontSize: 12, color: '#676767' }}>Category Management</div>
          </div>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 500, color: '#242424', margin: '0 0 6px' }}>
          Spend Analysis
        </h1>
        <p style={{ fontSize: 14, color: '#676767', margin: '0 0 32px' }}>
          Enter your access password to continue.
        </p>

        <Suspense fallback={<div style={{ height: 100 }} />}>
          <LoginForm />
        </Suspense>

        <div style={{ marginTop: 24, padding: '12px 16px', background: '#F8F8F8', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#676767' }}>
            🔒 This dashboard contains confidential procurement data. Authorised access only.
          </div>
        </div>
      </div>
    </div>
  );
}
