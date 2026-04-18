import { ref, get, set, update, push } from 'firebase/database';
import { rtdb as db } from '../config/firebase';
import { logCoinTransaction } from './referralService';

// ========== REWARDS CATALOG ==========

/**
 * Default rewards catalog — stored in Firebase under config/rewards
 */
const DEFAULT_REWARDS = [
  // Tier 1: Quick Wins (100–300 coins)
  {
    id: 'rw_profile_highlight',
    name: 'Profile Highlight',
    description: 'Your profile appears with a ✨ glow in search results for 3 days',
    icon: '✨',
    type: 'digital',
    category: 'quick_win',
    nexaCoinsCost: 100,
    stock: -1,
    isActive: true,
    tier: 'bronze'
  },
  {
    id: 'rw_custom_theme',
    name: 'Premium Profile Theme',
    description: 'Unlock a gradient profile background for your page',
    icon: '🎨',
    type: 'digital',
    category: 'quick_win',
    nexaCoinsCost: 150,
    stock: -1,
    isActive: true,
    tier: 'bronze'
  },
  {
    id: 'rw_priority_post',
    name: 'Priority Feed Post',
    description: 'Your next post gets pinned to top of connections\' feeds for 24hrs',
    icon: '📌',
    type: 'digital',
    category: 'quick_win',
    nexaCoinsCost: 200,
    stock: -1,
    isActive: true,
    tier: 'bronze'
  },
  {
    id: 'rw_top_referrer_badge',
    name: 'Top Referrer Badge',
    description: 'Permanent badge on your profile showing your referral ranking',
    icon: '🏅',
    type: 'digital',
    category: 'quick_win',
    nexaCoinsCost: 250,
    stock: -1,
    isActive: true,
    tier: 'bronze'
  },
  {
    id: 'rw_resume_review',
    name: 'AI Resume Review',
    description: 'AI-powered resume analysis from Nexalink Assistant',
    icon: '📄',
    type: 'digital',
    category: 'quick_win',
    nexaCoinsCost: 300,
    stock: -1,
    isActive: true,
    tier: 'bronze'
  },
  // Tier 2: Premium Features (500–1500 coins)
  {
    id: 'rw_profile_viewers',
    name: 'Who Viewed My Profile',
    description: 'Unlock profile visitor analytics for 30 days',
    icon: '👁️',
    type: 'digital',
    category: 'premium',
    nexaCoinsCost: 500,
    stock: -1,
    isActive: true,
    tier: 'silver'
  },
  {
    id: 'rw_job_boost',
    name: 'Job Application Boost',
    description: 'Your applications get "Recommended" tag for recruiters',
    icon: '🚀',
    type: 'digital',
    category: 'premium',
    nexaCoinsCost: 600,
    stock: -1,
    isActive: true,
    tier: 'silver'
  },
  {
    id: 'rw_event_vip',
    name: 'Event VIP Access',
    description: 'Free entry to next Nexalink premium networking event',
    icon: '🎫',
    type: 'digital',
    category: 'premium',
    nexaCoinsCost: 800,
    stock: 50,
    isActive: true,
    tier: 'silver'
  },
  {
    id: 'rw_company_page',
    name: 'Company Page Creation',
    description: 'Unlock ability to create and manage a company page',
    icon: '🏢',
    type: 'digital',
    category: 'premium',
    nexaCoinsCost: 1000,
    stock: -1,
    isActive: true,
    tier: 'gold'
  },
  {
    id: 'rw_mentorship',
    name: 'Mentorship Session',
    description: '30-minute 1:1 session with a High Trust mentor',
    icon: '🎓',
    type: 'digital',
    category: 'premium',
    nexaCoinsCost: 1500,
    stock: 20,
    isActive: true,
    tier: 'gold'
  },
  // Tier 3: Physical & High-Value (2000–10000 coins)
  {
    id: 'rw_hoodie',
    name: 'Nexalink Premium Hoodie',
    description: 'Branded merchandise shipped to your address',
    icon: '🧥',
    type: 'physical',
    category: 'physical',
    nexaCoinsCost: 2000,
    stock: 30,
    isActive: true,
    tier: 'gold'
  },
  {
    id: 'rw_gift_card_500',
    name: 'Amazon Gift Card ₹500',
    description: 'Digital delivery to your email within 24 hours',
    icon: '🎁',
    type: 'digital',
    category: 'physical',
    nexaCoinsCost: 2500,
    stock: 100,
    isActive: true,
    tier: 'gold'
  },
  {
    id: 'rw_earbuds',
    name: 'Wireless Earbuds',
    description: 'Premium wireless earbuds shipped to your address',
    icon: '🎧',
    type: 'physical',
    category: 'physical',
    nexaCoinsCost: 3000,
    stock: 15,
    isActive: true,
    tier: 'platinum'
  },
  {
    id: 'rw_gift_card_2000',
    name: 'Amazon Gift Card ₹2000',
    description: 'Digital delivery to your email within 24 hours',
    icon: '💳',
    type: 'digital',
    category: 'physical',
    nexaCoinsCost: 8000,
    stock: 20,
    isActive: true,
    tier: 'platinum'
  },
  {
    id: 'rw_flagship_phone',
    name: 'Latest Flagship Phone',
    description: 'iPhone / Samsung Galaxy — Top 3 leaderboard only',
    icon: '📱',
    type: 'physical',
    category: 'mega',
    nexaCoinsCost: 10000,
    stock: 3,
    isActive: true,
    tier: 'diamond'
  }
];

// ========== INITIALIZE REWARDS ==========

export async function initializeRewardsCatalog() {
  const rewardsRef = ref(db, 'rewards');
  const snap = await get(rewardsRef);
  if (snap.exists()) return; // Already initialized

  const rewardsData = {};
  DEFAULT_REWARDS.forEach(r => {
    rewardsData[r.id] = { ...r, createdAt: Date.now() };
  });
  await set(rewardsRef, rewardsData);
}

// ========== GET REWARDS ==========

export async function getRewardsCatalog() {
  const snap = await get(ref(db, 'rewards'));
  if (!snap.exists()) {
    // Initialize if empty
    await initializeRewardsCatalog();
    return DEFAULT_REWARDS;
  }

  const rewards = snap.val();
  return Object.keys(rewards)
    .map(id => ({ id, ...rewards[id] }))
    .filter(r => r.isActive)
    .sort((a, b) => a.nexaCoinsCost - b.nexaCoinsCost);
}

export async function getReward(rewardId) {
  const snap = await get(ref(db, `rewards/${rewardId}`));
  return snap.exists() ? { id: rewardId, ...snap.val() } : null;
}

// ========== REDEEM REWARD ==========

export async function redeemReward(uid, rewardId) {
  // Get user data
  const userSnap = await get(ref(db, `users/${uid}`));
  if (!userSnap.exists()) throw new Error('User not found');
  const user = userSnap.val();

  // Get reward data
  const reward = await getReward(rewardId);
  if (!reward) throw new Error('Reward not found');
  if (!reward.isActive) throw new Error('Reward is no longer available');

  // Check stock
  if (reward.stock !== -1 && reward.stock <= 0) {
    throw new Error('Reward is out of stock');
  }

  // Check balance
  const balance = user.nexaCoins || 0;
  if (balance < reward.nexaCoinsCost) {
    throw new Error(`Not enough NexaCoins. You need ${reward.nexaCoinsCost} but have ${balance}`);
  }

  // Deduct coins
  const newBalance = balance - reward.nexaCoinsCost;
  await update(ref(db, `users/${uid}`), {
    nexaCoins: newBalance
  });

  // Decrement stock if limited
  if (reward.stock !== -1) {
    await update(ref(db, `rewards/${rewardId}`), {
      stock: reward.stock - 1
    });
  }

  // Create redemption record
  const redemptionRef = push(ref(db, 'redemptions'));
  const redemptionData = {
    userId: uid,
    rewardId: rewardId,
    rewardName: reward.name,
    rewardIcon: reward.icon,
    nexaCoinsSpent: reward.nexaCoinsCost,
    status: reward.nexaCoinsCost >= 2000 ? 'pending_review' : 'fulfilled',
    redeemedAt: Date.now(),
    fulfilledAt: reward.nexaCoinsCost < 2000 ? Date.now() : null,
  };
  await set(redemptionRef, redemptionData);

  // Log transaction
  await logCoinTransaction(uid, reward.nexaCoinsCost, 'spend', 'reward_redemption',
    `Redeemed: ${reward.name}`, newBalance);

  return {
    redemptionId: redemptionRef.key,
    newBalance,
    status: redemptionData.status
  };
}

// ========== REDEMPTION HISTORY ==========

export async function getUserRedemptions(uid) {
  const snap = await get(ref(db, 'redemptions'));
  if (!snap.exists()) return [];

  const redemptions = snap.val();
  const userRedemptions = [];
  for (const key of Object.keys(redemptions)) {
    if (redemptions[key].userId === uid) {
      userRedemptions.push({ id: key, ...redemptions[key] });
    }
  }
  return userRedemptions.sort((a, b) => (b.redeemedAt || 0) - (a.redeemedAt || 0));
}

// ========== MILESTONES ==========

const MILESTONES = [
  { threshold: 10, reward: '🥉 Bronze Badge + 200 NexaCoins', autoCoins: 200, badge: 'bronze' },
  { threshold: 25, reward: 'Profile Highlight (7 days) + 400 NexaCoins', autoCoins: 400, badge: null },
  { threshold: 50, reward: '🥈 Silver Badge + 800 NexaCoins', autoCoins: 800, badge: 'silver' },
  { threshold: 100, reward: '🎁 Amazon ₹500 Gift Card + Gold Badge', autoCoins: 1000, badge: 'gold' },
  { threshold: 250, reward: '🥇 Gold Badge + 2500 NexaCoins + Merch', autoCoins: 2500, badge: 'gold' },
  { threshold: 500, reward: '🎁🎁 Amazon ₹2000 Gift Card + Platinum Badge', autoCoins: 3000, badge: 'platinum' },
  { threshold: 1000, reward: '🏆 Mega Gift Eligible (Top 3 Leaderboard)', autoCoins: 5000, badge: 'diamond' },
];

export function getMilestones() {
  return MILESTONES;
}

export function getNextMilestone(verifiedReferrals) {
  for (const m of MILESTONES) {
    if (verifiedReferrals < m.threshold) {
      return {
        ...m,
        current: verifiedReferrals,
        progress: Math.min((verifiedReferrals / m.threshold) * 100, 100)
      };
    }
  }
  return {
    threshold: 1000,
    reward: '🏆 All milestones achieved!',
    current: verifiedReferrals,
    progress: 100,
    completed: true
  };
}

export function getAchievedMilestones(verifiedReferrals) {
  return MILESTONES.filter(m => verifiedReferrals >= m.threshold);
}

/**
 * Check and award milestone rewards
 */
export async function checkAndAwardMilestones(uid) {
  const userSnap = await get(ref(db, `users/${uid}`));
  if (!userSnap.exists()) return [];

  const user = userSnap.val();
  const verified = user.verifiedReferralCount || 0;
  const awardedMilestones = user.awardedMilestones || [];
  const newAwards = [];

  for (const milestone of MILESTONES) {
    const milestoneKey = `milestone_${milestone.threshold}`;
    if (verified >= milestone.threshold && !awardedMilestones.includes(milestoneKey)) {
      // Award coins
      const newBalance = (user.nexaCoins || 0) + milestone.autoCoins;
      await update(ref(db, `users/${uid}`), {
        nexaCoins: newBalance,
        awardedMilestones: [...awardedMilestones, milestoneKey]
      });

      await logCoinTransaction(uid, milestone.autoCoins, 'earn', 'milestone_reward',
        `Milestone reached: ${milestone.threshold} verified referrals`, newBalance);

      newAwards.push(milestone);
      awardedMilestones.push(milestoneKey);
    }
  }

  return newAwards;
}

// ========== WALLET ==========

export async function getWalletBalance(uid) {
  const userSnap = await get(ref(db, `users/${uid}`));
  if (!userSnap.exists()) return { base: 0, promo: 0, total: 0 };

  const user = userSnap.val();
  const base = user.nexaCoins || 0;
  const promo = user.promoCoins || 0;
  const promoExpiry = user.promoCoinsExpiry || null;

  // Check if promo coins expired
  if (promo > 0 && promoExpiry && Date.now() > promoExpiry) {
    await update(ref(db, `users/${uid}`), {
      promoCoins: 0,
      promoCoinsExpiry: null
    });
    return { base, promo: 0, total: base, promoExpired: true };
  }

  return {
    base,
    promo,
    total: base + promo,
    promoExpiry: promoExpiry ? new Date(promoExpiry).toLocaleDateString() : null
  };
}

// ========== PROMO OFFERS ==========

export async function purchasePromoOffer(uid, spendAmount) {
  // Example: Spend 60,000 → Get 120,000 (2X value), promo valid for 3 months
  const multiplier = 2;
  const promoValue = spendAmount * multiplier;
  const promoExpiry = Date.now() + (90 * 24 * 60 * 60 * 1000); // 3 months

  const userSnap = await get(ref(db, `users/${uid}`));
  if (!userSnap.exists()) throw new Error('User not found');

  const user = userSnap.val();
  const baseCoins = spendAmount; // base coins from purchase
  const promoCoins = promoValue - spendAmount; // bonus promo coins

  await update(ref(db, `users/${uid}`), {
    nexaCoins: (user.nexaCoins || 0) + baseCoins,
    promoCoins: (user.promoCoins || 0) + promoCoins,
    promoCoinsExpiry: promoExpiry
  });

  await logCoinTransaction(uid, baseCoins, 'earn', 'purchase',
    `Purchased NexaCoins package`, (user.nexaCoins || 0) + baseCoins);

  await logCoinTransaction(uid, promoCoins, 'earn', 'promo_bonus',
    `Promotional bonus (2X offer) — expires in 3 months`, (user.nexaCoins || 0) + baseCoins + promoCoins);

  return {
    baseCoins,
    promoCoins,
    totalValue: promoValue,
    expiresAt: new Date(promoExpiry).toLocaleDateString()
  };
}
