import { ref as rtdbRef, get as rtdbGet, query, orderByChild, equalTo } from "firebase/database";
import { rtdb } from "../config/firebase";

/**
 * Generate a Nexus ID from a name
 * Format: @firstname_lastname (lowercase, no special chars)
 */
export function generateNexusId(name) {
  if (!name) return '@user_' + Math.floor(1000 + Math.random() * 9000);
  
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')  // Remove special characters
    .replace(/\s+/g, '_')          // Replace spaces with underscore
    .replace(/_+/g, '_')           // Remove double underscores
    .replace(/^_|_$/g, '');        // Remove leading/trailing underscores
  
  return '@' + (cleaned || 'user') + '_' + Math.floor(1000 + Math.random() * 9000);
}

/**
 * Check if a Nexus ID is already taken
 * Searches both users and companies collections
 */
export async function isNexusIdTaken(nexusId) {
  if (!nexusId || !nexusId.startsWith('@')) return true;
  
  try {
    // Check in users collection
    const usersRef = rtdbRef(rtdb, 'users');
    const usersSnap = await rtdbGet(usersRef);
    
    if (usersSnap.exists()) {
      const users = usersSnap.val();
      for (const uid of Object.keys(users)) {
        if (users[uid].nexusId === nexusId) return true;
      }
    }

    // Check in companies collection
    const companiesRef = rtdbRef(rtdb, 'companies');
    const companiesSnap = await rtdbGet(companiesRef);
    
    if (companiesSnap.exists()) {
      const companies = companiesSnap.val();
      for (const uid of Object.keys(companies)) {
        if (companies[uid].nexusId === nexusId) return true;
      }
    }

    return false;
  } catch (err) {
    console.error('Nexus ID check error:', err);
    return false; // Allow on error to not block registration
  }
}

/**
 * Validate Nexus ID format
 * Rules: starts with @, 3-30 chars, lowercase alphanumeric + underscores only
 */
export function validateNexusId(nexusId) {
  if (!nexusId) return { valid: false, error: 'Nexus ID is required' };
  if (!nexusId.startsWith('@')) return { valid: false, error: 'Must start with @' };
  
  const id = nexusId.slice(1); // Remove @
  if (id.length < 3) return { valid: false, error: 'Must be at least 3 characters after @' };
  if (id.length > 30) return { valid: false, error: 'Must be 30 characters or less' };
  if (!/^[a-z0-9_]+$/.test(id)) return { valid: false, error: 'Only lowercase letters, numbers, and underscores' };
  if (/^_|_$/.test(id)) return { valid: false, error: 'Cannot start or end with underscore' };
  if (/__/.test(id)) return { valid: false, error: 'Cannot have consecutive underscores' };
  
  return { valid: true, error: null };
}

/**
 * Search users by name, nexusId, headline, or skills
 */
export async function searchUsers(queryText) {
  if (!queryText || queryText.trim().length < 2) return [];
  
  const searchTerm = queryText.toLowerCase().trim();
  const results = [];

  try {
    // Search users
    const usersSnap = await rtdbGet(rtdbRef(rtdb, 'users'));
    if (usersSnap.exists()) {
      const users = usersSnap.val();
      for (const uid of Object.keys(users)) {
        const user = users[uid];
        const matchScore = calculateSearchRelevance(user, searchTerm);
        if (matchScore > 0) {
          results.push({
            uid,
            name: user.name || 'Unknown',
            nexusId: user.nexusId || null,
            headline: user.headline || '',
            bio: user.bio || '',
            location: user.location || '',
            avatarUrl: user.avatarUrl || '',
            role: user.role || 'individual',
            industry: user.industry || '',
            skills: user.skills || [],
            trustScore: user.trustScore || 0,
            trustBadge: user.trustBadge || 'NEW',
            connectionsCount: user.connectionsCount || 0,
            livenessVerified: user.livenessVerified || false,
            identityVerified: user.identityVerified || false,
            emailVerified: user.emailVerified || false,
            matchScore,
          });
        }
      }
    }

    // Search companies
    const companiesSnap = await rtdbGet(rtdbRef(rtdb, 'companies'));
    if (companiesSnap.exists()) {
      const companies = companiesSnap.val();
      for (const uid of Object.keys(companies)) {
        const company = companies[uid];
        const matchScore = calculateSearchRelevance(company, searchTerm);
        if (matchScore > 0) {
          results.push({
            uid,
            name: company.name || 'Unknown',
            nexusId: company.nexusId || null,
            headline: company.industry || '',
            bio: company.description || '',
            location: company.location || '',
            avatarUrl: company.logoUrl || '',
            role: 'company',
            industry: company.industry || '',
            skills: [],
            trustScore: company.trustScore || 0,
            trustBadge: company.trustBadge || 'NEW',
            connectionsCount: 0,
            livenessVerified: false,
            identityVerified: company.verified || false,
            emailVerified: company.emailVerified || false,
            matchScore,
          });
        }
      }
    }

    // Sort: exact nexusId match first → trust score → connections → relevance
    results.sort((a, b) => {
      // Exact Nexus ID match gets priority
      const aExactNexus = a.nexusId?.toLowerCase() === searchTerm || a.nexusId?.toLowerCase() === '@' + searchTerm;
      const bExactNexus = b.nexusId?.toLowerCase() === searchTerm || b.nexusId?.toLowerCase() === '@' + searchTerm;
      if (aExactNexus && !bExactNexus) return -1;
      if (bExactNexus && !aExactNexus) return 1;

      // Then by verification status
      const aVerified = (a.identityVerified ? 2 : 0) + (a.livenessVerified ? 1 : 0);
      const bVerified = (b.identityVerified ? 2 : 0) + (b.livenessVerified ? 1 : 0);
      if (bVerified !== aVerified) return bVerified - aVerified;

      // Then by trust score
      if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;

      // Then by search relevance
      return b.matchScore - a.matchScore;
    });

    return results.slice(0, 50); // Cap at 50 results
  } catch (err) {
    console.error('Search error:', err);
    return [];
  }
}

/**
 * Calculate search relevance score for a user
 */
function calculateSearchRelevance(user, searchTerm) {
  let score = 0;

  // Exact Nexus ID match = highest score
  if (user.nexusId?.toLowerCase() === searchTerm || user.nexusId?.toLowerCase() === '@' + searchTerm) {
    score += 100;
  }
  // Partial Nexus ID match
  else if (user.nexusId?.toLowerCase().includes(searchTerm.replace('@', ''))) {
    score += 60;
  }

  // Name match
  const name = (user.name || '').toLowerCase();
  if (name === searchTerm) {
    score += 80;
  } else if (name.includes(searchTerm)) {
    score += 40;
  } else if (searchTerm.split(/\s+/).some(word => name.includes(word))) {
    score += 20;
  }

  // Headline match
  if ((user.headline || '').toLowerCase().includes(searchTerm)) {
    score += 15;
  }

  // Skills match
  if (user.skills && Array.isArray(user.skills)) {
    for (const skill of user.skills) {
      if (skill.toLowerCase().includes(searchTerm)) {
        score += 10;
        break;
      }
    }
  }

  // Industry match (companies)
  if ((user.industry || '').toLowerCase().includes(searchTerm)) {
    score += 10;
  }

  return score;
}
