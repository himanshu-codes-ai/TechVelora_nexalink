import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../shared/Modal';
import TrustBadge from '../shared/TrustBadge';
import { TYPE_CONFIG, VERIFICATION_BADGES } from './OpportunityCard';

const AI_BACKEND_URL = 'http://localhost:3001';

const QUALITY_LABELS = {
  descriptionClarity: '📝 Clarity',
  budgetRealism: '💰 Budget',
  requirementsSpecificity: '🎯 Requirements',
  legitimacySignals: '🔐 Legitimacy',
  professionalTone: '✍️ Tone',
};

export default function OpportunityDetailModal({ isOpen, onClose, opportunity, userProfile, onExpressInterest }) {
  const [step, setStep] = useState('details');
  const [matchResult, setMatchResult] = useState(null);
  const [proposal, setProposal] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requireNDA, setRequireNDA] = useState(false);

  if (!opportunity) return null;

  const typeConf = TYPE_CONFIG[opportunity.type] || TYPE_CONFIG.GROWTH;
  const userTrust = userProfile?.trustScore || 0;
  const canExpress = userTrust >= 40;
  const isOwner = opportunity.postedBy === userProfile?.uid;
  const verif = opportunity.verification || null;
  const verifBadge = verif ? VERIFICATION_BADGES[verif.status] : null;

  async function handleAnalyzeFit() {
    setStep('analyzing');
    setError('');
    try {
      const response = await fetch(`${AI_BACKEND_URL}/api/opportunities/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: userProfile, opportunity })
      });
      if (!response.ok) throw new Error('Fit analysis failed');
      const result = await response.json();
      setMatchResult(result);
      setProposal(result.proposalDraft || '');
      setStep('result');
    } catch (err) {
      setError(err.message || 'Failed to analyze fit');
      setStep('details');
    }
  }

  async function handleSubmitInterest() {
    if (!proposal.trim()) { setError('Please write your proposal'); return; }
    setSubmitting(true);
    setError('');
    try {
      if (onExpressInterest) {
        await onExpressInterest(opportunity.oppId, {
          proposal: proposal.trim(),
          matchScore: matchResult?.fitScore || 0,
          alignmentPoints: matchResult?.alignmentPoints || [],
          senderName: userProfile?.name || 'Unknown',
          senderTrustScore: userTrust,
          senderHeadline: userProfile?.headline || '',
          requireNDA,
        });
      }
      setStep('submitted');
    } catch (err) {
      setError(err.message || 'Failed to submit interest');
    }
    setSubmitting(false);
  }

  function getScoreColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  function handleClose() {
    setStep('details'); setMatchResult(null); setProposal(''); setError(''); setRequireNDA(false);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'submitted' ? '✅ Interest Submitted' : opportunity.title}
      footer={
        <>
          {step === 'details' && (
            <>
              <button className="btn btn-secondary" onClick={handleClose}>Close</button>
              {!isOwner && canExpress ? (
                <button
                  className="btn btn-primary"
                  onClick={handleAnalyzeFit}
                  id="analyze-fit-btn"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none' }}
                >
                  🤖 Analyze Fit with AI
                </button>
              ) : isOwner ? (
                <button className="btn btn-secondary" disabled style={{ opacity: 0.5 }}>📌 You posted this</button>
              ) : (
                <button className="btn btn-secondary" disabled style={{ opacity: 0.5 }}>
                  🔒 Trust Score {userTrust}/40 Required
                </button>
              )}
            </>
          )}
          {step === 'result' && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep('details')}>← Back</button>
              {matchResult?.status !== 'REJECTED_TRUST' && (
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitInterest}
                  disabled={submitting}
                  id="submit-interest-btn"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none' }}
                >
                  {submitting ? '⏳ Submitting...' : '📤 Submit Interest'}
                </button>
              )}
            </>
          )}
          {step === 'submitted' && (
            <button className="btn btn-primary" onClick={handleClose}>Done</button>
          )}
        </>
      }
    >
      {error && <div className="form-error mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

      {/* ═══════════════════════════════════════════
          STEP: Details
         ═══════════════════════════════════════════ */}
      {step === 'details' && (
        <div className="flex flex-col gap-5">
          {/* Type + Poster Header */}
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: typeConf.bg, border: `1px solid ${typeConf.color}20` }}
            >
              {typeConf.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: typeConf.bg, color: typeConf.color }}
                >
                  {typeConf.label}
                </span>
                {verifBadge && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: verifBadge.bg, color: verifBadge.color, border: `1px solid ${verifBadge.color}30` }}
                  >
                    {verifBadge.icon} {verifBadge.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                Posted by <strong className="text-[var(--color-text-primary)]">{opportunity.posterName}</strong>
                {opportunity.posterTrustBadge && <TrustBadge badge={opportunity.posterTrustBadge} size="sm" />}
              </div>
            </div>
          </div>

          {/* AI Verification Report Panel */}
          {verif && (
            <div
              className="rounded-xl p-4 border"
              style={{
                background: verifBadge ? `${verifBadge.color}06` : 'var(--color-surface)',
                borderColor: verifBadge ? `${verifBadge.color}20` : 'var(--color-border-light)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5 m-0">
                  🤖 AI Verification Report
                </h4>
                <span className="text-sm font-bold" style={{ color: getScoreColor(verif.verificationScore) }}>
                  {verif.verificationScore}/100
                </span>
              </div>

              {/* Quality Checks — mini bar grid */}
              {verif.qualityChecks && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                  {Object.entries(verif.qualityChecks).map(([key, score]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-secondary)]">{QUALITY_LABELS[key] || key}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <div key={s} className="w-2 h-2 rounded-sm" style={{
                            background: s <= score ? getScoreColor(score * 20) : 'var(--color-border-light)'
                          }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {verif.strengths?.length > 0 && (
                <div className="text-xs mb-1.5" style={{ color: '#16a34a' }}>
                  {verif.strengths.map((s, i) => <div key={i}>✅ {s}</div>)}
                </div>
              )}
              {verif.flags?.length > 0 && (
                <div className="text-xs mb-1.5" style={{ color: '#d97706' }}>
                  {verif.flags.map((f, i) => <div key={i}>⚠️ {f}</div>)}
                </div>
              )}
              {verif.recommendation && (
                <div className="text-xs italic text-[var(--color-text-muted)] mt-1.5">💡 {verif.recommendation}</div>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Budget', value: opportunity.budget || 'Flexible', icon: '💰' },
              { label: 'Timeline', value: opportunity.timeline || 'Open', icon: '📅' },
              { label: 'Location', value: opportunity.location || 'Remote', icon: '📍' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-light)] text-center">
                <div className="text-lg mb-0.5">{stat.icon}</div>
                <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide font-medium">{stat.label}</div>
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-[var(--color-text-primary)]">About This Opportunity</h4>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{opportunity.description}</p>
          </div>

          {/* Requirements */}
          {opportunity.requirements && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-[var(--color-text-primary)]">What We're Looking For</h4>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{opportunity.requirements}</p>
            </div>
          )}

          {/* Tags */}
          {opportunity.tags?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-[var(--color-text-primary)]">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {opportunity.tags.map((tag, i) => (
                  <span key={i} className="badge badge-skill">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Trust Gate Warning */}
          {!isOwner && !canExpress && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <strong className="text-red-600 text-sm">🔒 Trust Score Too Low</strong>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                You need a trust score of 40+ to express interest. Current: {userTrust}. Complete profile verification to boost trust.
              </p>
            </div>
          )}

          <div className="text-xs text-[var(--color-text-muted)]">
            {opportunity.interestCount || 0} interested · {opportunity.category || 'General'} · Posted {opportunity.createdAt ? new Date(opportunity.createdAt).toLocaleDateString() : 'recently'}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STEP: Analyzing
         ═══════════════════════════════════════════ */}
      {step === 'analyzing' && (
        <div className="text-center py-12 px-5">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-6 rounded-full"
            style={{ border: '4px solid var(--color-border)', borderTopColor: typeConf.color }}
          />
          <h3 className="text-lg font-semibold mb-2 text-[var(--color-text-primary)]">Analyzing Strategic Fit</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">Our AI business analyst is evaluating your profile against this opportunity...</p>
          <div className="text-xs text-[var(--color-text-muted)] mt-3 flex items-center justify-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Powered by Groq • Llama 3.3 70B
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STEP: Result — Business Alignment Radar
         ═══════════════════════════════════════════ */}
      {step === 'result' && matchResult && (
        <div className="flex flex-col gap-5">

          {/* ── Fit Score Ring ── */}
          <div className="text-center py-3">
            <div
              className="w-24 h-24 rounded-full mx-auto flex flex-col items-center justify-center"
              style={{
                border: `5px solid ${getScoreColor(matchResult.fitScore)}`,
                background: `${getScoreColor(matchResult.fitScore)}08`,
              }}
            >
              <div className="text-3xl font-extrabold" style={{ color: getScoreColor(matchResult.fitScore) }}>{matchResult.fitScore}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Fit</div>
            </div>
            {matchResult.status === 'REJECTED_TRUST' && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                {matchResult.reason}
              </div>
            )}
          </div>

          {/* ── Business Alignment Radar — Deal-Makers vs Deal-Breakers ── */}
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border-light)]">
              <h4 className="text-sm font-semibold m-0 flex items-center gap-2">
                📡 Business Alignment Radar
                <span className="text-[10px] font-normal text-[var(--color-text-muted)] ml-auto">AI-Powered Analysis</span>
              </h4>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[var(--color-border-light)]">
              {/* Deal-Makers Column */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-100">
                  <span className="w-6 h-6 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-xs">🟢</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-green-700">Deal-Makers</span>
                  <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
                    {matchResult.alignmentPoints?.length || 0}
                  </span>
                </div>
                {matchResult.alignmentPoints?.length > 0 ? (
                  <ul className="space-y-2">
                    {matchResult.alignmentPoints.map((pt, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2 text-sm text-[var(--color-text-primary)]"
                      >
                        <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                        <span className="leading-snug">{pt}</span>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)] italic">No strong alignment signals detected.</p>
                )}
              </div>

              {/* Deal-Breakers / Risks Column */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-100">
                  <span className="w-6 h-6 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-xs">🔴</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-red-700">Deal-Breakers / Risks</span>
                  <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                    {matchResult.concerns?.length || 0}
                  </span>
                </div>
                {matchResult.concerns?.length > 0 ? (
                  <ul className="space-y-2">
                    {matchResult.concerns.map((c, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                      >
                        <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                        <span className="leading-snug">{c}</span>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-green-600 italic">No deal-breakers found. 🎉</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Deterministic Scores ── */}
          {matchResult.deterministic && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[var(--color-surface)] rounded-xl text-center border border-[var(--color-border-light)]">
                <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide font-medium mb-1">Tag Overlap</div>
                <div className="text-lg font-bold text-[var(--color-primary)]">{matchResult.deterministic.tagOverlapPct}%</div>
              </div>
              <div className="p-3 bg-[var(--color-surface)] rounded-xl text-center border border-[var(--color-border-light)]">
                <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide font-medium mb-1">Trust Gate</div>
                <div className="text-lg font-bold" style={{ color: matchResult.deterministic.trustMet ? '#22c55e' : '#ef4444' }}>
                  {matchResult.deterministic.trustMet ? '✅ Pass' : '❌ Fail'}
                </div>
              </div>
            </div>
          )}

          {/* ── Editable Proposal ── */}
          {matchResult.status !== 'REJECTED_TRUST' && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-[var(--color-text-primary)]">
                📝 Your Proposal
                <span className="text-[10px] font-normal text-[var(--color-text-muted)] bg-[var(--color-surface)] px-2 py-0.5 rounded-full border border-[var(--color-border-light)]">
                  AI-Generated • Editable
                </span>
              </h4>
              <textarea
                className="form-textarea"
                rows={5}
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="Your proposal..."
                style={{ resize: 'vertical', minHeight: 120, lineHeight: 1.6 }}
                id="opportunity-proposal-textarea"
              />
              <div className="text-xs text-[var(--color-text-muted)] mt-1.5">Review and personalize before submitting.</div>
            </div>
          )}

          {/* ── NDA Toggle ("Professional Edge") ── */}
          {matchResult.status !== 'REJECTED_TRUST' && (
            <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-surface)]">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    🔐 Require NDA
                    <span className="text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">Professional Edge</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                    Ensures the poster signs a non-disclosure agreement before seeing your sensitive data, portfolio, or proprietary information.
                  </p>
                </div>
                {/* Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={requireNDA}
                  onClick={() => setRequireNDA(!requireNDA)}
                  className="relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                  style={{
                    width: 48, height: 26,
                    backgroundColor: requireNDA ? '#7c3aed' : 'var(--color-border)',
                    padding: 2,
                  }}
                  id="nda-toggle"
                >
                  <span
                    className="pointer-events-none inline-block rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out"
                    style={{
                      width: 22, height: 22,
                      transform: requireNDA ? 'translateX(22px)' : 'translateX(0)',
                    }}
                  />
                </button>
              </div>
              <AnimatePresence>
                {requireNDA && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-700 leading-relaxed">
                      ✅ NDA will be flagged on your interest submission. The opportunity poster must acknowledge the NDA requirement before viewing your full professional profile and attached documents.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STEP: Submitted
         ═══════════════════════════════════════════ */}
      {step === 'submitted' && (
        <div className="text-center py-12 px-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="text-6xl mb-5"
          >
            🤝
          </motion.div>
          <h3 className="text-xl font-bold mb-2 text-[var(--color-text-primary)]">Interest Submitted!</h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mx-auto">
            Your interest in <strong>{opportunity.title}</strong> has been submitted.
            Track status in "My Interests" tab.
          </p>
          {requireNDA && (
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-4 py-2 rounded-full">
              🔐 NDA Requirement Attached
            </div>
          )}
          {matchResult?.fitScore > 0 && (
            <div className="mt-4 text-sm">
              Fit Score: <strong style={{ color: getScoreColor(matchResult.fitScore) }}>{matchResult.fitScore}/100</strong>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
