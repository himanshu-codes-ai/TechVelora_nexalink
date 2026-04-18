import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../shared/Avatar';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
    { path: '/events', icon: '🎯', label: 'Events' },
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

        <div className="navbar-search">
          <span className="navbar-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search people, companies, jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="navbar-search-input"
          />
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
