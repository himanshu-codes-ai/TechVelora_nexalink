import React, { useState } from 'react';
import { buildReferralLink, buildShareText } from '../../services/referralService';

export default function ShareModal({ referralCode, userName, onClose }) {
  const [copied, setCopied] = useState(false);
  const link = buildReferralLink(referralCode);
  const shareText = buildShareText(referralCode, userName);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`, '_blank');
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on Nexalink!')}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent('Join me on Nexalink!');
    const body = encodeURIComponent(shareText);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal slide-up" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>📤 Share Your Referral</h3>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>

        <div className="share-modal-body">
          {/* Referral Code Display */}
          <div className="referral-code-display">
            <span className="referral-code-label">Your Code</span>
            <span className="referral-code-value">{referralCode}</span>
          </div>

          {/* Copy Link */}
          <div className="share-link-box">
            <input type="text" readOnly value={link} className="form-input" style={{ fontSize: 12 }} />
            <button
              className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
              onClick={handleCopy}
              style={{ whiteSpace: 'nowrap', minWidth: 80 }}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>

          {/* Social Share Buttons */}
          <div className="share-social-grid">
            <button className="share-social-btn share-whatsapp" onClick={shareWhatsApp}>
              <span className="share-social-icon">💬</span>
              <span>WhatsApp</span>
            </button>
            <button className="share-social-btn share-twitter" onClick={shareTwitter}>
              <span className="share-social-icon">🐦</span>
              <span>Twitter/X</span>
            </button>
            <button className="share-social-btn share-linkedin" onClick={shareLinkedIn}>
              <span className="share-social-icon">💼</span>
              <span>LinkedIn</span>
            </button>
            <button className="share-social-btn share-telegram" onClick={shareTelegram}>
              <span className="share-social-icon">✈️</span>
              <span>Telegram</span>
            </button>
            <button className="share-social-btn share-email" onClick={shareEmail}>
              <span className="share-social-icon">📧</span>
              <span>Email</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
