import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import JobCard from '../components/jobs/JobCard';
import JobDetailModal from '../components/jobs/JobDetailModal';
import Modal from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';
import Avatar from '../components/shared/Avatar';
import TrustBadge from '../components/shared/TrustBadge';
import { getJobs, createJob, applyToJob, getJobApplications, getUserApplications, updateApplicationStatus } from '../services/realtimeService';

const DEMO_JOBS = [
  {
    jobId: 'demo-job-1',
    companyId: 'c1',
    companyName: 'TechVentures Inc.',
    companyTrustBadge: 'TRUSTED',
    title: 'Senior Backend Engineer',
    description: 'We are looking for an experienced backend engineer to help scale our trust verification platform. You will work with Python, FastAPI, PostgreSQL, and our distributed cloud infrastructure.',
    location: 'San Francisco, CA',
    type: 'full-time',
    requiredExperienceYears: 5,
    requiredSkills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'AWS'],
    salary: '$180K - $220K',
    applicantsCount: 24,
    status: 'open',
    createdAt: Date.now() - 2 * 86400000
  },
  {
    jobId: 'demo-job-2',
    companyId: 'c2', 
    companyName: 'DataFlow Systems',
    companyTrustBadge: 'HIGH_TRUST',
    title: 'Product Designer',
    description: 'Join our design team to create beautiful, intuitive interfaces for our enterprise clients. You will own the design system and lead user research initiatives.',
    location: 'Remote',
    type: 'full-time',
    requiredExperienceYears: 3,
    requiredSkills: ['Figma', 'UI/UX', 'Design Systems', 'Prototyping'],
    salary: '$140K - $170K',
    applicantsCount: 45,
    status: 'open',
    createdAt: Date.now() - 3 * 86400000
  },
  {
    jobId: 'demo-job-3',
    companyId: 'c3',
    companyName: 'CloudScale AI',
    companyTrustBadge: 'VERIFIED',
    title: 'Machine Learning Engineer',
    description: 'Build and deploy ML models for real-time trust scoring and fraud detection. You will work closely with our data science team on cutting-edge NLP and computer vision pipelines.',
    location: 'New York, NY',
    type: 'full-time',
    requiredExperienceYears: 4,
    requiredSkills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps', 'Kubernetes'],
    salary: '$200K - $250K',
    applicantsCount: 67,
    status: 'open',
    createdAt: Date.now() - 5 * 86400000
  },
  {
    jobId: 'demo-job-4',
    companyId: 'c1',
    companyName: 'TechVentures Inc.',
    companyTrustBadge: 'TRUSTED',
    title: 'DevOps Engineer',
    description: 'Own our cloud infrastructure and CI/CD pipelines. Help us achieve 99.99% uptime across all production services.',
    location: 'Remote',
    type: 'full-time',
    requiredExperienceYears: 3,
    requiredSkills: ['AWS', 'Terraform', 'Docker', 'Kubernetes', 'CI/CD'],
    salary: '$160K - $190K',
    applicantsCount: 18,
    status: 'open',
    createdAt: Date.now() - 7 * 86400000
  },
];

const KANBAN_COLUMNS = [
  { key: 'PENDING', label: 'Pending', icon: '📋', color: '#6b7280' },
  { key: 'SHORTLISTED', label: 'Shortlisted', icon: '⭐', color: '#f59e0b' },
  { key: 'INTERVIEWING', label: 'Interviewing', icon: '🎤', color: '#3b82f6' },
  { key: 'HIRED', label: 'Hired', icon: '✅', color: '#22c55e' },
  { key: 'REJECTED', label: 'Rejected', icon: '❌', color: '#ef4444' },
];

const STATUS_BADGES = {
  PENDING: { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', label: 'Pending' },
  SHORTLISTED: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Shortlisted' },
  INTERVIEWING: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', label: 'Interviewing' },
  HIRED: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: 'Hired' },
  REJECTED: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Rejected' },
};

export default function JobsPage() {
  const { isCompany, userProfile } = useAuth();
  const [jobs, setJobs] = useState(DEMO_JOBS);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState(isCompany ? 'marketplace' : 'explore');

  // Job Detail
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create Job Modal
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '', description: '', location: '', type: 'full-time',
    requiredExperienceYears: 1, requiredSkills: [], salary: ''
  });
  const [skillInput, setSkillInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // My Applications (Professional)
  const [myApplications, setMyApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Company Kanban
  const [companyJobs, setCompanyJobs] = useState([]);
  const [selectedPostingId, setSelectedPostingId] = useState(null);
  const [kanbanApplicants, setKanbanApplicants] = useState([]);
  const [loadingKanban, setLoadingKanban] = useState(false);

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      try {
        const data = await getJobs({ status: 'open' });
        if (data.length > 0) setJobs(data);
      } catch (err) {
        console.log('Using demo jobs data');
      }
      setLoading(false);
    }
    loadJobs();
  }, []);

  useEffect(() => {
    if (activeTab === 'applications' && userProfile?.uid) {
      loadMyApplications();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'manage' && isCompany && userProfile?.uid) {
      loadCompanyJobs();
    }
  }, [activeTab]);

  async function loadMyApplications() {
    setLoadingApps(true);
    try {
      const apps = await getUserApplications(userProfile.uid);
      setMyApplications(apps);
    } catch (err) {
      console.error('Error loading applications:', err);
    }
    setLoadingApps(false);
  }

  async function loadCompanyJobs() {
    try {
      const allJobs = await getJobs();
      const mine = allJobs.filter(j => j.companyId === userProfile.uid);
      setCompanyJobs(mine);
      if (mine.length > 0 && !selectedPostingId) {
        setSelectedPostingId(mine[0].jobId);
        loadKanban(mine[0].jobId);
      }
    } catch (err) {
      console.error('Error loading company jobs:', err);
    }
  }

  async function loadKanban(jobId) {
    setLoadingKanban(true);
    try {
      const apps = await getJobApplications(jobId);
      setKanbanApplicants(apps);
    } catch (err) {
      console.error('Error loading Kanban:', err);
    }
    setLoadingKanban(false);
  }

  async function handleStatusChange(jobId, userId, newStatus) {
    try {
      await updateApplicationStatus(jobId, userId, newStatus);
      setKanbanApplicants(prev =>
        prev.map(a => a.userId === userId ? { ...a, status: newStatus, updatedAt: Date.now() } : a)
      );
    } catch (err) {
      console.error('Status update error:', err);
    }
  }

  function handleSkillAdd(e) {
    if (e.key === 'Enter' && skillInput.trim()) {
      setJobForm(prev => ({ ...prev, requiredSkills: [...prev.requiredSkills, skillInput.trim()] }));
      setSkillInput('');
    }
  }

  async function handleCreateJob() {
    if (!jobForm.title || !jobForm.description) {
      setError('Title and description are required');
      return;
    }
    if (jobForm.requiredExperienceYears < 1) {
      setError('Minimum 1 year experience required (experienced roles only)');
      return;
    }

    // Trust Score Gate: Only HIGH trust companies can post
    if ((userProfile?.trustScore || 0) < 80) {
      setError('Your organization needs a HIGH trust score (80+) to post jobs. Complete verification to boost your trust.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      await createJob({
        ...jobForm,
        companyId: userProfile.uid,
        companyName: userProfile.name,
        companyTrustBadge: userProfile.trustBadge,
        status: 'open',
        applicantsCount: 0
      });
      setShowCreateJob(false);
      setJobForm({ title: '', description: '', location: '', type: 'full-time', requiredExperienceYears: 1, requiredSkills: [], salary: '' });
      // Reload jobs
      const data = await getJobs();
      if (data.length > 0) setJobs(data);
    } catch (err) {
      setError(err.message);
    }
    setCreating(false);
  }

  async function handleApplyToJob(jobId, applicationData) {
    await applyToJob(jobId, userProfile.uid, applicationData);
    // Refresh applications
    if (activeTab === 'applications') loadMyApplications();
  }

  const filteredJobs = jobs.filter(job => {
    const matchesType = filter === 'all' || job.type === filter;
    const matchesSearch = !searchQuery || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      job.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const tabs = isCompany
    ? [
        { key: 'marketplace', label: '🌐 Marketplace', count: null },
        { key: 'manage', label: '📊 Manage Postings', count: companyJobs.length || null },
      ]
    : [
        { key: 'explore', label: '🔍 Explore Jobs', count: null },
        { key: 'applications', label: '📋 My Applications', count: myApplications.length || null },
      ];

  return (
    <div className="page-full" style={{ maxWidth: 1060, margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        className="flex justify-between items-center mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            💼 Job Marketplace
            <span style={{ fontSize: 12, fontWeight: 500, padding: '4px 10px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--color-primary)', borderRadius: 20 }}>
              Experienced Only
            </span>
          </h1>
          <p className="text-sm text-secondary mt-1">Verified roles for verified professionals — no freshers</p>
        </div>
        {isCompany && (
          <button 
            className="btn btn-primary btn-lg" 
            onClick={() => setShowCreateJob(true)} 
            id="create-job-btn"
            disabled={(userProfile?.trustScore || 0) < 80}
            title={(userProfile?.trustScore || 0) < 80 ? 'Trust Score 80+ required to post jobs' : 'Post a new job'}
          >
            {(userProfile?.trustScore || 0) < 80 ? '🔒 Boost Trust to Post' : '+ Post a Job'}
          </button>
        )}
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--color-border-light)', paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -2,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
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

      {/* Tab: Explore Jobs / Marketplace */}
      {(activeTab === 'explore' || activeTab === 'marketplace') && (
        <>
          {/* Search & Filter */}
          <motion.div
            className="card card-body mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex gap-3 items-center">
              <input
                className="form-input"
                placeholder="🔍 Search jobs by title or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
                id="job-search-input"
              />
              <select className="form-select" style={{ width: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
          </motion.div>

          {/* Job Listings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
            {filteredJobs.map((job, i) => (
              <motion.div
                key={job.jobId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <JobCard 
                  job={job}
                  onView={() => { setSelectedJob(job); setDetailOpen(true); }}
                  onApply={() => { setSelectedJob(job); setDetailOpen(true); }}
                />
              </motion.div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <EmptyState icon="💼" title="No jobs found" message="Try adjusting your search or check back later." />
          )}
        </>
      )}

      {/* Tab: My Applications (Professional) */}
      {activeTab === 'applications' && (
        <div>
          {loadingApps ? (
            <div className="text-center p-5 text-muted">Loading your applications...</div>
          ) : myApplications.length === 0 ? (
            <EmptyState icon="📋" title="No applications yet" message="Browse jobs and apply to track your progress here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myApplications.map((app, i) => {
                const st = STATUS_BADGES[app.status] || STATUS_BADGES.PENDING;
                return (
                  <motion.div
                    key={app.jobId}
                    className="card card-body"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{app.job?.title || 'Job'}</div>
                        <div className="text-sm text-secondary">{app.job?.companyName || 'Company'} · {app.job?.location || 'Remote'}</div>
                        <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                          Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: st.bg, color: st.color
                      }}>
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

      {/* Tab: Manage Postings — Company Kanban */}
      {activeTab === 'manage' && isCompany && (
        <div>
          {companyJobs.length === 0 ? (
            <EmptyState icon="📊" title="No job postings yet" message="Post a job to start receiving applications from verified professionals." />
          ) : (
            <>
              {/* Job Selector */}
              <div className="card card-body mb-4">
                <label className="form-label" style={{ marginBottom: 8 }}>Select a job posting to manage:</label>
                <select
                  className="form-select"
                  value={selectedPostingId || ''}
                  onChange={(e) => { setSelectedPostingId(e.target.value); loadKanban(e.target.value); }}
                >
                  {companyJobs.map(j => (
                    <option key={j.jobId} value={j.jobId}>
                      {j.title} — {j.applicantsCount || 0} applicants
                    </option>
                  ))}
                </select>
              </div>

              {/* Kanban Board */}
              {loadingKanban ? (
                <div className="text-center p-5 text-muted">Loading applicants...</div>
              ) : kanbanApplicants.length === 0 ? (
                <EmptyState icon="📋" title="No applicants yet" message="Share this job posting to attract experienced professionals." />
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${KANBAN_COLUMNS.length}, 1fr)`,
                  gap: 12,
                  overflowX: 'auto'
                }}>
                  {KANBAN_COLUMNS.map(col => {
                    const colApps = kanbanApplicants.filter(a => a.status === col.key);
                    return (
                      <div key={col.key} style={{
                        background: 'var(--color-bg)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 12,
                        minHeight: 300
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${col.color}` }}>
                          <span>{col.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{col.label}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', background: `${col.color}20`, color: col.color, borderRadius: 10, fontWeight: 600, marginLeft: 'auto' }}>
                            {colApps.length}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {colApps.map(app => (
                            <div key={app.userId} style={{
                              background: 'var(--color-surface)',
                              borderRadius: 'var(--radius-md)',
                              padding: 12,
                              border: '1px solid var(--color-border-light)',
                            }}>
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar name={app.user?.name} size="sm" />
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>{app.user?.name || 'User'}</div>
                                  <div className="text-xs text-muted">{app.user?.headline || 'Professional'}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mb-2 text-xs">
                                <TrustBadge badge={app.user?.trustBadge || 'NEW'} size="sm" />
                                <span>{app.applicantExperience || app.user?.experienceYears || '?'}yr exp</span>
                                {app.matchScore > 0 && (
                                  <span style={{ color: app.matchScore >= 70 ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                                    {app.matchScore}% match
                                  </span>
                                )}
                              </div>

                              {/* Status Change Actions */}
                              <div className="flex flex-wrap gap-1" style={{ marginTop: 8 }}>
                                {KANBAN_COLUMNS.filter(c => c.key !== col.key).slice(0, 3).map(target => (
                                  <button
                                    key={target.key}
                                    onClick={() => handleStatusChange(selectedPostingId, app.userId, target.key)}
                                    style={{
                                      fontSize: 10, padding: '3px 8px', borderRadius: 6,
                                      border: `1px solid ${target.color}30`, background: `${target.color}10`,
                                      color: target.color, cursor: 'pointer', fontWeight: 500
                                    }}
                                  >
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

      {/* Job Detail Modal */}
      <JobDetailModal
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedJob(null); }}
        job={selectedJob}
        userProfile={userProfile}
        onApplySuccess={handleApplyToJob}
      />

      {/* Create Job Modal */}
      <Modal
        isOpen={showCreateJob}
        onClose={() => setShowCreateJob(false)}
        title="Post a New Job"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCreateJob(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateJob} disabled={creating} id="submit-job-btn">
              {creating ? '⏳ Posting...' : '📤 Post Job'}
            </button>
          </>
        }
      >
        {(userProfile?.trustScore || 0) < 80 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, fontSize: 13 }}>
            <strong style={{ color: 'var(--color-danger)' }}>🔒 Trust Score Too Low</strong>
            <p className="text-sm text-secondary" style={{ marginTop: 4 }}>
              Your organization needs a HIGH trust score (80+) to post jobs. Current: {userProfile?.trustScore || 0}/100.
              <br />Complete verification steps to boost your trust.
            </p>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Job Title *</label>
          <input className="form-input" placeholder="e.g. Senior Software Engineer" value={jobForm.title} onChange={(e) => setJobForm(prev => ({ ...prev, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea className="form-textarea" placeholder="Describe the role, responsibilities, and what you're looking for..." value={jobForm.description} onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" placeholder="e.g. Remote" value={jobForm.location} onChange={(e) => setJobForm(prev => ({ ...prev, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={jobForm.type} onChange={(e) => setJobForm(prev => ({ ...prev, type: e.target.value }))}>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Min. Experience (years) *</label>
            <input type="number" className="form-input" min="1" value={jobForm.requiredExperienceYears} onChange={(e) => setJobForm(prev => ({ ...prev, requiredExperienceYears: parseInt(e.target.value) || 1 }))} />
            <div className="text-xs text-muted mt-1">⚠️ Minimum 1 year (experienced only)</div>
          </div>
          <div className="form-group">
            <label className="form-label">Salary Range</label>
            <input className="form-input" placeholder="e.g. $120K - $150K" value={jobForm.salary} onChange={(e) => setJobForm(prev => ({ ...prev, salary: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Required Skills (Enter to add)</label>
          <input className="form-input" placeholder="e.g. React" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={handleSkillAdd} />
          <div className="flex flex-wrap gap-2 mt-2">
            {jobForm.requiredSkills.map((s, i) => (
              <span key={i} className="badge badge-skill" style={{ cursor: 'pointer' }} onClick={() => setJobForm(prev => ({ ...prev, requiredSkills: prev.requiredSkills.filter((_, idx) => idx !== i) }))}>
                {s} ✕
              </span>
            ))}
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
      </Modal>
    </div>
  );
}
