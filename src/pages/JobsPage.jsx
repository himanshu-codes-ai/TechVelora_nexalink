import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import JobCard from '../components/jobs/JobCard';
import Modal from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';
import { getJobs, createJob } from '../services/realtimeService';

const DEMO_JOBS = [
  {
    jobId: 'demo-job-1',
    companyId: 'c1',
    companyName: 'TechVentures Inc.',
    companyTrustBadge: 'TRUSTED',
    title: 'Senior Backend Engineer',
    description: 'We are looking for an experienced backend engineer to help scale our trust verification platform.',
    location: 'San Francisco, CA',
    type: 'full-time',
    requiredExperienceYears: 5,
    requiredSkills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'AWS'],
    salary: '$180K - $220K',
    applicantsCount: 24,
    status: 'open',
    createdAt: { toDate: () => new Date(Date.now() - 2 * 86400000) }
  },
  {
    jobId: 'demo-job-2',
    companyId: 'c2', 
    companyName: 'DataFlow Systems',
    companyTrustBadge: 'HIGH_TRUST',
    title: 'Product Designer',
    description: 'Join our design team to create beautiful, intuitive interfaces for our enterprise clients.',
    location: 'Remote',
    type: 'full-time',
    requiredExperienceYears: 3,
    requiredSkills: ['Figma', 'UI/UX', 'Design Systems', 'Prototyping'],
    salary: '$140K - $170K',
    applicantsCount: 45,
    status: 'open',
    createdAt: { toDate: () => new Date(Date.now() - 3 * 86400000) }
  },
  {
    jobId: 'demo-job-3',
    companyId: 'c3',
    companyName: 'CloudScale AI',
    companyTrustBadge: 'VERIFIED',
    title: 'Machine Learning Engineer',
    description: 'Build and deploy ML models for real-time trust scoring and fraud detection.',
    location: 'New York, NY',
    type: 'full-time',
    requiredExperienceYears: 4,
    requiredSkills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps', 'Kubernetes'],
    salary: '$200K - $250K',
    applicantsCount: 67,
    status: 'open',
    createdAt: { toDate: () => new Date(Date.now() - 5 * 86400000) }
  },
  {
    jobId: 'demo-job-4',
    companyId: 'c1',
    companyName: 'TechVentures Inc.',
    companyTrustBadge: 'TRUSTED',
    title: 'DevOps Engineer',
    description: 'Own our cloud infrastructure and CI/CD pipelines. Help us achieve 99.99% uptime.',
    location: 'Remote',
    type: 'full-time',
    requiredExperienceYears: 3,
    requiredSkills: ['AWS', 'Terraform', 'Docker', 'Kubernetes', 'CI/CD'],
    salary: '$160K - $190K',
    applicantsCount: 18,
    status: 'open',
    createdAt: { toDate: () => new Date(Date.now() - 7 * 86400000) }
  },
];

export default function JobsPage() {
  const { isCompany, userProfile } = useAuth();
  const [jobs, setJobs] = useState(DEMO_JOBS);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create job form state
  const [jobForm, setJobForm] = useState({
    title: '', description: '', location: '', type: 'full-time',
    requiredExperienceYears: 1, requiredSkills: [], salary: ''
  });
  const [skillInput, setSkillInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

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
    setCreating(true);
    setError('');
    try {
      await createJob({
        ...jobForm,
        companyId: userProfile.uid,
        companyName: userProfile.name,
        companyTrustBadge: userProfile.trustBadge
      });
      setShowCreateJob(false);
      setJobForm({ title: '', description: '', location: '', type: 'full-time', requiredExperienceYears: 1, requiredSkills: [], salary: '' });
    } catch (err) {
      setError(err.message);
    }
    setCreating(false);
  }

  const filteredJobs = jobs.filter(job => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return job.title.toLowerCase().includes(q) || job.companyName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="page-full" style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        className="flex justify-between items-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>💼 Job Marketplace</h1>
          <p className="text-sm text-secondary mt-2">Experienced roles only — find your next career move</p>
        </div>
        {isCompany && (
          <button className="btn btn-primary btn-lg" onClick={() => setShowCreateJob(true)} id="create-job-btn">
            + Post a Job
          </button>
        )}
      </motion.div>

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
            <JobCard job={job} onApply={(j) => alert(`Applied to ${j.title}!`)} />
          </motion.div>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <EmptyState icon="💼" title="No jobs found" message="Try adjusting your search or check back later." />
      )}

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
