import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import OpportunityCard from '../components/opportunities/OpportunityCard';
import OpportunityDetailModal from '../components/opportunities/OpportunityDetailModal';
import { TYPE_CONFIG, VERIFICATION_BADGES } from '../components/opportunities/OpportunityCard';
import Modal from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';
import Avatar from '../components/shared/Avatar';
import TrustBadge from '../components/shared/TrustBadge';
import {
  createOpportunity, getOpportunities, expressInterest,
  getOpportunityInterests, getUserInterests, updateInterestStatus
} from '../services/realtimeService';

const DEMO_OPPORTUNITIES = [
  {
    oppId: 'demo-opp-1',
    type: 'FUNDING',
    title: 'Seed Round — $500K for AI-Powered HR Platform',
    description: 'We are building an AI-powered HR platform that automates candidate screening, culture-fit analysis, and onboarding workflows. Looking for seed-stage investors who understand SaaS and enterprise AI. Current MRR: $12K, growing 30% MoM.',
    category: 'SaaS',
    budget: '$500K',
    timeline: 'Q3 2026',
    location: 'San Francisco, CA',
    tags: ['AI', 'SaaS', 'HR Tech', 'Machine Learning'],
    requirements: 'Investors with experience in B2B SaaS or HR tech. We value strategic guidance alongside capital.',
    postedBy: 'demo-c1',
    posterName: 'TalentFlow AI',
    posterRole: 'company',
    posterTrustBadge: 'HIGH_TRUST',
    posterTrustScore: 92,
    status: 'open',
    interestCount: 14,
    createdAt: Date.now() - 1 * 86400000,
    verification: {
      verificationScore: 94,
      status: 'VERIFIED',
      qualityChecks: { descriptionClarity: 5, budgetRealism: 5, requirementsSpecificity: 4, legitimacySignals: 5, professionalTone: 5 },
      flags: [],
      strengths: ['Detailed MRR metrics provided', 'Specific investor requirements', 'High poster trust score (92)'],
      recommendation: 'This is a high-quality seed round listing with clear financials and professional presentation.'
    }
  },
  {
    oppId: 'demo-opp-2',
    type: 'ACQUISITION',
    title: 'Acquiring Profitable E-Commerce Brands ($1M-$5M Revenue)',
    description: 'We are a PE-backed holding company seeking to acquire profitable D2C and e-commerce brands with $1M-$5M annual revenue. Looking for brands with strong customer loyalty, repeat purchase rates, and clean financials.',
    category: 'E-Commerce',
    budget: '$1M – $5M',
    timeline: 'Immediate',
    location: 'Remote',
    tags: ['E-Commerce', 'D2C', 'Acquisition', 'Retail'],
    requirements: 'Brands with 2+ years of operations, positive unit economics, and documented SOPs.',
    postedBy: 'demo-c2',
    posterName: 'Nexus Holdings',
    posterRole: 'company',
    posterTrustBadge: 'TRUSTED',
    posterTrustScore: 88,
    status: 'open',
    interestCount: 31,
    createdAt: Date.now() - 2 * 86400000,
    verification: {
      verificationScore: 88,
      status: 'VERIFIED',
      qualityChecks: { descriptionClarity: 5, budgetRealism: 4, requirementsSpecificity: 5, legitimacySignals: 4, professionalTone: 5 },
      flags: [],
      strengths: ['Clear acquisition criteria', 'PE-backed credibility', 'Specific revenue range'],
      recommendation: 'Legitimate acquisition opportunity from a verified holding company.'
    }
  },
  {
    oppId: 'demo-opp-3',
    type: 'PARTNERSHIP',
    title: 'Strategic Partnership for FinTech Distribution in Southeast Asia',
    description: 'We have a licensed payment processing infrastructure in Indonesia, Philippines, and Vietnam. Seeking fintech companies looking to expand into SEA markets. We handle compliance, licensing, and local banking relationships.',
    category: 'FinTech',
    budget: 'Revenue Share',
    timeline: 'Q2 2026',
    location: 'Singapore',
    tags: ['FinTech', 'Payments', 'Southeast Asia', 'Compliance'],
    requirements: 'FinTech companies with proven product-market fit in at least one market. Must have API-first architecture.',
    postedBy: 'demo-c3',
    posterName: 'PayBridge Asia',
    posterRole: 'company',
    posterTrustBadge: 'VERIFIED',
    posterTrustScore: 78,
    status: 'open',
    interestCount: 22,
    createdAt: Date.now() - 4 * 86400000,
    verification: {
      verificationScore: 82,
      status: 'VERIFIED',
      qualityChecks: { descriptionClarity: 4, budgetRealism: 4, requirementsSpecificity: 4, legitimacySignals: 4, professionalTone: 4 },
      flags: [],
      strengths: ['Licensed infrastructure in multiple countries', 'Clear partnership model'],
      recommendation: 'Strong partnership opportunity with regional expertise.'
    }
  },
  {
    oppId: 'demo-opp-4',
    type: 'SERVICE',
    title: 'Looking for Full-Stack Dev Agency for MVP Build',
    description: 'HealthTech startup needs a development agency or senior freelancers to build our telemedicine MVP. React Native mobile app + Node.js backend + HIPAA-compliant infrastructure. 12-week timeline.',
    category: 'HealthTech',
    budget: '$40K – $80K',
    timeline: '12 weeks',
    location: 'Remote',
    tags: ['React Native', 'Node.js', 'Healthcare', 'HIPAA', 'MVP'],
    requirements: 'Agency or team with healthcare/HIPAA experience. Portfolio of shipped mobile apps required.',
    postedBy: 'demo-c4',
    posterName: 'MedConnect',
    posterRole: 'company',
    posterTrustBadge: 'VERIFIED',
    posterTrustScore: 72,
    status: 'open',
    interestCount: 45,
    createdAt: Date.now() - 3 * 86400000,
    verification: {
      verificationScore: 78,
      status: 'VERIFIED',
      qualityChecks: { descriptionClarity: 4, budgetRealism: 4, requirementsSpecificity: 4, legitimacySignals: 3, professionalTone: 4 },
      flags: ['Budget range could be narrower'],
      strengths: ['Specific tech stack requirements', 'Clear timeline (12 weeks)'],
      recommendation: 'Legitimate service request with clear scope. Budget range is broad.'
    }
  },
  {
    oppId: 'demo-opp-5',
    type: 'COLLABORATION',
    title: 'Co-Found: Climate Tech Data Analytics Platform',
    description: 'ML engineer with 8 years of experience looking for a business co-founder to build a climate risk analytics platform. I have the technical architecture ready and early access to satellite data APIs. Need someone who can handle GTM, sales, and fundraising.',
    category: 'Climate Tech',
    budget: 'Equity Split',
    timeline: 'Immediate',
    location: 'New York / Remote',
    tags: ['Machine Learning', 'Climate', 'Co-Founder', 'Data Analytics'],
    requirements: 'Business professional with B2B enterprise sales experience. Ideally in insurance, real estate, or agriculture sectors.',
    postedBy: 'demo-u1',
    posterName: 'Arjun Mehta',
    posterRole: 'individual',
    posterTrustBadge: 'HIGH_TRUST',
    posterTrustScore: 95,
    status: 'open',
    interestCount: 8,
    createdAt: Date.now() - 6 * 86400000,
    verification: {
      verificationScore: 91,
      status: 'VERIFIED',
      qualityChecks: { descriptionClarity: 5, budgetRealism: 5, requirementsSpecificity: 5, legitimacySignals: 4, professionalTone: 5 },
      flags: [],
      strengths: ['Clear technical background stated', 'Specific co-founder requirements', 'High trust score (95)'],
      recommendation: 'Genuine co-founder search from a highly trusted ML professional.'
    }
  },
  {
    oppId: 'demo-opp-6',
    type: 'GROWTH',
    title: 'Distribution Partner for Developer Tools (100K+ Dev Community)',
    description: 'We built a code review AI tool with 5K active users. Looking for partnerships with developer communities, tech blogs, or dev tool companies to cross-promote and grow our user base. Open to affiliate, content collaboration, or integration partnerships.',
    category: 'DevTools',
    budget: 'Performance-Based',
    timeline: 'Q2–Q3 2026',
    location: 'Remote',
    tags: ['DevTools', 'Growth', 'Developer Community', 'AI'],
    requirements: 'Partners with access to 10K+ developer audience. Must be genuinely interested in developer productivity.',
    postedBy: 'demo-c5',
    posterName: 'CodeLens AI',
    posterRole: 'company',
    posterTrustBadge: 'TRUSTED',
    posterTrustScore: 85,
    status: 'open',
    interestCount: 19,
    createdAt: Date.now() - 5 * 86400000,
    verification: {
      verificationScore: 85,
      status: 'VERIFIED',
      qualityChecks: { descriptionClarity: 4, budgetRealism: 4, requirementsSpecificity: 4, legitimacySignals: 4, professionalTone: 4 },
      flags: [],
      strengths: ['Active user base (5K users)', 'Clear partnership models offered'],
      recommendation: 'Solid growth opportunity from an established dev tool.'
    }
  }
];

const INTEREST_COLUMNS = [
  { key: 'PENDING', label: 'Pending', icon: '📋', color: '#6b7280' },
  { key: 'ACCEPTED', label: 'Accepted', icon: '✅', color: '#22c55e' },
  { key: 'IN_DISCUSSION', label: 'In Discussion', icon: '💬', color: '#3b82f6' },
  { key: 'DECLINED', label: 'Declined', icon: '❌', color: '#ef4444' },
];

const STATUS_BADGES = {
  PENDING: { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', label: 'Pending' },
  ACCEPTED: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: 'Accepted' },
  IN_DISCUSSION: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', label: 'In Discussion' },
  DECLINED: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Declined' },
};

const CATEGORIES = ['All', 'SaaS', 'FinTech', 'HealthTech', 'E-Commerce', 'Climate Tech', 'DevTools', 'EdTech', 'AI/ML', 'Web3', 'Other'];

export default function OpportunityMarketplacePage() {
  const { userProfile } = useAuth();
  const [opportunities, setOpportunities] = useState(DEMO_OPPORTUNITIES);
  const [loading, setLoading] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState('discover');

  // Detail Modal
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create Modal
  const [showCreate, setShowCreate] = useState(false);
  const [oppForm, setOppForm] = useState({
    type: 'FUNDING', title: '', description: '', category: 'SaaS',
    budget: '', timeline: '', location: '', requirements: '', tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // My Interests
  const [myInterests, setMyInterests] = useState([]);
  const [loadingInterests, setLoadingInterests] = useState(false);

  // My Postings (pipeline)
  const [myPostings, setMyPostings] = useState([]);
  const [selectedPostingId, setSelectedPostingId] = useState(null);
  const [pipelineData, setPipelineData] = useState([]);
  const [loadingPipeline, setLoadingPipeline] = useState(false);

  useEffect(() => {
    loadOpportunities();
  }, []);

  useEffect(() => {
    if (activeTab === 'interests' && userProfile?.uid) loadMyInterests();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'postings' && userProfile?.uid) loadMyPostings();
  }, [activeTab]);

  async function loadOpportunities() {
    setLoading(true);
    try {
      const data = await getOpportunities({ status: 'open' });
      if (data.length > 0) setOpportunities(data);
    } catch { console.log('Using demo opportunities'); }
    setLoading(false);
  }

  async function loadMyInterests() {
    setLoadingInterests(true);
    try {
      const data = await getUserInterests(userProfile.uid);
      setMyInterests(data);
    } catch (err) { console.error(err); }
    setLoadingInterests(false);
  }

  async function loadMyPostings() {
    try {
      const all = await getOpportunities();
      const mine = all.filter(o => o.postedBy === userProfile.uid);
      setMyPostings(mine);
      if (mine.length > 0 && !selectedPostingId) {
        setSelectedPostingId(mine[0].oppId);
        loadPipeline(mine[0].oppId);
      }
    } catch (err) { console.error(err); }
  }

  async function loadPipeline(oppId) {
    setLoadingPipeline(true);
    try {
      const data = await getOpportunityInterests(oppId);
      setPipelineData(data);
    } catch (err) { console.error(err); }
    setLoadingPipeline(false);
  }

  async function handleStatusChange(oppId, userId, newStatus) {
    try {
      await updateInterestStatus(oppId, userId, newStatus);
      setPipelineData(prev =>
        prev.map(i => i.userId === userId ? { ...i, status: newStatus, updatedAt: Date.now() } : i)
      );
    } catch (err) { console.error(err); }
  }

  async function handleCreateOpportunity() {
    if (!oppForm.title || !oppForm.description) { setError('Title and description required'); return; }
    if ((userProfile?.trustScore || 0) < 60) { setError('Trust score 60+ required to post opportunities.'); return; }
    setCreating(true); setError('');
    try {
      // Step 1: Build opportunity data
      const oppData = {
        ...oppForm,
        postedBy: userProfile.uid,
        posterName: userProfile.name,
        posterRole: userProfile.role,
        posterTrustBadge: userProfile.trustBadge,
        posterTrustScore: userProfile.trustScore,
      };

      // Step 2: AI-verify the listing before saving
      let verification = null;
      try {
        const verifyRes = await fetch('http://localhost:3001/api/opportunities/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opportunity: oppData, poster: userProfile })
        });
        if (verifyRes.ok) {
          verification = await verifyRes.json();
        }
      } catch (verifyErr) {
        console.warn('AI verification skipped:', verifyErr.message);
      }

      // Step 3: Save with verification stamp
      await createOpportunity({ ...oppData, verification });
      setShowCreate(false);
      setOppForm({ type: 'FUNDING', title: '', description: '', category: 'SaaS', budget: '', timeline: '', location: '', requirements: '', tags: [] });
      loadOpportunities();
    } catch (err) { setError(err.message); }
    setCreating(false);
  }

  async function handleExpressInterest(oppId, data) {
    await expressInterest(oppId, userProfile.uid, data);
    if (activeTab === 'interests') loadMyInterests();
  }

  function handleTagAdd(e) {
    if (e.key === 'Enter' && tagInput.trim()) {
      setOppForm(p => ({ ...p, tags: [...p.tags, tagInput.trim()] }));
      setTagInput('');
    }
  }

  const filtered = opportunities.filter(o => {
    const matchesType = typeFilter === 'ALL' || o.type === typeFilter;
    const matchesCat = categoryFilter === 'All' || o.category === categoryFilter;
    const matchesSearch = !searchQuery ||
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.posterName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesCat && matchesSearch;
  });

  const tabs = [
    { key: 'discover', label: '🔍 Discover', count: null },
    { key: 'interests', label: '📋 My Interests', count: myInterests.length || null },
    { key: 'postings', label: '📊 My Postings', count: myPostings.length || null },
  ];

  return (
    <div className="page-full" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header — Premium with gradient CTA */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-[var(--color-border-light)]"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-[var(--color-text-primary)]">
            🏢 Opportunity Marketplace
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
              Trust-Verified Deals
            </span>
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
            Find funding, partners, acquisitions, and growth opportunities — all trust-verified.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          id="post-opportunity-btn"
          disabled={(userProfile?.trustScore || 0) < 60}
          title={(userProfile?.trustScore || 0) < 60 ? 'Trust 60+ required to post' : 'Post a new opportunity'}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white
                     transition-all duration-200 shrink-0 cursor-pointer
                     hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          style={{
            background: (userProfile?.trustScore || 0) >= 60
              ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
              : 'var(--color-border)',
            boxShadow: (userProfile?.trustScore || 0) >= 60
              ? '0 4px 20px rgba(37, 99, 235, 0.3)'
              : 'none',
          }}
        >
          {(userProfile?.trustScore || 0) < 60 ? (
            <>🔒 Boost Trust to Post</>
          ) : (
            <>🚀 Post New Opportunity</>
          )}
        </button>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--color-border-light)' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer', marginBottom: -2,
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--color-primary)', color: 'white', borderRadius: 10, fontWeight: 600 }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Discover */}
      {activeTab === 'discover' && (
        <>
          {/* Type Filter Chips */}
          <motion.div className="flex flex-wrap gap-2 mb-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <button
              onClick={() => setTypeFilter('ALL')}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: typeFilter === 'ALL' ? 'var(--color-primary)' : 'var(--color-bg)',
                color: typeFilter === 'ALL' ? 'white' : 'var(--color-text-secondary)',
                border: typeFilter === 'ALL' ? 'none' : '1px solid var(--color-border-light)',
                transition: 'all 0.2s'
              }}
            >
              All Types
            </button>
            {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                style={{
                  padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: typeFilter === key ? conf.bg : 'var(--color-bg)',
                  color: typeFilter === key ? conf.color : 'var(--color-text-secondary)',
                  border: `1px solid ${typeFilter === key ? conf.color + '40' : 'var(--color-border-light)'}`,
                  transition: 'all 0.2s'
                }}
              >
                {conf.icon} {conf.label}
              </button>
            ))}
          </motion.div>

          {/* Search + Category */}
          <motion.div className="card card-body mb-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="flex gap-3 items-center">
              <input
                className="form-input" style={{ flex: 1 }}
                placeholder="🔍 Search opportunities by title, description, or company..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                id="opportunity-search-input"
              />
              <select className="form-select" style={{ width: 160 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </motion.div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {filtered.map((opp, i) => (
              <motion.div key={opp.oppId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <OpportunityCard opportunity={opp} onView={() => { setSelectedOpp(opp); setDetailOpen(true); }} />
              </motion.div>
            ))}
          </div>
          {filtered.length === 0 && <EmptyState icon="🏢" title="No opportunities found" message="Try adjusting filters or check back later." />}
        </>
      )}

      {/* Tab: My Interests */}
      {activeTab === 'interests' && (
        <div>
          {loadingInterests ? (
            <div className="text-center p-5 text-muted">Loading your interests...</div>
          ) : myInterests.length === 0 ? (
            <EmptyState icon="📋" title="No interests yet" message="Browse opportunities and express interest to track them here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myInterests.map((item, i) => {
                const st = STATUS_BADGES[item.status] || STATUS_BADGES.PENDING;
                const opp = item.opportunity || {};
                const tc = TYPE_CONFIG[opp.type] || TYPE_CONFIG.GROWTH;
                return (
                  <motion.div key={item.oppId} className="card card-body" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: tc.bg, color: tc.color, fontWeight: 600 }}>
                            {tc.icon} {tc.label}
                          </span>
                        </div>
                        <div className="font-semibold">{opp.title || 'Opportunity'}</div>
                        <div className="text-sm text-secondary">{opp.posterName || 'Poster'} · {opp.category || ''}</div>
                        <div className="text-xs text-muted mt-1">Sent {item.sentAt ? new Date(item.sentAt).toLocaleDateString() : ''}</div>
                      </div>
                      <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: My Postings (Pipeline) */}
      {activeTab === 'postings' && (
        <div>
          {myPostings.length === 0 ? (
            <EmptyState icon="📊" title="No postings yet" message="Post an opportunity to start receiving interest from verified professionals." />
          ) : (
            <>
              <div className="card card-body mb-4">
                <label className="form-label" style={{ marginBottom: 8 }}>Select a posting to manage:</label>
                <select className="form-select" value={selectedPostingId || ''} onChange={(e) => { setSelectedPostingId(e.target.value); loadPipeline(e.target.value); }}>
                  {myPostings.map(o => (
                    <option key={o.oppId} value={o.oppId}>
                      {TYPE_CONFIG[o.type]?.icon || '📌'} {o.title} — {o.interestCount || 0} interested
                    </option>
                  ))}
                </select>
              </div>

              {loadingPipeline ? (
                <div className="text-center p-5 text-muted">Loading pipeline...</div>
              ) : pipelineData.length === 0 ? (
                <EmptyState icon="📋" title="No one has expressed interest yet" message="Share your opportunity to attract verified partners." />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${INTEREST_COLUMNS.length}, 1fr)`, gap: 12, overflowX: 'auto' }}>
                  {INTEREST_COLUMNS.map(col => {
                    const colItems = pipelineData.filter(i => i.status === col.key);
                    return (
                      <div key={col.key} style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', padding: 12, minHeight: 280 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${col.color}` }}>
                          <span>{col.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{col.label}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', background: `${col.color}20`, color: col.color, borderRadius: 10, fontWeight: 600, marginLeft: 'auto' }}>
                            {colItems.length}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {colItems.map(item => (
                            <div key={item.userId} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 12, border: '1px solid var(--color-border-light)' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar name={item.user?.name} size="sm" />
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.user?.name || 'User'}</div>
                                  <div className="text-xs text-muted">{item.senderHeadline || item.user?.headline || ''}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mb-2 text-xs">
                                <TrustBadge badge={item.user?.trustBadge || 'NEW'} size="sm" />
                                {item.matchScore > 0 && (
                                  <span style={{ color: item.matchScore >= 70 ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                                    {item.matchScore}% fit
                                  </span>
                                )}
                              </div>
                              {item.proposal && (
                                <p className="text-xs text-secondary" style={{ marginBottom: 8, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  "{item.proposal}"
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1">
                                {INTEREST_COLUMNS.filter(c => c.key !== col.key).map(target => (
                                  <button key={target.key} onClick={() => handleStatusChange(selectedPostingId, item.userId, target.key)}
                                    style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: `1px solid ${target.color}30`, background: `${target.color}10`, color: target.color, cursor: 'pointer', fontWeight: 500 }}>
                                    → {target.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <OpportunityDetailModal
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedOpp(null); }}
        opportunity={selectedOpp}
        userProfile={userProfile}
        onExpressInterest={handleExpressInterest}
      />

      {/* Create Opportunity Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Post a Business Opportunity"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateOpportunity} disabled={creating} id="submit-opportunity-btn">
              {creating ? '⏳ Posting...' : '📤 Post Opportunity'}
            </button>
          </>
        }
      >
        {(userProfile?.trustScore || 0) < 60 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, fontSize: 13 }}>
            <strong style={{ color: 'var(--color-danger)' }}>🔒 Trust Score Too Low</strong>
            <p className="text-sm text-secondary" style={{ marginTop: 4 }}>
              Your trust score (60+) is required to post. Current: {userProfile?.trustScore || 0}/130.
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Type *</label>
            <select className="form-select" value={oppForm.type} onChange={(e) => setOppForm(p => ({ ...p, type: e.target.value }))}>
              {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                <option key={key} value={key}>{conf.icon} {conf.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={oppForm.category} onChange={(e) => setOppForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="form-input" placeholder="e.g. Seed Round — $500K for AI Platform" value={oppForm.title} onChange={(e) => setOppForm(p => ({ ...p, title: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea className="form-textarea" rows={4} placeholder="Describe the opportunity in detail..." value={oppForm.description} onChange={(e) => setOppForm(p => ({ ...p, description: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">What You're Looking For</label>
          <textarea className="form-textarea" rows={2} placeholder="Describe your ideal partner/investor/buyer..." value={oppForm.requirements} onChange={(e) => setOppForm(p => ({ ...p, requirements: e.target.value }))} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Budget</label>
            <input className="form-input" placeholder="$50K–$200K" value={oppForm.budget} onChange={(e) => setOppForm(p => ({ ...p, budget: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Timeline</label>
            <input className="form-input" placeholder="Q3 2026" value={oppForm.timeline} onChange={(e) => setOppForm(p => ({ ...p, timeline: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" placeholder="Remote" value={oppForm.location} onChange={(e) => setOppForm(p => ({ ...p, location: e.target.value }))} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tags (Enter to add)</label>
          <input className="form-input" placeholder="e.g. SaaS, AI" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagAdd} />
          <div className="flex flex-wrap gap-2 mt-2">
            {oppForm.tags.map((t, i) => (
              <span key={i} className="badge badge-skill" style={{ cursor: 'pointer' }} onClick={() => setOppForm(p => ({ ...p, tags: p.tags.filter((_, idx) => idx !== i) }))}>
                {t} ✕
              </span>
            ))}
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}
      </Modal>
    </div>
  );
}
