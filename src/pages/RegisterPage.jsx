
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { recalculateTrustScore } from '../services/realtimeService';
import { findUserByReferralCode, recordReferral } from '../services/referralService';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export default function RegisterPage() {
  const [faceVerified, setFaceVerified] = useState(false);

  const { registerWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const [role, setRole] = useState('individual');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const refCode = searchParams.get('ref') || '';
  const [referrerName, setReferrerName] = useState('');

  useEffect(() => {
    if (!refCode) return;

    findUserByReferralCode(refCode)
      .then((user) => {
        if (user) setReferrerName(user.name || '');
      })
      .catch(() => { });
  }, [refCode]);

  useEffect(() => {
    function handleMessage(event) {
      if (event.data?.type === 'FACE_VERIFIED') {
        setFaceVerified(true);
        setError('');
        alert(t('register.faceEnrollmentCompleted'));
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [t]);

  async function handleRegister(e) {
    e.preventDefault();

    if (!faceVerified) {
      setError(t('register.completeFaceVerification'));
      return;
    }

    if (!name || !email || !password) {
      setError(t('register.fillRequiredFields'));
      return;
    }

    if (password.length < 6) {
      setError(t('register.passwordMin'));
      return;
    }

    if (role === 'company' && !industry) {
      setError(t('register.selectIndustry'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await registerWithEmail(email, password, name, role, {
        industry,
        referredByCode: refCode || null
      });

      if (refCode && user?.uid) {
        recordReferral(refCode, user.uid, email).catch((err) => {
          console.warn('Referral attribution failed:', err?.message || err);
        });
      }

      if (user?.uid) {
        recalculateTrustScore(user.uid).catch((err) => {
          console.error('Trigger trust calc failed:', err);
        });
      }

      navigate('/');
    } catch (err) {
      setError(err?.message || t('register.failedToRegister'));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    if (!faceVerified) {
      setError(t('register.completeFaceVerification'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(err?.message || t('register.failedGoogleSignup'));
    } finally {
      setLoading(false);
    }
  }

  function handleFaceEnroll() {
    if (!email.trim()) {
      setError(t('register.enterEmailBeforeFace'));
      return;
    }

    const encodedEmail = encodeURIComponent(email.trim().toLowerCase());
    window.open(`http://localhost:3001/?mode=enroll&userId=${encodedEmail}`, '_blank');
  }

  return (
    <div className="auth-page">
      <motion.div
        className="auth-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <LanguageSwitcher />
        </div>

        <div className="auth-logo">
          <div
            className="navbar-brand-icon"
            style={{ width: 46, height: 46, fontSize: 18 }}
          >
            TL
          </div>
          <span
            style={{
              background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '2rem',
              fontWeight: 800
            }}
          >
            Nexalink
          </span>
        </div>

        <div className="auth-card" style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h1 className="auth-title" style={{ marginBottom: 8 }}>
              {t('register.joinTitle')}
            </h1>
            <p className="auth-subtitle" style={{ fontSize: 15 }}>
              {t('register.joinSubtitle')}
            </p>
          </div>

          {referrerName && (
            <div
              style={{
                background:
                  'linear-gradient(135deg, rgba(37,99,235,0.10), rgba(124,58,237,0.08))',
                border: '1px solid rgba(37,99,235,0.18)',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14
              }}
            >
              <span>🎉</span>
              <span>
                {t('register.referredBy')}{' '}
                <strong style={{ color: 'var(--color-primary)' }}>
                  {referrerName}
                </strong>
              </span>
            </div>
          )}

          <div className="role-selector">
            <div
              className={`role-option ${role === 'individual' ? 'selected' : ''}`}
              onClick={() => setRole('individual')}
              id="role-individual"
            >
              <div className="role-option-icon">👤</div>
              <div className="role-option-title">{t('register.individual')}</div>
              <div className="role-option-desc">{t('register.professionalAccount')}</div>
            </div>

            <div
              className={`role-option ${role === 'company' ? 'selected' : ''}`}
              onClick={() => setRole('company')}
              id="role-company"
            >
              <div className="role-option-icon">🏢</div>
              <div className="role-option-title">{t('register.company')}</div>
              <div className="role-option-desc">{t('register.organizationAccount')}</div>
            </div>
          </div>

          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleSignup}
            disabled={loading || !faceVerified}
            style={{
              opacity: !faceVerified ? 0.65 : 1,
              cursor: !faceVerified ? 'not-allowed' : 'pointer'
            }}
            id="google-register-btn"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            {t('register.continueWithGoogle')}
          </button>

          <div className="auth-divider">{t('common.or')}</div>

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label" htmlFor="register-name">
                {role === 'company' ? t('register.companyName') : t('register.fullName')}
              </label>
              <input
                type="text"
                className="form-input"
                id="register-name"
                placeholder={role === 'company' ? t('register.companyNamePlaceholder') : t('register.fullNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {role === 'company' && (
              <div className="form-group">
                <label className="form-label" htmlFor="register-industry">
                  {t('register.industry')}
                </label>
                <select
                  className="form-select"
                  id="register-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="">{t('register.selectIndustry')}</option>
                  <option value="Technology">{t('industry.technology')}</option>
                  <option value="Finance">{t('industry.finance')}</option>
                  <option value="Healthcare">{t('industry.healthcare')}</option>
                  <option value="Education">{t('industry.education')}</option>
                  <option value="Manufacturing">{t('industry.manufacturing')}</option>
                  <option value="Consulting">{t('industry.consulting')}</option>
                  <option value="Retail">{t('industry.retail')}</option>
                  <option value="Media">{t('industry.media')}</option>
                  <option value="Other">{t('industry.other')}</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="register-email">
                {t('register.workEmail')}
              </label>
              <input
                type="email"
                className="form-input"
                id="register-email"
                placeholder={t('register.workEmailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-password">
                {t('register.password')}
              </label>
              <input
                type="password"
                className="form-input"
                id="register-password"
                placeholder={t('register.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="form-error mb-3">{error}</div>}

            <motion.button
              type="button"
              className={`btn btn-secondary btn-lg btn-full enroll-face-btn${faceVerified ? ' verified' : ''
                }`}
              style={{
                marginBottom: 14,
                border: faceVerified ? '2px solid #16A34A' : '1px solid rgba(37,99,235,0.18)',
                background: faceVerified
                  ? 'linear-gradient(90deg, #16A34A 0%, #7C3AED 100%)'
                  : 'linear-gradient(90deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.08) 100%)',
                color: faceVerified ? '#fff' : 'var(--color-text-primary)',
                boxShadow: faceVerified ? '0 0 12px 2px #16A34A22' : '0 6px 16px rgba(37,99,235,0.08)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s'
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleFaceEnroll}
              id="enroll-face-btn"
              disabled={faceVerified}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  fontWeight: 600,
                  fontSize: 17
                }}
              >
                <span role="img" aria-label="face" style={{ fontSize: 22 }}>
                  🧑‍💻
                </span>
                {faceVerified ? t('register.faceEnrolledSuccess') : t('register.enrollFace')}
                {faceVerified && <span style={{ marginLeft: 4, fontSize: 18 }}>✔️</span>}
              </span>
            </motion.button>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading || !faceVerified}
              id="register-btn"
              style={{
                opacity: !faceVerified ? 0.65 : 1,
                cursor: !faceVerified ? 'not-allowed' : 'pointer'
              }}
            >
              {loading
                ? t('register.creatingAccount')
                : role === 'company'
                  ? t('register.createCompanyAccount')
                  : t('register.createAccount')}
            </button>
          </form>

          <div
            className="auth-footer"
            style={{
              marginTop: 18,
              textAlign: 'center'
            }}
          >
            {t('register.alreadyHaveAccount')}{' '}
            <Link to="/login" id="login-link">
              {t('register.signIn')}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}