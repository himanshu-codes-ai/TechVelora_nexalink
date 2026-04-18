import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import TrustBadge from '../components/shared/TrustBadge';
import TrustScoreWidget from '../components/trust/TrustScoreWidget';

export default function VerificationPage() {
  const { userProfile, isCompany } = useAuth();

  if (!userProfile) {
    return <div className="page-full text-center p-5 text-muted">Loading verification status...</div>;
  }

  const verifications = [
    { title: 'Email Address', desc: 'Secure your account', verified: userProfile.emailVerified, points: 10 },
    { title: 'Profile Completeness', desc: 'Add headline, bio, and location', verified: !!(userProfile.bio && userProfile.location), points: 20 },
    ...(!isCompany ? [
      { title: 'Education History', desc: 'Add your educational background', verified: !!(userProfile.education && userProfile.education.length > 0), points: 15 },
      { title: 'Professional Skills', desc: 'List your core competencies', verified: !!(userProfile.skills && userProfile.skills.length > 0), points: 10 },
      { title: 'Network Strength', desc: 'Connect with at least 5 professionals', verified: (userProfile.connectionsCount || 0) >= 5, points: 20 },
    ] : [
      { title: 'Company Details', desc: 'Add industry and website', verified: !!(userProfile.industry && userProfile.website), points: 15 },
      { title: 'Job Postings', desc: 'Post at least 1 job opening', verified: (userProfile.jobsCount || 0) > 0, points: 30 },
    ]),
    { title: 'Platform Activity', desc: 'Create your first post', verified: (userProfile.postsCount || 0) > 0, points: 15 }
  ];

  return (
    <div className="page-full" style={{ maxWidth: 800, margin: '0 auto' }}>
      <motion.div
        className="flex justify-between items-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>🛡️ Trust Verification Center</h1>
          <p className="text-sm text-secondary mt-2">Complete steps to unlock the HIGH_TRUST badge and boost your visibility.</p>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 280px', gap: 24 }}>
        
        {/* Verification Checklist */}
        <div style={{ flex: 1 }}>
          <motion.div className="card card-body mb-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 16 }}>Verification Checklist</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {verifications.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded" style={{ background: item.verified ? 'var(--color-surface)' : 'var(--color-bg)', border: '1px solid var(--color-border-light)' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ 
                      width: 24, height: 24, borderRadius: '50%', 
                      background: item.verified ? 'var(--color-success-light)' : 'var(--color-border)',
                      color: item.verified ? 'var(--color-success)' : 'var(--color-text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px'
                    }}>
                      {item.verified ? '✓' : ''}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{item.title}</div>
                      <div className="text-xs text-muted mt-1">{item.desc}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="badge font-mono" style={{ background: 'var(--color-surface)' }}>+{item.points} pts</span>
                    {!item.verified && (
                      <a href={item.title.includes('Email') ? '#' : '/profile'} className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>Complete →</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Status Widget */}
        <div>
          <motion.div className="card card-body mb-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="text-center mb-4">
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-secondary)' }}>Current Status</h4>
              <div className="mt-2 text-2xl font-bold flex justify-center"><TrustBadge badge={userProfile.trustBadge || 'NEW'} size="lg" /></div>
            </div>
            
            <TrustScoreWidget score={userProfile.trustScore || 0} badge={userProfile.trustBadge || 'NEW'} />
            
            <div className="mt-4 text-center">
              <p className="text-xs text-muted p-3 bg-surface rounded">
                Trust scores are calculated securely on our backend. Completing the checklist will drastically improve your ranking in feeds and search results.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
