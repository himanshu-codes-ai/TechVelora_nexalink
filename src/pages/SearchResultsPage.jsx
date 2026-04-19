import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/shared/Avatar';
import TrustBadge from '../components/shared/TrustBadge';
import { searchUsers } from '../services/searchService';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'individual' | 'company'
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setSearchInput(query);
    if (query.trim().length >= 2) {
      performSearch(query);
    }
  }, [query]);

  async function performSearch(q) {
    setLoading(true);
    try {
      const data = await searchUsers(q);
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    }
    setLoading(false);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (searchInput.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  }

  const filteredResults = results.filter(user => {
    if (filterVerified && !user.identityVerified && !user.livenessVerified) return false;
    if (filterType === 'individual' && user.role === 'company') return false;
    if (filterType === 'company' && user.role !== 'company') return false;
    return user.uid !== currentUser?.uid; // Don't show self
  });

  function getVerificationLevel(user) {
    if (user.identityVerified && user.livenessVerified) return { label: 'Identity Verified', color: '#16a34a', bg: 'rgba(34, 197, 94, 0.1)', icon: '✅' };
    if (user.identityVerified || user.livenessVerified || user.emailVerified) return { label: 'Partially Verified', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: '⚠️' };
    return { label: 'Unverified', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', icon: '○' };
  }

  return (
    <div className="page-full" style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      {/* Search Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <form onSubmit={handleSearchSubmit}>
          <div style={{ 
            display: 'flex', gap: 8, 
            background: 'var(--color-surface)', 
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '6px 6px 6px 16px',
            alignItems: 'center',
            transition: 'border-color 0.2s',
          }}>
            <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, @nexusId, skills, or company..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '15px',
                color: 'var(--color-text-primary)',
                padding: '8px 0',
              }}
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: 'var(--radius-md)' }}>
              Search
            </button>
          </div>
        </form>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginRight: 4 }}>Filter:</span>
          
          <button 
            className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType('all')}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20 }}
          >All</button>
          <button 
            className={`btn btn-sm ${filterType === 'individual' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType('individual')}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20 }}
          >👤 People</button>
          <button 
            className={`btn btn-sm ${filterType === 'company' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType('company')}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20 }}
          >🏢 Companies</button>
          
          <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />
          
          <button 
            className={`btn btn-sm ${filterVerified ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterVerified(!filterVerified)}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20 }}
          >🛡️ Verified Only</button>
        </div>
      </motion.div>

      {/* Results Count */}
      {query && (
        <div style={{ 
          fontSize: '14px', color: 'var(--color-text-muted)', 
          marginBottom: 16, paddingBottom: 12,
          borderBottom: '1px solid var(--color-border-light)' 
        }}>
          {loading ? 'Searching...' : `${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''} for "${query}"`}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center p-5">
          <div style={{ fontSize: 32, marginBottom: 8, animation: 'pulse 1.5s infinite' }}>🔍</div>
          <p className="text-sm text-muted">Searching across Nexalink...</p>
        </div>
      )}

      {/* No Results */}
      {!loading && query && filteredResults.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="card card-body text-center" 
          style={{ padding: 40 }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔎</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No results found</h3>
          <p className="text-sm text-muted" style={{ maxWidth: 400, margin: '0 auto' }}>
            No users match "{query}". Try searching by @nexusId, full name, or specific skills.
          </p>
        </motion.div>
      )}

      {/* Results List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredResults.map((user, i) => {
          const verification = getVerificationLevel(user);
          
          return (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Link 
                to={`/profile/${user.uid}`} 
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="card" style={{ 
                  padding: 20, 
                  display: 'flex', 
                  gap: 16, 
                  alignItems: 'flex-start',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${verification.color}`,
                }} onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                }} onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar src={user.avatarUrl} name={user.name} size="lg" />
                    {/* Verification dot */}
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 14, height: 14, borderRadius: '50%',
                      background: verification.color,
                      border: '2px solid var(--color-surface)',
                      fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }} title={verification.label}>
                    </div>
                  </div>

                  {/* User Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                        {user.name}
                      </h3>
                      <TrustBadge badge={user.trustBadge || 'NEW'} size="sm" />
                      <span style={{ 
                        fontSize: '11px', padding: '2px 8px', borderRadius: 10,
                        background: verification.bg, color: verification.color, 
                        fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {verification.icon} {verification.label}
                      </span>
                    </div>

                    {/* Nexus ID */}
                    {user.nexusId && (
                      <div style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, marginTop: 2 }}>
                        {user.nexusId}
                      </div>
                    )}

                    {/* Headline */}
                    <div style={{ 
                      fontSize: '14px', color: 'var(--color-text-secondary)', 
                      marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                    }}>
                      {user.headline || (user.role === 'company' ? user.industry : 'Professional')}
                    </div>

                    {/* Meta Row */}
                    <div style={{ 
                      display: 'flex', alignItems: 'center', gap: 12, marginTop: 8,
                      fontSize: '12px', color: 'var(--color-text-muted)', flexWrap: 'wrap'
                    }}>
                      {user.location && (
                        <span>📍 {user.location}</span>
                      )}
                      <span style={{ color: 'var(--color-primary)' }}>
                        🛡️ Trust: {user.trustScore}/115
                      </span>
                      <span>
                        👥 {user.connectionsCount} connection{user.connectionsCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Skills */}
                    {user.skills && user.skills.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        {user.skills.slice(0, 5).map((skill, si) => (
                          <span key={si} style={{
                            fontSize: '11px', padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--color-bg)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border-light)',
                          }}>{skill}</span>
                        ))}
                        {user.skills.length > 5 && (
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', padding: '2px 4px' }}>
                            +{user.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Action */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{ 
                      fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'right' 
                    }}>
                      {user.role === 'company' ? '🏢 Company' : '👤 Individual'}
                    </div>
                    <button 
                      className="btn btn-sm btn-outline-primary" 
                      onClick={(e) => { e.preventDefault(); navigate(`/profile/${user.uid}`); }}
                      style={{ fontSize: 12, padding: '4px 12px' }}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State - No Query */}
      {!query && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center" 
          style={{ padding: 60 }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Find People & Companies</h2>
          <p className="text-sm text-muted" style={{ maxWidth: 400, margin: '0 auto 24px' }}>
            Search by name, @nexusId, skills, industry, or company. 
            Use @nexusId for exact matches — like <strong>@rahul_sharma</strong>
          </p>
          <div style={{ 
            display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
            maxWidth: 500, margin: '0 auto'
          }}>
            {['@nexus_id', 'React Developer', 'TCS', 'Machine Learning'].map(suggestion => (
              <button 
                key={suggestion}
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setSearchInput(suggestion);
                  navigate(`/search?q=${encodeURIComponent(suggestion)}`);
                }}
                style={{ fontSize: 12, borderRadius: 20 }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
