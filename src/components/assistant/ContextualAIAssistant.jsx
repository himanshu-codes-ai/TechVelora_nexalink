import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AI_BACKEND_URL = 'http://localhost:3001';

export default function ContextualAIAssistant() {
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Quick-action chips based on profile gaps
  const getSmartChips = () => {
    if (!userProfile) return [];
    const chips = [];
    if (!userProfile.headline) chips.push('Suggest a headline for me');
    if (!userProfile.bio) chips.push('Write a professional bio for me');
    if (!userProfile.skills || userProfile.skills.length === 0) chips.push('What skills should I add?');
    if (!userProfile.avatarUrl) chips.push('Why should I add a profile photo?');
    if (!userProfile.location) chips.push('Should I add my location?');
    if (userProfile.trustScore < 50) chips.push('How do I increase my trust score?');
    if (userProfile.connectionsCount < 5) chips.push('How can I grow my network?');
    if (!userProfile.linkedInUrl && userProfile.role !== 'company') chips.push('Should I link my LinkedIn?');
    if (!userProfile.education || userProfile.education.length === 0) chips.push('Should I add education details?');
    chips.push('🔍 Full profile review');
    if (chips.length === 0) chips.push('Review my profile', 'Career advice');
    return chips.slice(0, 4);
  };

  const handleGenerate = async (overridePrompt) => {
    const msg = overridePrompt || prompt;
    if (!msg.trim()) return;

    setIsGenerating(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch(`${AI_BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg.trim(),
          profile: userProfile ? {
            // Core identity
            name: userProfile.name,
            role: userProfile.role,
            email: userProfile.email,
            headline: userProfile.headline,
            bio: userProfile.bio,
            location: userProfile.location,
            avatarUrl: userProfile.avatarUrl || null,
            // Professional details
            skills: userProfile.skills,
            education: userProfile.education,
            experienceYears: userProfile.experienceYears,
            linkedInUrl: userProfile.linkedInUrl || null,
            corporateEmail: userProfile.corporateEmail || null,
            website: userProfile.website || null,
            // Company-specific fields
            industry: userProfile.industry || null,
            domain: userProfile.domain || null,
            description: userProfile.description || null,
            employeeCount: userProfile.employeeCount ?? null,
            // Trust & Verification
            trustScore: userProfile.trustScore,
            trustBadge: userProfile.trustBadge,
            trustBreakdown: userProfile.trustBreakdown,
            emailVerified: userProfile.emailVerified ?? false,
            verified: userProfile.verified ?? false,
            // Activity & Engagement
            connectionsCount: userProfile.connectionsCount,
            postsCount: userProfile.postsCount,
            jobsCount: userProfile.jobsCount ?? 0,
            // Referral & Rewards
            referralCode: userProfile.referralCode || null,
            referralCount: userProfile.referralCount,
            verifiedReferralCount: userProfile.verifiedReferralCount ?? 0,
            referralTier: userProfile.referralTier || 'none',
            nexaCoins: userProfile.nexaCoins,
            // Timestamps
            createdAt: userProfile.createdAt || null,
          } : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      if (data.reply) {
        setResponse(data.reply);
      } else {
        setError('AI returned an empty response. Please try again.');
      }
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('Cannot reach AI backend. Make sure the server is running on port 3001.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleChipClick = (chipText) => {
    setPrompt(chipText);
    handleGenerate(chipText);
  };

  const smartChips = getSmartChips();

  return (
    <>
      {/* Floating AI Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary"
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '56px', height: '56px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: 0,
        }}
      >
        {isOpen ? '✕' : '✨'}
      </button>

      {/* Chat Widget */}
      {isOpen && (
        <div
          className="suggestion-panel slide-up"
          style={{
            position: 'fixed', bottom: '90px', right: '24px',
            width: '360px', zIndex: 9998,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            margin: 0,
          }}
        >
          <div className="suggestion-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🤖</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', flex: 1 }}>Nexalink Assistant</span>
            {userProfile && (
              <span style={{
                fontSize: '10px',
                background: 'rgba(37,99,235,0.1)',
                color: 'var(--color-primary)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 600,
              }}>
                Profile Connected
              </span>
            )}
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            {/* Smart suggestion chips */}
            {!response && !isGenerating && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {smartChips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleChipClick(chip)}
                    style={{
                      fontSize: '11px',
                      padding: '5px 10px',
                      borderRadius: '16px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'var(--color-primary)';
                      e.target.style.color = 'white';
                      e.target.style.borderColor = 'var(--color-primary)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'var(--color-surface)';
                      e.target.style.color = 'var(--color-text-secondary)';
                      e.target.style.borderColor = 'var(--color-border)';
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {error && <div className="form-error" style={{ marginBottom: '12px' }}>{error}</div>}

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {userProfile
                  ? `Ask about your profile, career, or network (${userProfile.name || 'User'}):`
                  : 'Ask anything about your career or network:'}
              </label>
              <textarea
                className="form-input"
                placeholder={userProfile?.headline
                  ? "E.g., How can I improve my headline?"
                  : "E.g., What should my professional headline be?"}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                style={{ resize: 'none', fontSize: '13px' }}
              />
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="btn btn-primary btn-full shadow-sm"
              style={{ padding: '8px' }}
            >
              {isGenerating ? 'Thinking...' : 'Ask AI'}
            </button>

            {response && (
              <div style={{
                marginTop: '12px', padding: '12px',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', fontSize: '13px', color: 'var(--color-text-primary)',
              }}>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {response}
                </div>
                <button
                  onClick={() => { setResponse(''); setPrompt(''); }}
                  style={{
                    marginTop: '8px', fontSize: '11px',
                    color: 'var(--color-primary)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: 0,
                    fontWeight: 600,
                  }}
                >
                  ← Ask another question
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
