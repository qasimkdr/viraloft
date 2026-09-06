import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../lib/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };
      const response = await api.post('/auth/register', payload);
      setMessage(response?.data?.message || 'Registration successful. Please verify your email.');
      navigate(`/verify-email?email=${encodeURIComponent(payload.email)}`, { replace: true });
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Registration failed. Please review your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="auth-shell">
        <section className="auth-showcase" aria-labelledby="register-showcase-title">
          <div>
            <span className="auth-kicker">Create your workspace</span>
            <h1 id="register-showcase-title">Start with a cleaner way to manage your social media services.</h1>
            <p>
              Create one account to browse services, place orders, track activity and open support tickets from a responsive Viraloft dashboard.
            </p>
          </div>

          <div className="auth-proof-grid" aria-label="Account benefits">
            <div className="auth-proof"><strong>Fast setup</strong><span>Create an account with only the details required to get started.</span></div>
            <div className="auth-proof"><strong>Email verification</strong><span>Your address is verified before account access is activated.</span></div>
            <div className="auth-proof"><strong>One dashboard</strong><span>Keep service browsing, orders and support in one place.</span></div>
          </div>
        </section>

        <section className="auth-panel" aria-labelledby="register-title">
          <h2 id="register-title">Create account</h2>
          <p>Set up your Viraloft account. You will verify your email next.</p>

          {message && <div className="auth-alert" role="status">{message}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="register-username">Username</label>
              <input
                id="register-username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                placeholder="Choose a username"
                minLength={3}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>

            <button type="submit" disabled={submitting} className="auth-submit">
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </main>
    </>
  );
}
