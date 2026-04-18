import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { buildReferralLink } from '../../services/referralService';
import ShareModal from './ShareModal';

export default function ReferralCard() {
  const { userProfile } = useAuth();
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!userProfile?.referralCode) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildReferralLink(userProfile.referralCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  return (
    <>
      <div className="referral-sidebar-card">
        <div className="referral-sidebar-header">
          <span style={{ fontSize: 16 }}>🔗</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Invite & Earn</span>
        </div>
        <div className="referral-sidebar-body">
          <div className="referral-mini-code" onClick={handleCopy} title="Click to copy link">
            <span>{userProfile.referralCode}</span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>{copied ? '✓' : '📋'}</span>
          </div>
          <div className="referral-mini-stats">
            <span>🪙 {userProfile.nexaCoins || 0} coins</span>
            <span>👥 {userProfile.verifiedReferralCount || 0} refs</span>
          </div>
          <button
            className="btn btn-primary btn-sm btn-full"
            onClick={() => setShowShare(true)}
            style={{ marginTop: 8, fontSize: 12 }}
          >
            📤 Share & Earn 50 🪙
          </button>
        </div>
      </div>

      {showShare && (
        <ShareModal
          referralCode={userProfile.referralCode}
          userName={userProfile.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
