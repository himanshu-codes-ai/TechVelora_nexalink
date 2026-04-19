import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../shared/Avatar';
import WalletWidget from '../rewards/WalletWidget';
import { searchUsers } from '../../services/searchService';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickResults, setQuickResults] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/', icon: '🏠', label: 'Feed' },
    { path: '/network', icon: '👥', label: 'Network' },
    { path: '/jobs', icon: '💼', label: 'Jobs' },
    { path: '/opportunities', icon: '🏢', label: 'Deals' },
    { path: '/events', icon: '🎯', label: 'Events' },
    { path: '/referral', icon: '🔗', label: 'Referral' },
  ];

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
          <div className="navbar-brand-icon">TL</div>
          <span style={{
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Nexalink</span>
        </Link>

        <div className="navbar-search" style={{ position: 'relative' }}>
          <span className="navbar-search-icon">🔍</span>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim().length >= 2) {
              navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
              setSearchQuery('');
              setQuickResults([]);
            }
          }}>
            <input
              type="text"
              placeholder="Search by name, @nexusId, skills..."
              value={searchQuery}
              onChange={async (e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim().length >= 2) {
                  try {
                    const res = await searchUsers(val.trim());
                    setQuickResults(res.slice(0, 4));
                  } catch { setQuickResults([]); }
                } else {
                  setQuickResults([]);
                }
              }}
              onFocus={() => { if (searchQuery.length >= 2) setQuickResults(prev => prev); }}
              onBlur={() => setTimeout(() => setQuickResults([]), 200)}
              id="navbar-search-input"
            />
          </form>

          {/* Quick Search Dropdown */}
          {quickResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
              zIndex: 1000, overflow: 'hidden',
              marginTop: 4,
            }}>
              {quickResults.map(user => (
                <Link
                  key={user.uid}
                  to={`/profile/${user.uid}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', textDecoration: 'none', color: 'inherit',
                    borderBottom: '1px solid var(--color-border-light)',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-bg)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { setSearchQuery(''); setQuickResults([]); }}
                >
                  <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {user.name}
                      {user.identityVerified && <span title="Verified" style={{ color: '#16a34a', fontSize: 12 }}>✅</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', gap: 6 }}>
                      {user.nexusId && <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{user.nexusId}</span>}
                      {user.headline && <span>• {user.headline.slice(0, 30)}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                    🛡️ {user.trustScore}
                  </div>
                </Link>
              ))}
              <Link
                to={`/search?q=${encodeURIComponent(searchQuery)}`}
                style={{
                  display: 'block', padding: '10px 14px', textAlign: 'center',
                  fontSize: 12, color: 'var(--color-primary)', fontWeight: 600,
                  textDecoration: 'none', background: 'var(--color-bg)',
                }}
                onClick={() => { setSearchQuery(''); setQuickResults([]); }}
              >
                See all results →
              </Link>
            </div>
          )}
        </div>

        <div className="navbar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`navbar-nav-item ${isActive(item.path) && item.path !== '/' ? 'active' : ''} ${item.path === '/' && location.pathname === '/' ? 'active' : ''}`}
              id={`nav-${item.label.toLowerCase()}`}
            >
              <span className="navbar-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="navbar-actions" ref={dropdownRef}>
          <WalletWidget />
          <div className="dropdown">
            <button 
              className="btn-icon"
              onClick={() => setShowDropdown(!showDropdown)}
              id="navbar-profile-btn"
              style={{ padding: 0 }}
            >
              <Avatar 
                src={userProfile?.avatarUrl || currentUser?.photoURL} 
                name={userProfile?.name || currentUser?.displayName || 'U'} 
                size="sm" 
              />
            </button>
            {showDropdown && (
              <div className="dropdown-menu">
                <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--color-border-light)' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{userProfile?.name || 'User'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{userProfile?.headline || userProfile?.role}</div>
                </div>
                <Link 
                  to="/profile" 
                  className="dropdown-item" 
                  onClick={() => setShowDropdown(false)}
                  id="dropdown-profile"
                >
                  👤 View Profile
                </Link>
                <Link 
                  to="/settings" 
                  className="dropdown-item" 
                  onClick={() => setShowDropdown(false)}
                  id="dropdown-settings"
                >
                  ⚙️ Settings
                </Link>
                <Link 
                  to="/rewards" 
                  className="dropdown-item" 
                  onClick={() => setShowDropdown(false)}
                  id="dropdown-rewards"
                >
                  🎁 Rewards Store
                </Link>
                <Link 
                  to="/leaderboard" 
                  className="dropdown-item" 
                  onClick={() => setShowDropdown(false)}
                  id="dropdown-leaderboard"
                >
                  🏆 Leaderboard
                </Link>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={handleLogout} id="dropdown-logout" style={{ color: 'var(--color-danger)' }}>
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
