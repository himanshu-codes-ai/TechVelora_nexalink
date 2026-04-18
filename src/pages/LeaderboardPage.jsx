import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLeaderboard, getUserReferralData, getTierLabel } from '../services/referralService';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';

export default function LeaderboardPage() {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [myData, setMyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [currentUser]);

  async function loadLeaderboard() {
    setLoading(true);
    try {
      const [leaderboard, myRef] = await Promise.all([
        getLeaderboard(50),
        currentUser ? getUserReferralData(currentUser.uid) : null
      ]);
      setEntries(leaderboard);
      setMyData(myRef);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="page-full">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ animation: 'pulse 1.5s infinite' }}>📊</div>
          <h3 className="empty-state-title">Loading leaderboard...</h3>
        </div>
      </div>
    );
  }

  // Find current user's rank
  const myRank = entries.findIndex(e => e.uid === currentUser?.uid) + 1;

  return (
    <div className="page-full">
      <div className="leaderboard-page">
        {/* Hero */}
        <div className="leaderboard-hero slide-up">
          <div className="leaderboard-hero-content">
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>🏆 Referral Leaderboard</h1>
            <p style={{ color: 'var(--color-text-muted)', marginTop: 4, fontSize: 14 }}>
              Top referrers compete for flagship smartphone prizes!
            </p>
          </div>
          <div className="leaderboard-hero-prizes">
            <div className="prize-badge">🥇 iPhone / Galaxy</div>
            <div className="prize-badge">🥈 iPhone / Galaxy</div>
            <div className="prize-badge">🥉 iPhone / Galaxy</div>
          </div>
        </div>

        {/* My Position Card */}
        {myData && (
          <div className="card slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="card-body">
              <div className="my-leaderboard-position">
                <div className="my-lb-rank">
                  <span className="my-lb-rank-label">Your Rank</span>
                  <span className="my-lb-rank-value">{myRank > 0 ? `#${myRank}` : 'Unranked'}</span>
                </div>
                <div className="my-lb-stat">
                  <span className="my-lb-stat-value">{myData.verifiedReferralCount || 0}</span>
                  <span className="my-lb-stat-label">Verified Referrals</span>
                </div>
                <div className="my-lb-stat">
                  <span className="my-lb-stat-value">{getTierLabel(myData.referralTier || 'none')}</span>
                  <span className="my-lb-stat-label">Current Tier</span>
                </div>
                <Link to="/referral" className="btn btn-primary btn-sm">
                  📤 Share & Climb
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="card slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="card-body" style={{ padding: 0 }}>
            <LeaderboardTable
              entries={entries}
              currentUserId={currentUser?.uid}
            />
          </div>
        </div>

        {/* Prize Info */}
        <div className="card slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="card-header" style={{ fontWeight: 600 }}>📱 Mega Gift Prizes</div>
          <div className="card-body">
            <div className="prize-info-grid">
              <div className="prize-info-card">
                <div className="prize-info-icon">🏆</div>
                <h4>First to 1,000</h4>
                <p className="text-xs text-muted">The first three users to reach 1,000 verified referrals win a latest flagship smartphone each</p>
              </div>
              <div className="prize-info-card">
                <div className="prize-info-icon">✅</div>
                <h4>Verified Only</h4>
                <p className="text-xs text-muted">Only email-verified users with complete profiles count toward your referral total</p>
              </div>
              <div className="prize-info-card">
                <div className="prize-info-icon">🛡️</div>
                <h4>Fraud Protected</h4>
                <p className="text-xs text-muted">All mega prize referrals undergo admin review to ensure authentic signups</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
