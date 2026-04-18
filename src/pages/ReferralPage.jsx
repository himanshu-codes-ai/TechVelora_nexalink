import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserReferralData, getUserReferrals, assignReferralCode, getTierLabel, buildReferralLink } from '../services/referralService';
import { getNextMilestone } from '../services/rewardService';
import ShareModal from '../components/referral/ShareModal';
import MilestoneTracker from '../components/rewards/MilestoneTracker';

export default function ReferralPage() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const [referralData, setReferralData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, [currentUser]);

  async function loadReferralData() {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Ensure user has a referral code
      if (!userProfile?.referralCode) {
        await assignReferralCode(currentUser.uid, userProfile?.name);
        await fetchUserProfile(currentUser.uid);
      }

      const data = await getUserReferralData(currentUser.uid);
      setReferralData(data);

      const refs = await getUserReferrals(currentUser.uid);
      setReferrals(refs);
    } catch (err) {
      console.error('Error loading referral data:', err);
    }
    setLoading(false);
  }

  const handleCopy = async () => {
    if (!referralData?.referralCode) return;
    try {
      await navigator.clipboard.writeText(buildReferralLink(referralData.referralCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="page-full">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ animation: 'pulse 1.5s infinite' }}>🔗</div>
          <h3 className="empty-state-title">Loading your referral hub...</h3>
        </div>
      </div>
    );
  }

  const code = referralData?.referralCode || userProfile?.referralCode || '---';
  const verified = referralData?.verifiedReferralCount || 0;
  const total = referralData?.referralCount || 0;
  const coins = referralData?.nexaCoins || 0;
  const tier = referralData?.referralTier || 'none';
  const nextMilestone = getNextMilestone(verified);

  return (
    <div className="page-full">
      <div className="referral-page">
        {/* Hero Section */}
        <div className="referral-hero slide-up">
          <div className="referral-hero-content">
            <h1 className="referral-hero-title">🔗 Your Referral Hub</h1>
            <p className="referral-hero-subtitle">
              Invite professionals, grow the network, and earn NexaCoins for every verified signup!
            </p>
          </div>
          <div className="referral-hero-stats">
            <div className="referral-stat-card">
              <div className="referral-stat-value">{total}</div>
              <div className="referral-stat-label">Invited</div>
            </div>
            <div className="referral-stat-card referral-stat-highlight">
              <div className="referral-stat-value">{verified}</div>
              <div className="referral-stat-label">Verified</div>
            </div>
            <div className="referral-stat-card">
              <div className="referral-stat-value">{getTierLabel(tier).split(' ')[0]}</div>
              <div className="referral-stat-label">{getTierLabel(tier).split(' ')[1] || 'Tier'}</div>
            </div>
            <div className="referral-stat-card">
              <div className="referral-stat-value">🪙 {coins.toLocaleString()}</div>
              <div className="referral-stat-label">NexaCoins</div>
            </div>
          </div>
        </div>

        {/* Referral Code Card */}
        <div className="card slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>📎 Your Referral Code</span>
            <span className="text-xs text-muted">+50 🪙 per verified referral</span>
          </div>
          <div className="card-body">
            <div className="referral-code-big">
              <span className="referral-code-big-value">{code}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                className={`btn ${copied ? 'btn-success' : 'btn-outline'} flex-1`}
                onClick={handleCopy}
              >
                {copied ? '✓ Link Copied!' : '📋 Copy Link'}
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={() => setShowShare(true)}
              >
                📤 Share Code
              </button>
            </div>
          </div>
        </div>

        {/* Milestone Tracker */}
        <div className="card slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="card-body">
            <MilestoneTracker verifiedReferrals={verified} />
          </div>
        </div>

        {/* How It Works */}
        <div className="card slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="card-header" style={{ fontWeight: 600 }}>🎯 How It Works</div>
          <div className="card-body">
            <div className="referral-steps">
              <div className="referral-step">
                <div className="referral-step-num">1</div>
                <div>
                  <strong>Share Your Code</strong>
                  <p className="text-xs text-muted">Send your referral link via WhatsApp, LinkedIn, or any channel</p>
                </div>
              </div>
              <div className="referral-step">
                <div className="referral-step-num">2</div>
                <div>
                  <strong>Friend Joins & Verifies</strong>
                  <p className="text-xs text-muted">They sign up, verify email, and complete their profile</p>
                </div>
              </div>
              <div className="referral-step">
                <div className="referral-step-num">3</div>
                <div>
                  <strong>You Earn 50 🪙</strong>
                  <p className="text-xs text-muted">NexaCoins are credited instantly + milestone bonuses</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Referrals */}
        <div className="card slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="card-header" style={{ fontWeight: 600 }}>
            📋 Recent Referrals ({referrals.length})
          </div>
          <div className="card-body" style={{ padding: referrals.length ? 0 : undefined }}>
            {referrals.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="empty-state-icon">👥</div>
                <h3 className="empty-state-title" style={{ fontSize: 14 }}>No referrals yet</h3>
                <p className="empty-state-text">Share your code to start earning!</p>
              </div>
            ) : (
              <div className="referral-list">
                {referrals.slice(0, 10).map(r => (
                  <div key={r.id} className="referral-list-item">
                    <div className="referral-list-avatar">
                      {r.referredUserAvatar ? (
                        <img src={r.referredUserAvatar} alt="" />
                      ) : (
                        <div className="referral-list-avatar-fallback">
                          {(r.referredUserName || 'U')[0]}
                        </div>
                      )}
                    </div>
                    <div className="referral-list-info">
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{r.referredUserName}</div>
                      <div className="text-xs text-muted">{formatTimeAgo(r.signupAt)}</div>
                    </div>
                    <div className="referral-list-status">
                      {r.status === 'verified' ? (
                        <span className="badge badge-success">✅ Verified</span>
                      ) : r.flagged ? (
                        <span className="badge badge-warning">⚠️ Review</span>
                      ) : (
                        <span className="badge badge-outline">⏳ Pending</span>
                      )}
                    </div>
                    <div className="referral-list-coins">
                      {r.status === 'verified' ? '+50 🪙' : '---'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showShare && (
        <ShareModal
          referralCode={code}
          userName={userProfile?.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
