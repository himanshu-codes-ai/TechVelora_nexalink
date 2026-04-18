import React from 'react';
import TrustBadge from '../shared/TrustBadge';

export default function JobCard({ job, onApply, onView }) {
  function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="job-card" onClick={onView} id={`job-card-${job.jobId}`}>
      <div className="job-card-header">
        <div className="job-card-logo">
          {job.companyLogo ? (
            <img src={job.companyLogo} alt={job.companyName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
          ) : (
            job.companyName ? job.companyName[0].toUpperCase() : '?'
          )}
        </div>
        <div>
          <h3 className="job-card-title">{job.title}</h3>
          <div className="job-card-company flex items-center gap-2">
            {job.companyName}
            {job.companyTrustBadge && <TrustBadge badge={job.companyTrustBadge} />}
          </div>
        </div>
      </div>

      <div className="job-card-meta">
        <span>📍 {job.location || 'Remote'}</span>
        <span>💼 {job.type || 'Full-time'}</span>
        <span>📅 {job.requiredExperienceYears}+ yrs required</span>
        {job.salary && <span>💰 {job.salary}</span>}
      </div>

      {job.requiredSkills && job.requiredSkills.length > 0 && (
        <div className="job-card-skills">
          {job.requiredSkills.slice(0, 5).map((skill, i) => (
            <span key={i} className="badge badge-skill">{skill}</span>
          ))}
          {job.requiredSkills.length > 5 && (
            <span className="badge badge-skill">+{job.requiredSkills.length - 5}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {job.applicantsCount || 0} applicants · Posted {formatDate(job.createdAt)}
        </span>
        <button 
          className="btn btn-primary btn-sm"
          onClick={(e) => { e.stopPropagation(); onApply && onApply(job); }}
          id={`apply-btn-${job.jobId}`}
        >
          Apply Now
        </button>
      </div>
    </div>
  );
}
