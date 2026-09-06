import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function LoginPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to sign in. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="auth-shell">
        <section className="auth-showcase" aria-labelledby="login-showcase-title">
          <div>
            <span className="auth-kicker">Viraloft workspace</span>
            <h1 id="login-showcase-title">Everything you need to manage growth in one place.</h1>
            <p>
              Sign in to browse available services, place and review orders, manage your account balance, and reach support from one focused dashboard.
            </p>
          </div>

          <div className="auth-proof-grid" aria-label="Platform benefits">
            <div className="auth-proof"><strong>Centralized</strong><span>Orders, services and support stay connected.</span></div>
            <div className="auth-proof"><strong>Responsive</strong><span>Designed for phone, tablet and desktop use.</span></div>
            <div className="auth-proof"><strong>Transparent</strong><span>Review service details before creating an order.</span></div>
          </div>
        </section>

        <section className="auth-panel" aria-labelledby="login-title">
          <h2 id="login-title">Welcome back</h2>
          <p>Use your Viraloft account credentials to continue.</p>

          {error && <div className="auth-alert" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            New to Viraloft? <Link to="/register">Create an account</Link>
          </p>
        </section>
      </main>
    </>
  );
}
