import React from 'react';

export default function TrustScoreWidget({ score = 0, badge = 'NEW', showBreakdown = false }) {
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (score / 100) * circumference;

  function getStrokeColor() {
    if (score >= 80) return 'var(--trust-high)';
    if (score >= 60) return 'var(--trust-trusted)';
    if (score >= 40) return 'var(--trust-verified)';
    return 'var(--trust-new)';
  }

  return (
    <div className="trust-widget">
      <div className="trust-circle">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle className="trust-circle-bg" cx="60" cy="60" r="50" />
          <circle
            className="trust-circle-progress"
            cx="60" cy="60" r="50"
            stroke={getStrokeColor()}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="trust-circle-value">{score}</div>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        Trust Score
      </div>
      <div className="trust-label">
        {score >= 80 ? 'Highly Trusted Professional' : 
         score >= 60 ? 'Trusted Member' : 
         score >= 40 ? 'Verified Member' : 
         'Build your trust score'}
      </div>
    </div>
  );
}
