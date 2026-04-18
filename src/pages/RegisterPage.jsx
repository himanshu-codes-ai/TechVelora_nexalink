import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { recalculateTrustScore } from '../services/realtimeService';
import { findUserByReferralCode, recordReferral } from '../services/referralService';

export default function RegisterPage() {
  const { registerWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('individual');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const [referrerName, setReferrerName] = useState('');

  useEffect(() => {
    if (refCode) {
      findUserByReferralCode(refCode).then(user => {
        if (user) setReferrerName(user.name);
      }).catch(() => {});
    }
  }, [refCode]);

  async function handleRegister(e) {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await registerWithEmail(email, password, name, role, {
        industry,
        referredByCode: refCode || null
      });
      // Record the referral attribution
      if (refCode && user?.uid) {
        recordReferral(refCode, user.uid, email).catch(err => {
          console.warn('Referral attribution failed:', err.message);
        });
      }
      // Trigger initial trust calculation in background
      if (user?.uid) {
        recalculateTrustScore(user.uid).catch(err => {
          console.error('Trigger trust calc failed:', err);
        });
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to register');
    }
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign up with Google');
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <motion.div
        className="auth-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="auth-logo">
          <div className="navbar-brand-icon" style={{ width: 40, height: 40, fontSize: 16 }}>TL</div>
          <span style={{
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Nexalink</span>
        </div>

        <div className="auth-card">
          <h1 className="auth-title">Join Nexalink</h1>
          <p className="auth-subtitle">Build your trusted professional network</p>

          {/* Referral Badge */}
          {referrerName && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(124,58,237,0.1))',
              border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
            }}>
              <span>🎉</span>
              <span>Referred by <strong style={{ color: 'var(--color-primary)' }}>{referrerName}</strong></span>
            </div>
          )}

          {/* Role Selector */}
          <div className="role-selector">
            <div
              className={`role-option ${role === 'individual' ? 'selected' : ''}`}
              onClick={() => setRole('individual')}
              id="role-individual"
            >
              <div className="role-option-icon">👤</div>
              <div className="role-option-title">Individual</div>
              <div className="role-option-desc">Professional</div>
            </div>
            <div
              className={`role-option ${role === 'company' ? 'selected' : ''}`}
              onClick={() => setRole('company')}
              id="role-company"
            >
              <div className="role-option-icon">🏢</div>
              <div className="role-option-title">Company</div>
              <div className="role-option-desc">Organization</div>
            </div>
          </div>

          <button
            className="google-btn"
            onClick={handleGoogleSignup}
            disabled={loading}
            id="google-register-btn"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
              <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">or</div>

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label" htmlFor="register-name">
                {role === 'company' ? 'Company Name' : 'Full Name'}
              </label>
              <input
                type="text"
                className="form-input"
                id="register-name"
                placeholder={role === 'company' ? 'Acme Inc.' : 'John Doe'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {role === 'company' && (
              <div className="form-group">
                <label className="form-label" htmlFor="register-industry">Industry</label>
                <select
                  className="form-select"
                  id="register-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="">Select industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Retail">Retail</option>
                  <option value="Media">Media</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="register-email">Work Email</label>
              <input
                type="email"
                className="form-input"
                id="register-email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-password">Password</label>
              <input
                type="password"
                className="form-input"
                id="register-password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="form-error mb-3">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
              id="register-btn"
            >
              {loading ? '⏳ Creating account...' : `Create ${role === 'company' ? 'Company' : ''} Account`}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" id="login-link">Sign in</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
