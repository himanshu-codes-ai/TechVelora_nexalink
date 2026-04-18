import { ref, get, set, update, push, query as rtdbQuery, orderByChild, limitToLast, equalTo } from 'firebase/database';
import { rtdb as db } from '../config/firebase';

// ========== REFERRAL CODE GENERATION ==========

/**
 * Generates a unique referral code like NXL-RUSHI-7K2M
 */
export function generateReferralCode(name) {
  const sanitized = (name || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NXL-${sanitized}-${rand}`;
}

/**
 * Assigns a referral code to a user if they don't have one
 */
export async function assignReferralCode(uid, name) {
  const userRef = ref(db, `users/${uid}`);
  const snap = await get(userRef);
  if (snap.exists() && snap.val().referralCode) {
    return snap.val().referralCode;
  }

  let code = generateReferralCode(name);
  // Ensure uniqueness
  let attempts = 0;
  while (attempts < 5) {
    const existing = await findUserByReferralCode(code);
    if (!existing) break;
    code = generateReferralCode(name);
    attempts++;
  }

  await update(userRef, {
    referralCode: code,
    referralCount: 0,
    verifiedReferralCount: 0,
    referralTier: 'none',
    nexaCoins: 0,
    rewardsEarned: [],
    referralCreatedAt: Date.now()
  });

  return code;
}

// ========== REFERRAL LOOKUP ==========

export async function findUserByReferralCode(code) {
  const usersRef = ref(db, 'users');
  const snap = await get(usersRef);
  if (!snap.exists()) return null;

  const users = snap.val();
  for (const uid of Object.keys(users)) {
    if (users[uid].referralCode === code) {
      return { uid, ...users[uid] };
    }
  }
  return null;
}

export async function getUserReferralData(uid) {
  const userSnap = await get(ref(db, `users/${uid}`));
  if (!userSnap.exists()) return null;

  const user = userSnap.val();
  return {
    referralCode: user.referralCode || null,
    referralCount: user.referralCount || 0,
    verifiedReferralCount: user.verifiedReferralCount || 0,
    referralTier: user.referralTier || 'none',
    nexaCoins: user.nexaCoins || 0,
    referredBy: user.referredBy || null,
    referredByCode: user.referredByCode || null,
  };
}

// ========== REFERRAL ATTRIBUTION ==========

/**
 * Records a referral when a new user signs up with a referral code
 */
export async function recordReferral(referralCode, newUserId, newUserEmail) {
  // Find the referrer
  const referrer = await findUserByReferralCode(referralCode);
  if (!referrer) throw new Error('Invalid referral code');

  // Cannot self-refer
  if (referrer.uid === newUserId) throw new Error('Cannot use your own referral code');

  // Check for duplicate
  const existingRef = ref(db, `referrals`);
  const existingSnap = await get(existingRef);
  if (existingSnap.exists()) {
    const referrals = existingSnap.val();
    for (const key of Object.keys(referrals)) {
      if (referrals[key].referredUserId === newUserId) {
        throw new Error('User already referred');
      }
    }
  }

  // Disposable email check
  const disposableDomains = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email', 'yopmail.com'];
  const emailDomain = (newUserEmail || '').split('@')[1]?.toLowerCase();
  const isDisposable = disposableDomains.includes(emailDomain);

  // Create referral record
  const referralRef = push(ref(db, 'referrals'));
  const referralData = {
    referrerId: referrer.uid,
    referredUserId: newUserId,
    referralCode,
    status: 'pending',
    signupAt: Date.now(),
    verifiedAt: null,
    fraudScore: isDisposable ? 0.8 : 0.0,
    flagged: isDisposable
  };

  await set(referralRef, referralData);

  // Update the referred user's profile
  await update(ref(db, `users/${newUserId}`), {
    referredBy: referrer.uid,
    referredByCode: referralCode
  });

  // Increment referrer's count
  const currentCount = referrer.referralCount || 0;
  await update(ref(db, `users/${referrer.uid}`), {
    referralCount: currentCount + 1
  });

  return referralRef.key;
}

/**
 * Verifies a referral (when the referred user completes profile)
 */
export async function verifyReferral(referredUserId) {
  const referralsSnap = await get(ref(db, 'referrals'));
  if (!referralsSnap.exists()) return null;

  const referrals = referralsSnap.val();
  let referralKey = null;
  let referralData = null;

  for (const key of Object.keys(referrals)) {
    if (referrals[key].referredUserId === referredUserId && referrals[key].status === 'pending') {
      referralKey = key;
      referralData = referrals[key];
      break;
    }
  }

  if (!referralKey) return null;

  // Update referral status
  await update(ref(db, `referrals/${referralKey}`), {
    status: 'verified',
    verifiedAt: Date.now()
  });

  // Increment verified count and award coins
  const referrerSnap = await get(ref(db, `users/${referralData.referrerId}`));
  if (referrerSnap.exists()) {
    const referrer = referrerSnap.val();
    const newVerified = (referrer.verifiedReferralCount || 0) + 1;
    const newCoins = (referrer.nexaCoins || 0) + 50;
    const newTier = calculateTier(newVerified);

    await update(ref(db, `users/${referralData.referrerId}`), {
      verifiedReferralCount: newVerified,
      nexaCoins: newCoins,
      referralTier: newTier
    });

    // Log coin transaction
    await logCoinTransaction(referralData.referrerId, 50, 'earn', 'referral_verified',
      `Verified referral: new user joined`, newCoins);

    // Update leaderboard
    await updateLeaderboard(referralData.referrerId, referrer.name, referrer.avatarUrl, newVerified, newTier);

    return { referralKey, newVerified, coinsAwarded: 50, tier: newTier };
  }

  return { referralKey, newVerified: 0, coinsAwarded: 0, tier: 'none' };
}

// ========== REFERRALS LIST ==========

export async function getUserReferrals(uid) {
  const referralsSnap = await get(ref(db, 'referrals'));
  if (!referralsSnap.exists()) return [];

  const referrals = referralsSnap.val();
  const userReferrals = [];

  for (const key of Object.keys(referrals)) {
    if (referrals[key].referrerId === uid) {
      // Get referred user name
      const userSnap = await get(ref(db, `users/${referrals[key].referredUserId}`));
      const userName = userSnap.exists() ? userSnap.val().name : 'Unknown User';
      const userAvatar = userSnap.exists() ? userSnap.val().avatarUrl : '';

      userReferrals.push({
        id: key,
        ...referrals[key],
        referredUserName: userName,
        referredUserAvatar: userAvatar,
      });
    }
  }

  return userReferrals.sort((a, b) => (b.signupAt || 0) - (a.signupAt || 0));
}

// ========== LEADERBOARD ==========

export async function updateLeaderboard(uid, name, avatarUrl, verifiedReferrals, tier) {
  await update(ref(db, `leaderboard/referrals/entries/${uid}`), {
    name: name || 'User',
    avatarUrl: avatarUrl || '',
    verifiedReferrals,
    tier,
    updatedAt: Date.now()
  });

  await update(ref(db, 'leaderboard/referrals'), {
    lastUpdated: Date.now()
  });
}

export async function getLeaderboard(topN = 20) {
  const snap = await get(ref(db, 'leaderboard/referrals/entries'));
  if (!snap.exists()) return [];

  const entries = snap.val();
  const leaderboard = Object.keys(entries).map(uid => ({
    uid,
    ...entries[uid]
  }));

  // Sort by verified referrals descending
  leaderboard.sort((a, b) => (b.verifiedReferrals || 0) - (a.verifiedReferrals || 0));

  // Assign ranks
  return leaderboard.slice(0, topN).map((entry, idx) => ({
    ...entry,
    rank: idx + 1
  }));
}

// ========== COIN TRANSACTIONS ==========

export async function logCoinTransaction(uid, amount, type, source, description, balanceAfter) {
  const txRef = push(ref(db, 'coin_transactions'));
  await set(txRef, {
    userId: uid,
    amount,
    type, // 'earn' | 'spend'
    source,
    description,
    balanceAfter,
    createdAt: Date.now()
  });
  return txRef.key;
}

export async function getCoinTransactions(uid) {
  const snap = await get(ref(db, 'coin_transactions'));
  if (!snap.exists()) return [];

  const txs = snap.val();
  const userTxs = [];
  for (const key of Object.keys(txs)) {
    if (txs[key].userId === uid) {
      userTxs.push({ id: key, ...txs[key] });
    }
  }
  return userTxs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// ========== TIER CALCULATION ==========

export function calculateTier(verifiedReferrals) {
  if (verifiedReferrals >= 1000) return 'diamond';
  if (verifiedReferrals >= 500) return 'platinum';
  if (verifiedReferrals >= 250) return 'gold';
  if (verifiedReferrals >= 50) return 'silver';
  if (verifiedReferrals >= 10) return 'bronze';
  return 'none';
}

export function getTierLabel(tier) {
  const labels = {
    diamond: '💎 Diamond',
    platinum: '🏆 Platinum',
    gold: '🥇 Gold',
    silver: '🥈 Silver',
    bronze: '🥉 Bronze',
    none: '🔰 Starter'
  };
  return labels[tier] || labels.none;
}

export function getTierColor(tier) {
  const colors = {
    diamond: '#b9f2ff',
    platinum: '#e5e4e2',
    gold: '#ffd700',
    silver: '#c0c0c0',
    bronze: '#cd7f32',
    none: '#94a3b8'
  };
  return colors[tier] || colors.none;
}

// ========== SHARE LINK ==========

export function buildReferralLink(code) {
  const base = window.location.origin;
  return `${base}/register?ref=${encodeURIComponent(code)}`;
}

export function buildShareText(code, name) {
  return `Join me on Nexalink — the trusted professional network! Use my referral code: ${code}\n${buildReferralLink(code)}`;
}
