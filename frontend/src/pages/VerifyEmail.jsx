import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../lib/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const navigate = useNavigate();

  const cooldownLabel = useMemo(() => {
    const minutes = String(Math.floor(cooldown / 60)).padStart(2, '0');
    const seconds = String(cooldown % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [cooldown]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (event) => {
    event.preventDefault();
    setMessage('');
    setMessageType('');
    setLoading(true);
    try {
      const response = await api.post('/api/auth/verify', {
        email: email.toLowerCase().trim(),
        code: code.trim(),
      });
      setMessage(response.data?.message || 'Email verified successfully.');
      setMessageType('success');

      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
        if (response.data?.user) localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Verification failed. Check the code and try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setMessage('Enter your email address first.');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    setMessageType('');
    try {
      const response = await api.post('/api/auth/resend', { email: email.toLowerCase().trim() });
      setMessage(response.data?.message || 'A new verification code has been sent.');
      setMessageType('success');
      setCooldown(60);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Unable to resend the code right now.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="auth-shell">
        <section className="auth-showcase" aria-labelledby="verify-showcase-title">
          <div>
            <span className="auth-kicker">One final step</span>
            <h1 id="verify-showcase-title">Verify your email to activate your account.</h1>
            <p>
              We use email verification to confirm account ownership before opening the Viraloft dashboard. Enter the six-digit code sent to your registered address.
            </p>
          </div>
          <div className="auth-proof-grid">
            <div className="auth-proof"><strong>6 digits</strong><span>Enter only the numeric verification code from your email.</span></div>
            <div className="auth-proof"><strong>60 second resend</strong><span>A short cooldown helps prevent accidental repeated requests.</span></div>
            <div className="auth-proof"><strong>Account access</strong><span>Successful verification takes you directly to your dashboard.</span></div>
          </div>
        </section>

        <section className="auth-panel" aria-labelledby="verify-title">
          <h2 id="verify-title">Verify email</h2>
          <p>Check your inbox and enter the code below.</p>

          {message && (
            <div className={`auth-alert ${messageType === 'success' ? 'auth-success' : ''}`} role="status">
              {message}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div className="auth-field">
              <label htmlFor="verify-email">Email address</label>
              <input
                id="verify-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="verify-code">Verification code</label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{ letterSpacing: '.35em', textAlign: 'center', fontWeight: 800 }}
                required
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading || code.length !== 6}>
              {loading ? 'Verifying…' : 'Verify and continue'}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <button type="button" onClick={handleResend} disabled={loading || cooldown > 0} className="font-semibold text-indigo-200 disabled:cursor-not-allowed disabled:opacity-50">
              {cooldown > 0 ? `Resend in ${cooldownLabel}` : 'Resend code'}
            </button>
            <Link to="/login" className="font-semibold text-slate-400 hover:text-white">Back to sign in</Link>
          </div>
        </section>
      </main>
    </>
  );
}
