import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../shared/Avatar';
import TrustBadge from '../shared/TrustBadge';
import TrustScoreWidget from '../trust/TrustScoreWidget';
import ReferralCard from '../referral/ReferralCard';

export default function Sidebar() {
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  const isCompany = userProfile.role === 'company';

  return (
    <aside className="app-sidebar">
      {/* Mini Profile Card */}
      <div className="card mb-4 slide-up">
        <div style={{
          height: 60,
          background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
        }} />
        <div className="card-body" style={{ textAlign: 'center', marginTop: -30 }}>
          <Avatar 
            src={isCompany ? userProfile.logoUrl : userProfile.avatarUrl}
            name={userProfile.name}
            size="lg"
            className=""
          />
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginTop: 8 }}>{userProfile.name}</h3>
          {userProfile.nexusId && (
            <p style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, marginTop: 2, letterSpacing: '0.3px' }}>
              {userProfile.nexusId}
            </p>
          )}
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>
            {isCompany ? userProfile.industry : userProfile.headline || 'Professional'}
          </p>
          <div style={{ marginTop: 8 }}>
            <TrustBadge badge={userProfile.trustBadge || 'NEW'} />
          </div>

          <div className="flex justify-between" style={{ marginTop: 16, padding: '0 8px' }}>
            <div className="text-center">
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{userProfile.connectionsCount || 0}</div>
              <div className="text-xs text-muted">Connections</div>
            </div>
            <div style={{ width: 1, background: 'var(--color-border)' }} />
            <div className="text-center">
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{userProfile.postsCount || 0}</div>
              <div className="text-xs text-muted">Posts</div>
            </div>
            {isCompany && (
              <>
                <div style={{ width: 1, background: 'var(--color-border)' }} />
                <div className="text-center">
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{userProfile.jobsCount || 0}</div>
                  <div className="text-xs text-muted">Jobs</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Trust Score Widget */}
      <div className="card mb-4 slide-up" style={{ animationDelay: '0.1s' }}>
        <TrustScoreWidget score={userProfile.trustScore || 0} badge={userProfile.trustBadge || 'NEW'} />
      </div>

      {/* Referral Quick Card */}
      <div className="slide-up mb-4" style={{ animationDelay: '0.15s' }}>
        <ReferralCard />
      </div>

      {/* Quick Links */}
      <div className="card slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="card-header" style={{ fontSize: '13px', fontWeight: 600 }}>
          Quick Links
        </div>
        <div style={{ padding: '4px' }}>
          <Link to="/profile" className="dropdown-item" id="sidebar-profile">👤 My Profile</Link>
          <Link to="/jobs" className="dropdown-item" id="sidebar-jobs">💼 Browse Jobs</Link>
          <Link to="/events" className="dropdown-item" id="sidebar-events">🎯 Upcoming Events</Link>
          <Link to="/network" className="dropdown-item" id="sidebar-network">👥 My Network</Link>
          <Link to="/referral" className="dropdown-item" id="sidebar-referral">🔗 Referral Hub</Link>
          <Link to="/rewards" className="dropdown-item" id="sidebar-rewards">🎁 Rewards Store</Link>
          <Link to="/leaderboard" className="dropdown-item" id="sidebar-leaderboard">🏆 Leaderboard</Link>
          {isCompany && (
            <Link to="/jobs?create=true" className="dropdown-item" id="sidebar-post-job">📝 Post a Job</Link>
          )}
        </div>
      </div>
    </aside>
  );
}
