import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../shared/Modal';
import TrustBadge from '../shared/TrustBadge';

const AI_BACKEND_URL = 'http://localhost:3001';

export default function JobDetailModal({ isOpen, onClose, job, userProfile, onApplySuccess }) {
  const [step, setStep] = useState('details'); // details | analyzing | result | applying | applied
  const [matchResult, setMatchResult] = useState(null);
  const [pitch, setPitch] = useState('');
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);

  if (!job) return null;

  const userExp = userProfile?.experienceYears || 0;
  const meetsExperience = userExp >= (job.requiredExperienceYears || 0);

  async function handleAnalyzeMatch() {
    setStep('analyzing');
    setError('');

    try {
      const response = await fetch(`${AI_BACKEND_URL}/api/jobs/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: userProfile, job })
      });

      if (!response.ok) throw new Error('Match analysis failed');

      const result = await response.json();
      setMatchResult(result);
      setPitch(result.pitch || '');
      setStep('result');
    } catch (err) {
      setError(err.message || 'Failed to analyze match');
      setStep('details');
    }
  }

  async function handleSubmitApplication() {
    if (!pitch.trim()) {
      setError('Please write your application pitch');
      return;
    }

    setApplying(true);
    setError('');

    try {
      if (onApplySuccess) {
        await onApplySuccess(job.jobId, {
          pitch: pitch.trim(),
          matchScore: matchResult?.matchScore || 0,
          alignmentPoints: matchResult?.alignmentPoints || [],
          applicantName: userProfile?.name || 'Unknown',
          applicantHeadline: userProfile?.headline || '',
          applicantTrustScore: userProfile?.trustScore || 0,
          applicantExperience: userExp
        });
      }
      setStep('applied');
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    }
    setApplying(false);
  }

  function getScoreColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  function handleClose() {
    setStep('details');
    setMatchResult(null);
    setPitch('');
    setError('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'applied' ? '✅ Application Submitted' : job.title}
      footer={
        <>
          {step === 'details' && (
            <>
              <button className="btn btn-secondary" onClick={handleClose}>Close</button>
              {meetsExperience ? (
                <button className="btn btn-primary" onClick={handleAnalyzeMatch} id="analyze-match-btn">
                  🤖 Analyze Match with AI
                </button>
              ) : (
                <button className="btn btn-secondary" disabled style={{ opacity: 0.5 }}>
                  ❌ Experience Not Met ({userExp}/{job.requiredExperienceYears}yr)
                </button>
              )}
            </>
          )}
          {step === 'result' && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep('details')}>Back</button>
              {matchResult?.status !== 'REJECTED_DETERMINISTIC' && (
                <button className="btn btn-primary" onClick={handleSubmitApplication} disabled={applying} id="submit-application-btn">
                  {applying ? '⏳ Submitting...' : '📤 Submit Application'}
                </button>
              )}
            </>
          )}
          {step === 'applied' && (
            <button className="btn btn-primary" onClick={handleClose}>Done</button>
          )}
        </>
      }
    >
      {/* Error Banner */}
      {error && <div className="form-error mb-4">{error}</div>}

      {/* Step: Job Details */}
      {step === 'details' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--color-primary)' }}>
              {job.companyName?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="font-semibold">{job.companyName}</div>
              <div className="flex items-center gap-2 text-sm text-secondary">
                {job.companyTrustBadge && <TrustBadge badge={job.companyTrustBadge} />}
                <span>📍 {job.location || 'Remote'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ padding: '12px 16px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div className="text-xs text-muted">Type</div>
              <div className="font-semibold text-sm">{job.type || 'Full-time'}</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div className="text-xs text-muted">Min. Experience</div>
              <div className="font-semibold text-sm">{job.requiredExperienceYears}+ years</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div className="text-xs text-muted">Salary</div>
              <div className="font-semibold text-sm">{job.salary || 'Not disclosed'}</div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>About the Role</h4>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{job.description}</p>
          </div>

          {job.requiredSkills?.length > 0 && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Required Skills</h4>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill, i) => (
                  <span key={i} className="badge badge-skill">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {!meetsExperience && (
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, fontSize: 13 }}>
              <strong style={{ color: 'var(--color-danger)' }}>⚠️ Experience Requirement Not Met</strong>
              <p className="text-sm text-secondary" style={{ marginTop: 4 }}>
                This role requires {job.requiredExperienceYears}+ years. Your profile shows {userExp} years.
              </p>
            </div>
          )}

          <div className="text-xs text-muted">
            {job.applicantsCount || 0} applicants · Posted {job.createdAt ? new Date(typeof job.createdAt === 'number' ? job.createdAt : job.createdAt.toDate?.()).toLocaleDateString() : 'recently'}
          </div>
        </div>
      )}

      {/* Step: Analyzing */}
      {step === 'analyzing' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ width: 56, height: 56, margin: '0 auto 20px', borderRadius: '50%', border: '4px solid var(--color-border)', borderTopColor: 'var(--color-primary)' }}
          />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Analyzing Your Match</h3>
          <p className="text-sm text-secondary">Our AI recruiter is comparing your verified profile against the job requirements...</p>
          <div className="text-xs text-muted" style={{ marginTop: 12 }}>Powered by Groq • Llama 3.3 70B</div>
        </div>
      )}

      {/* Step: Match Result + Editable Pitch */}
      {step === 'result' && matchResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Score Circle */}
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', margin: '0 auto',
              border: `6px solid ${getScoreColor(matchResult.matchScore)}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: `${getScoreColor(matchResult.matchScore)}10`
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: getScoreColor(matchResult.matchScore) }}>{matchResult.matchScore}</div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Match</div>
            </div>
            {matchResult.status === 'REJECTED_DETERMINISTIC' && (
              <div style={{ marginTop: 12, padding: '10px 16px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 8, fontSize: 13, color: 'var(--color-danger)' }}>
                {matchResult.reason}
              </div>
            )}
          </div>

          {/* Alignment Points */}
          {matchResult.alignmentPoints?.length > 0 && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#22c55e' }}>✅ Strong Alignment</h4>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {matchResult.alignmentPoints.map((pt, i) => (
                  <li key={i} className="text-sm" style={{ marginBottom: 4 }}>{pt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Skill Gaps */}
          {matchResult.skillGaps?.length > 0 && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#f59e0b' }}>⚠️ Skill Gaps</h4>
              <div className="flex flex-wrap gap-2">
                {matchResult.skillGaps.map((skill, i) => (
                  <span key={i} className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Deterministic Stats */}
          {matchResult.deterministic && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ padding: 10, background: 'var(--color-bg)', borderRadius: 8, textAlign: 'center' }}>
                <div className="text-xs text-muted">Skill Overlap</div>
                <div className="font-semibold" style={{ color: 'var(--color-primary)' }}>{matchResult.deterministic.skillOverlapPct}%</div>
              </div>
              <div style={{ padding: 10, background: 'var(--color-bg)', borderRadius: 8, textAlign: 'center' }}>
                <div className="text-xs text-muted">Experience</div>
                <div className="font-semibold" style={{ color: matchResult.deterministic.experienceMet ? '#22c55e' : '#ef4444' }}>
                  {matchResult.deterministic.experienceMet ? '✅ Qualified' : '❌ Insufficient'}
                </div>
              </div>
            </div>
          )}

          {/* Editable AI Pitch */}
          {matchResult.status !== 'REJECTED_DETERMINISTIC' && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                📝 Your Application Pitch
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 8 }}>AI-Generated • Editable</span>
              </h4>
              <textarea
                className="form-textarea"
                rows={4}
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="Your application pitch..."
                style={{ resize: 'vertical', minHeight: 100, lineHeight: 1.6 }}
                id="application-pitch-textarea"
              />
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>Review and edit this pitch before submitting. The AI drafted this based on your profile match.</div>
            </div>
          )}
        </div>
      )}

      {/* Step: Applied Successfully */}
      {step === 'applied' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            style={{ fontSize: 56, marginBottom: 16 }}
          >
            🎉
          </motion.div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Application Submitted!</h3>
          <p className="text-sm text-secondary" style={{ maxWidth: 360, margin: '0 auto' }}>
            Your application to <strong>{job.title}</strong> at <strong>{job.companyName}</strong> has been submitted.
            You can track status in the "My Applications" tab.
          </p>
          {matchResult?.matchScore && (
            <div style={{ marginTop: 16, fontSize: 14 }}>
              Match Score: <strong style={{ color: getScoreColor(matchResult.matchScore) }}>{matchResult.matchScore}/100</strong>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
