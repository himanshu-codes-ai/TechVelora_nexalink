import React from 'react';
import { motion } from 'framer-motion';
import TrustBadge from '../shared/TrustBadge';

const TYPE_CONFIG = {
  FUNDING:       { icon: '🏦', label: 'Funding',       color: '#22c55e', bg: 'rgba(34, 197, 94, 0.08)' },
  ACQUISITION:   { icon: '🛒', label: 'Acquisition',   color: '#a855f7', bg: 'rgba(168, 85, 247, 0.08)' },
  PARTNERSHIP:   { icon: '🤝', label: 'Partnership',   color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)' },
  SERVICE:       { icon: '⚡', label: 'Service',       color: '#f97316', bg: 'rgba(249, 115, 22, 0.08)' },
  COLLABORATION: { icon: '🎯', label: 'Collaboration', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.08)' },
  GROWTH:        { icon: '📈', label: 'Growth',        color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)' },
};

const VERIFICATION_BADGES = {
  VERIFIED: { icon: '✅', label: 'AI Verified', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.08)' },
  CAUTION:  { icon: '⚠️', label: 'Review Needed', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
  FLAGGED:  { icon: '🚩', label: 'Flagged', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' },
};

export { TYPE_CONFIG, VERIFICATION_BADGES };

export default function OpportunityCard({ opportunity, onView }) {
  const typeConf = TYPE_CONFIG[opportunity.type] || TYPE_CONFIG.GROWTH;
  const verif = opportunity.verification ? VERIFICATION_BADGES[opportunity.verification.status] : null;

  return (
    <motion.div
      className="relative flex flex-col bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl overflow-hidden transition-all duration-200 group"
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.09)' }}
      transition={{ duration: 0.2 }}
      style={{ minHeight: 340 }}
    >
      {/* ── Top Accent Bar ── */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${typeConf.color}, ${typeConf.color}60)` }} />

      {/* ── Card Body ── */}
      <div className="flex flex-col gap-3 p-5 flex-1">
        {/* Type Badge Row + Verification + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: typeConf.bg, color: typeConf.color, border: `1px solid ${typeConf.color}25` }}
            >
              {typeConf.icon} {typeConf.label}
            </span>
            {verif && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: verif.bg, color: verif.color, border: `1px solid ${verif.color}25` }}
              >
                {verif.icon} {verif.label}
              </span>
            )}
          </div>
          {opportunity.status === 'closed' && (
            <span className="text-[11px] px-2 py-0.5 rounded-lg bg-red-50 text-red-500 font-semibold">Closed</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold leading-snug line-clamp-2 text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors duration-200">
          {opportunity.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 m-0">
          {opportunity.description}
        </p>

        {/* Poster Row */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${typeConf.color}80, ${typeConf.color})` }}
          >
            {opportunity.posterName?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{opportunity.posterName || 'Anonymous'}</span>
          {opportunity.posterTrustBadge && <TrustBadge badge={opportunity.posterTrustBadge} size="sm" />}
        </div>

        {/* Meta Chips */}
        <div className="flex flex-wrap gap-1.5">
          {opportunity.budget && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--color-surface)] text-[var(--color-text-secondary)] font-medium border border-[var(--color-border-light)]">
              💰 {opportunity.budget}
            </span>
          )}
          {opportunity.timeline && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--color-surface)] text-[var(--color-text-secondary)] font-medium border border-[var(--color-border-light)]">
              ⏱️ {opportunity.timeline}
            </span>
          )}
          {opportunity.location && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--color-surface)] text-[var(--color-text-secondary)] font-medium border border-[var(--color-border-light)]">
              📍 {opportunity.location}
            </span>
          )}
          {opportunity.verification?.verificationScore > 0 && (
            <span
              className="text-[11px] px-2.5 py-1 rounded-lg font-semibold"
              style={{
                background: opportunity.verification.verificationScore >= 70 ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)',
                color: opportunity.verification.verificationScore >= 70 ? '#16a34a' : '#d97706',
                border: `1px solid ${opportunity.verification.verificationScore >= 70 ? '#22c55e25' : '#f59e0b25'}`
              }}
            >
              🤖 {opportunity.verification.verificationScore}% Trust
            </span>
          )}
        </div>

        {/* Tags */}
        {opportunity.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {opportunity.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="badge badge-skill" style={{ fontSize: 10 }}>{tag}</span>
            ))}
            {opportunity.tags.length > 3 && (
              <span className="text-xs text-[var(--color-text-muted)]">+{opportunity.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Card Footer: Stats + CTA ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--color-border-light)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <span className="text-sm">👥</span> {opportunity.interestCount || 0}
          </span>
          <span>{opportunity.createdAt ? new Date(opportunity.createdAt).toLocaleDateString() : 'Recently'}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                     bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]
                     hover:shadow-md active:scale-[0.97] cursor-pointer"
          id={`view-propose-${opportunity.oppId}`}
        >
          View & Propose <span className="text-sm">→</span>
        </button>
      </div>
    </motion.div>
  );
}
