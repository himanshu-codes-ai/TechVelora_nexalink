import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export default function LoginPage() {
  const { loginWithEmail, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('individual'); // UI only
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);

  useEffect(() => {
    function handleMessage(event) {
      if (event.data?.type === 'FACE_LOGIN_VERIFIED') {
        setFaceVerified(true);
        setError('');
        alert('Face verified successfully! You may now sign in.');
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate, t]);

  async function handleEmailLogin(e) {
    e.preventDefault();

    if (!email || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }

    if (!faceVerified) {
      setError('Please complete face verification first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { profile } = await loginWithEmail(normalizedEmail, password);

      if (!profile || !profile.role) {
        throw new Error("User role not found. Contact support.");
      }

      navigate('/');
    } catch (err) {
      setError(err.message || t('auth.failedToSignIn'));
    } finally {
      setLoading(false);
    }
  }

  function handleFaceVerify() {
    if (!email.trim()) {
      setError('Please enter your email first to verify your face.');
      return;
    }
    const encodedEmail = encodeURIComponent(email.trim().toLowerCase());
    window.open(`http://localhost:3001/?mode=verify&userId=${encodedEmail}`, '_blank');
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError('');

    try {
      const { profile } = await loginWithGoogle();

      // 🔐 SAFETY CHECK
      if (!profile || !profile.role) {
        throw new Error("User role not found. Contact support.");
      }

      // ✅ Enforce face auth for ALL users
      const encodedEmail = encodeURIComponent(profile.email.toLowerCase());
      window.open(`http://localhost:3001/?mode=verify&userId=${encodedEmail}`, '_blank');

    } catch (err) {
      setError(err.message || t('auth.failedToSignInGoogle'));
    } finally {
      setLoading(false);
    }
  }

  const styles = {
    page: {
      minHeight: '100vh',
      width: '100%',
      background: '#f6f6f7',
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    },
    wrapper: {
      width: '100%',
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '44.5% 55.5%'
    },
    left: {
      background: '#fbfbfc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '28px 34px',
      position: 'relative',
      overflow: 'hidden'
    },
    right: {
      background: 'var(--color-primary, #1E3A8A)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '34px 48px',
      overflow: 'hidden'
    },
    leftInner: {
      width: '100%',
      maxWidth: '575px'
    },
    languageWrap: {
      position: 'absolute',
      top: '18px',
      right: '24px',
      zIndex: 5
    },
    title: {
      fontSize: 'clamp(2rem, 2.4vw, 3rem)',
      fontWeight: 800,
      color: '#0f172a',
      textAlign: 'center',
      marginBottom: '10px',
      lineHeight: 1.1
    },
    subtitle: {
      fontSize: 'clamp(1rem, 1.05vw, 1.1rem)',
      color: '#6b7280',
      textAlign: 'center',
      marginBottom: '28px',
      lineHeight: 1.45
    },
    tabs: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
      marginBottom: '30px'
    },
    tabBtn: (active) => ({
      height: '62px',
      borderRadius: '18px',
      border: active ? '1.5px solid #e4e7ec' : '1.5px solid #efefef',
      background: active ? '#ffffff' : '#fbfbfc',
      color: active ? '#2f66ea' : '#111827',
      fontSize: '1rem',
      fontWeight: active ? 700 : 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      cursor: 'pointer',
      boxShadow: active ? '0 2px 8px rgba(15, 23, 42, 0.04)' : 'none'
    }),
    googleBtn: {
      width: '100%',
      height: '56px',
      borderRadius: '18px',
      border: '1.5px solid #dddddf',
      background: '#fff',
      color: '#1f2937',
      fontSize: '1rem',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      cursor: 'pointer',
      marginBottom: '10px'
    },
    divider: {
      fontSize: '1rem',
      color: '#111827',
      marginBottom: '6px'
    },
    formGroup: {
      marginBottom: '14px'
    },
    label: {
      display: 'block',
      fontSize: '0.98rem',
      fontWeight: 700,
      color: '#111827',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      height: '54px',
      borderRadius: '16px',
      border: '1.5px solid #dbdde2',
      background: '#fff',
      padding: '0 18px',
      fontSize: '1rem',
      color: '#111827',
      outline: 'none',
      boxSizing: 'border-box'
    },
    error: {
      background: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fecaca',
      borderRadius: '12px',
      padding: '10px 14px',
      fontSize: '0.93rem',
      marginBottom: '14px'
    },
    submitBtn: {
      width: '100%',
      height: '58px',
      border: 'none',
      borderRadius: '20px',
      background: '#2f66ea',
      color: '#fff',
      fontSize: '1rem',
      fontWeight: 700,
      cursor: 'pointer',
      marginTop: '4px'
    },
    footer: {
      textAlign: 'center',
      marginTop: '28px',
      fontSize: '1rem',
      color: '#6b7280'
    },
    link: {
      color: '#2563eb',
      textDecoration: 'none',
      fontWeight: 600
    },
    rightInner: {
      width: '100%',
      maxWidth: '620px',
      color: '#fff'
    },
    brandRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      marginBottom: '44px'
    },
    logoBox: {
      width: '58px',
      height: '58px',
      borderRadius: '14px',
      background: '#fff',
      color: '#2f66ea',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: '1.8rem',
      boxShadow: '0 10px 22px rgba(0,0,0,0.10)'
    },
    brandText: {
      fontSize: '2.2rem',
      fontWeight: 800,
      lineHeight: 1
    },
    heroTitle: {
      fontSize: 'clamp(2.6rem, 4vw, 4.3rem)',
      fontWeight: 800,
      lineHeight: 1.05,
      marginBottom: '26px',
      letterSpacing: '-0.03em'
    },
    heroText: {
      maxWidth: '520px',
      fontSize: 'clamp(1rem, 1.15vw, 1.22rem)',
      lineHeight: 1.55,
      color: 'rgba(255,255,255,0.9)',
      marginBottom: '38px'
    },
    featureList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    },
    featureItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      fontSize: 'clamp(1rem, 1.08vw, 1.1rem)',
      fontWeight: 600,
      color: '#fff'
    },
    check: {
      fontSize: '1.55rem',
      lineHeight: 1,
      opacity: 0.95
    }
  };

  const iconStyle = { width: 22, height: 22, flexShrink: 0 };

  return (
    <div style={styles.page}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
        }

        input::placeholder {
          color: #a1a8b3;
        }

        input:focus {
          border-color: #9bb7f4 !important;
          box-shadow: 0 0 0 3px rgba(47, 102, 234, 0.08);
        }

        button:disabled {
          opacity: 0.88;
          cursor: not-allowed;
        }

        @media (max-width: 980px) {
          .login-wrapper {
            grid-template-columns: 1fr !important;
            overflow-y: auto !important;
            height: 100vh !important;
          }

          .login-right {
            display: none !important;
          }

          .login-left {
            padding: 28px 16px !important;
            overflow-y: auto !important;
          }

          html, body, #root {
            overflow: auto;
          }
        }

        @media (max-height: 760px) and (min-width: 981px) {
          .right-hero-title {
            font-size: 3rem !important;
            margin-bottom: 16px !important;
          }

          .right-hero-text {
            font-size: 1rem !important;
            margin-bottom: 24px !important;
          }

          .feature-row {
            font-size: 1rem !important;
          }

          .brand-row-tight {
            margin-bottom: 28px !important;
          }
        }
      `}</style>

      <motion.div
        className="login-wrapper"
        style={styles.wrapper}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="login-left" style={styles.left}>
          <div style={styles.languageWrap}>
            <LanguageSwitcher />
          </div>

          <div style={styles.leftInner}>
            <h1 style={styles.title}>{t('auth.welcomeBack')}</h1>
            <p style={styles.subtitle}>{t('auth.signInSubtitle')}</p>

            <div style={styles.tabs}>
              <button
                type="button"
                onClick={() => setRole('individual')}
                style={styles.tabBtn(role === 'individual')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={iconStyle}>
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Individual</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('organization')}
                style={styles.tabBtn(role === 'organization')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={iconStyle}>
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <path d="M8 7h8M8 11h8M8 15h5" />
                </svg>
                <span>Organization</span>
              </button>
            </div>

            <button
              style={styles.googleBtn}
              onClick={handleGoogleLogin}
              disabled={loading}
              id="google-login-btn"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
                <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
              {t('auth.continueWithGoogle')}
            </button>

            <div style={styles.divider}>{t('common.or')}</div>

            <form onSubmit={handleEmailLogin}>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="login-email">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  id="login-email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="login-password">
                  {t('auth.password')}
                </label>
                <input
                  type="password"
                  id="login-password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                />
              </div>

              {error ? <div style={styles.error}>{error}</div> : null}

              <button
                type="button"
                onClick={handleFaceVerify}
                disabled={faceVerified}
                style={{
                  width: '100%',
                  height: '54px',
                  borderRadius: '16px',
                  background: faceVerified ? '#e0f2fe' : '#f8fafc',
                  border: faceVerified ? '1.5px solid #7dd3fc' : '1.5px solid #e2e8f0',
                  color: faceVerified ? '#0369a1' : '#475569',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: faceVerified ? 'default' : 'pointer',
                  marginBottom: '14px',
                  transition: 'all 0.2s'
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={iconStyle}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 15s1.5 2 4 2 4-2 4-2" />
                  <path d="M9 10h.01M15 10h.01" />
                </svg>
                <span>
                  {faceVerified ? 'Face Verified Successfully' : 'Verify Face Identity'}
                </span>
              </button>

              <button
                type="submit"
                style={{
                  ...styles.submitBtn,
                  opacity: !faceVerified ? 0.65 : 1,
                  cursor: !faceVerified ? 'not-allowed' : 'pointer'
                }}
                disabled={loading || !faceVerified}
                id="email-login-btn"
              >
                {loading ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>

            <div style={styles.footer}>
              {t('auth.noAccount')}{' '}
              <Link to="/register" id="register-link" style={styles.link}>
                {t('auth.createOne')}
              </Link>
            </div>
          </div>
        </div>

        <div className="login-right" style={styles.right}>
          <div style={styles.rightInner}>
            <div className="brand-row-tight" style={styles.brandRow}>
              <div style={styles.logoBox}>TL</div>
              <div style={styles.brandText}>Nexalink</div>
            </div>

            <div className="right-hero-title" style={styles.heroTitle}>
              Secure Access to
              <br />
              Your Network.
            </div>

            <div className="right-hero-text" style={styles.heroText}>
              Log in to access your trusted verified connections. Nexalink ensures
              that every login session is protected by multi-factor verification,
              preserving the integrity of your professional identity.
            </div>

            <div style={styles.featureList}>
              <div className="feature-row" style={styles.featureItem}>
                <span style={styles.check}>✓</span>
                <span>Instant Face Login Verification</span>
              </div>

              <div className="feature-row" style={styles.featureItem}>
                <span style={styles.check}>✓</span>
                <span>Enterprise-Grade Data Protection</span>
              </div>

              <div className="feature-row" style={styles.featureItem}>
                <span style={styles.check}>✓</span>
                <span>Zero-Trust Security Architecture</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}