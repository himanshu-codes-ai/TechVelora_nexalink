import React from 'react';
import { getNextMilestone, getMilestones } from '../../services/rewardService';

export default function MilestoneTracker({ verifiedReferrals = 0 }) {
  const next = getNextMilestone(verifiedReferrals);
  const allMilestones = getMilestones();

  return (
    <div className="milestone-tracker">
      <div className="milestone-header">
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>🎯 Milestone Progress</h3>
        {next.completed ? (
          <span className="badge badge-success" style={{ fontSize: 11 }}>All Complete! 🏆</span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Next: {next.threshold} referrals
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {!next.completed && (
        <div className="milestone-progress-section">
          <div className="milestone-progress-bar">
            <div
              className="milestone-progress-fill"
              style={{ width: `${next.progress}%` }}
            />
          </div>
          <div className="milestone-progress-label">
            <span>{verifiedReferrals} / {next.threshold}</span>
            <span>{Math.round(next.progress)}%</span>
          </div>
          <div className="milestone-reward-preview">
            🎁 {next.reward}
          </div>
        </div>
      )}

      {/* Milestone List */}
      <div className="milestone-list">
        {allMilestones.map((m, idx) => {
          const achieved = verifiedReferrals >= m.threshold;
          const isCurrent = !achieved && (idx === 0 || verifiedReferrals >= allMilestones[idx - 1].threshold);

          return (
            <div
              key={m.threshold}
              className={`milestone-item ${achieved ? 'achieved' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="milestone-item-marker">
                {achieved ? '✅' : isCurrent ? '🔵' : '⚪'}
              </div>
              <div className="milestone-item-info">
                <div className="milestone-item-threshold">{m.threshold} verified referrals</div>
                <div className="milestone-item-reward">{m.reward}</div>
              </div>
              {achieved && (
                <span className="badge badge-success" style={{ fontSize: 10, marginLeft: 'auto' }}>Claimed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
