import React from 'react';
import { getTierLabel } from '../../services/referralService';

export default function LeaderboardTable({ entries = [], currentUserId }) {
  if (entries.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <div className="empty-state-icon">📊</div>
        <h3 className="empty-state-title">No referrals yet</h3>
        <p className="empty-state-text">Be the first to climb the leaderboard!</p>
      </div>
    );
  }

  const getMedalIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="leaderboard-table">
      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div className="leaderboard-podium">
          {[entries[1], entries[0], entries[2]].map((entry, idx) => {
            const podiumOrder = [2, 1, 3];
            const rank = podiumOrder[idx];
            const heightMap = { 1: 120, 2: 90, 3: 70 };
            return (
              <div
                key={entry.uid}
                className={`podium-entry podium-${rank} ${entry.uid === currentUserId ? 'is-me' : ''}`}
              >
                <div className="podium-avatar">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt={entry.name} />
                  ) : (
                    <div className="podium-avatar-fallback">{(entry.name || 'U')[0]}</div>
                  )}
                </div>
                <div className="podium-name">{entry.name}</div>
                <div className="podium-refs">{entry.verifiedReferrals} refs</div>
                <div className="podium-base" style={{ height: heightMap[rank] }}>
                  <span className="podium-medal">{getMedalIcon(rank)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Table */}
      <div className="leaderboard-list">
        <div className="leaderboard-list-header">
          <span className="lb-col-rank">Rank</span>
          <span className="lb-col-user">User</span>
          <span className="lb-col-refs">Referrals</span>
          <span className="lb-col-tier">Tier</span>
        </div>
        {entries.map(entry => (
          <div
            key={entry.uid}
            className={`leaderboard-row ${entry.uid === currentUserId ? 'is-me' : ''} ${entry.rank <= 3 ? 'top-three' : ''}`}
          >
            <span className="lb-col-rank">
              <span className="lb-rank-badge">{getMedalIcon(entry.rank)}</span>
            </span>
            <span className="lb-col-user">
              <div className="lb-user-info">
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt="" className="lb-avatar" />
                ) : (
                  <div className="lb-avatar lb-avatar-fallback">{(entry.name || 'U')[0]}</div>
                )}
                <span className="lb-name">{entry.name} {entry.uid === currentUserId && <span className="badge badge-primary" style={{ fontSize: 9, marginLeft: 4 }}>You</span>}</span>
              </div>
            </span>
            <span className="lb-col-refs">
              <strong>{entry.verifiedReferrals}</strong>
            </span>
            <span className="lb-col-tier">
              <span className="lb-tier-badge">{getTierLabel(entry.tier)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
