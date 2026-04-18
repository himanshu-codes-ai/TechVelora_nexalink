/**
 * Nexalink Trust Scoring Engine
 * Calculates trust score (0-100) based on weighted signals
 */

const WEIGHTS = {
  profileCompleteness: 20,
  emailVerified: 15,
  experienceYears: 10,
  connectionsCount: 15,
  postsCount: 10,
  postEngagement: 15,
  accountAge: 10,
  consistency: 5
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function calculateProfileCompleteness(profile) {
  const fields = ['name', 'bio', 'headline', 'avatarUrl', 'location'];
  const skillsScore = (profile.skills && profile.skills.length > 0) ? 1 : 0;
  const filledCount = fields.filter(f => profile[f] && profile[f].trim().length > 0).length;
  return ((filledCount + skillsScore) / (fields.length + 1)) * WEIGHTS.profileCompleteness;
}

function calculateEmailVerified(profile) {
  return profile.emailVerified ? WEIGHTS.emailVerified : 0;
}

function calculateExperienceScore(profile) {
  const years = profile.experienceYears || 0;
  const normalized = clamp(years / 10, 0, 1);
  return normalized * WEIGHTS.experienceYears;
}

function calculateConnectionsScore(profile) {
  const count = profile.connectionsCount || 0;
  // Logarithmic scale, cap at 500
  const normalized = count > 0 ? clamp(Math.log10(count) / Math.log10(500), 0, 1) : 0;
  return normalized * WEIGHTS.connectionsCount;
}

function calculatePostsScore(profile) {
  const count = profile.postsCount || 0;
  const normalized = clamp(count / 50, 0, 1);
  return normalized * WEIGHTS.postsCount;
}

function calculateEngagementScore(avgLikes, avgComments) {
  const engagement = (avgLikes || 0) * 1 + (avgComments || 0) * 3;
  const normalized = clamp(engagement / 100, 0, 1);
  return normalized * WEIGHTS.postEngagement;
}

function calculateAccountAge(createdAt) {
  if (!createdAt) return 0;
  const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
  const normalized = clamp(daysSinceCreation / 365, 0, 1);
  return normalized * WEIGHTS.accountAge;
}

function calculateConsistency(profile) {
  // Simple heuristic: if user has posts and connections, they're somewhat consistent
  const hasPosts = (profile.postsCount || 0) > 0;
  const hasConnections = (profile.connectionsCount || 0) > 0;
  const hasSkills = profile.skills && profile.skills.length > 0;
  
  const signals = [hasPosts, hasConnections, hasSkills].filter(Boolean).length;
  return (signals / 3) * WEIGHTS.consistency;
}

export function calculateTrustScore(profile, engagementData = {}) {
  const scores = {
    profileCompleteness: calculateProfileCompleteness(profile),
    emailVerified: calculateEmailVerified(profile),
    experienceYears: calculateExperienceScore(profile),
    connectionsCount: calculateConnectionsScore(profile),
    postsCount: calculatePostsScore(profile),
    postEngagement: calculateEngagementScore(engagementData.avgLikes, engagementData.avgComments),
    accountAge: calculateAccountAge(profile.createdAt),
    consistency: calculateConsistency(profile)
  };

  const totalScore = Math.round(
    Object.values(scores).reduce((sum, s) => sum + s, 0)
  );

  const trustScore = clamp(totalScore, 0, 100);
  let trustBadge = 'NEW';
  if (trustScore >= 80) trustBadge = 'HIGH_TRUST';
  else if (trustScore >= 60) trustBadge = 'TRUSTED';
  else if (trustScore >= 40) trustBadge = 'VERIFIED';

  return {
    trustScore,
    trustBadge,
    breakdown: scores,
    weights: WEIGHTS
  };
}

export function calculateCompanyTrustScore(company) {
  let score = 0;
  
  // Company name & description
  if (company.name) score += 10;
  if (company.description && company.description.length > 50) score += 10;
  if (company.logoUrl) score += 5;
  if (company.website) score += 10;
  if (company.industry) score += 5;
  
  // Verification
  if (company.verified) score += 20;
  
  // Activity
  const jobs = company.jobsCount || 0;
  score += clamp(jobs * 3, 0, 15);
  
  const posts = company.postsCount || 0;
  score += clamp(posts * 2, 0, 10);
  
  const employees = company.employeeCount || 0;
  score += clamp(Math.log10(Math.max(employees, 1)) / Math.log10(100) * 15, 0, 15);

  const trustScore = clamp(Math.round(score), 0, 100);
  let trustBadge = 'NEW';
  if (trustScore >= 80) trustBadge = 'HIGH_TRUST';
  else if (trustScore >= 60) trustBadge = 'TRUSTED';
  else if (trustScore >= 40) trustBadge = 'VERIFIED';

  return { trustScore, trustBadge };
}

export function getTrustBadgeColor(badge) {
  switch (badge) {
    case 'HIGH_TRUST': return 'badge-high-trust';
    case 'TRUSTED': return 'badge-trusted';
    case 'VERIFIED': return 'badge-verified';
    default: return 'badge-new';
  }
}

export function getTrustBadgeLabel(badge) {
  switch (badge) {
    case 'HIGH_TRUST': return '⭐ High Trust';
    case 'TRUSTED': return '✓ Trusted';
    case 'VERIFIED': return '● Verified';
    default: return '○ New';
  }
}
