import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getRewardsCatalog, redeemReward, getUserRedemptions, getWalletBalance } from '../services/rewardService';
import { getCoinTransactions } from '../services/referralService';
import RewardCatalog from '../components/rewards/RewardCatalog';

export default function RewardsPage() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wallet, setWallet] = useState({ base: 0, promo: 0, total: 0 });
  const [activeTab, setActiveTab] = useState('catalog');
  const [loading, setLoading] = useState(true);
  const [redeemSuccess, setRedeemSuccess] = useState(null);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  async function loadData() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [rewardsCatalog, userRedemptions, userTxs, walletData] = await Promise.all([
        getRewardsCatalog(),
        getUserRedemptions(currentUser.uid),
        getCoinTransactions(currentUser.uid),
        getWalletBalance(currentUser.uid)
      ]);
      setRewards(rewardsCatalog);
      setRedemptions(userRedemptions);
      setTransactions(userTxs);
      setWallet(walletData);
    } catch (err) {
      console.error('Error loading rewards:', err);
    }
    setLoading(false);
  }

  async function handleRedeem(rewardId) {
    try {
      const result = await redeemReward(currentUser.uid, rewardId);
      setRedeemSuccess(result);
      await fetchUserProfile(currentUser.uid);
      await loadData();
      setTimeout(() => setRedeemSuccess(null), 4000);
    } catch (err) {
      alert(err.message);
    }
  }

  const formatDate = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="page-full">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ animation: 'pulse 1.5s infinite' }}>🎁</div>
          <h3 className="empty-state-title">Loading rewards...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="page-full">
      <div className="rewards-page">
        {/* Success Toast */}
        {redeemSuccess && (
          <div className="redeem-toast slide-up">
            🎉 Redeemed successfully! {redeemSuccess.status === 'pending_review' ? 'Pending admin review.' : 'Enjoy!'} Balance: 🪙 {redeemSuccess.newBalance}
          </div>
        )}

        {/* Wallet Hero */}
        <div className="wallet-hero slide-up">
          <div className="wallet-hero-left">
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🎁 Rewards Store</h1>
            <p className="text-muted" style={{ marginTop: 4, fontSize: 13 }}>Redeem your NexaCoins for amazing rewards</p>
          </div>
          <div className="wallet-hero-balance">
            <div className="wallet-balance-card">
              <div className="wallet-balance-label">Total Balance</div>
              <div className="wallet-balance-amount">🪙 {wallet.total.toLocaleString()}</div>
              {wallet.promo > 0 && (
                <div className="wallet-promo-info">
                  <span>Base: {wallet.base.toLocaleString()}</span>
                  <span className="wallet-promo-badge">Promo: {wallet.promo.toLocaleString()} (expires {wallet.promoExpiry})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rewards-tabs slide-up" style={{ animationDelay: '0.1s' }}>
          <button
            className={`rewards-tab ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            🛍️ Catalog
          </button>
          <button
            className={`rewards-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📦 Redemptions ({redemptions.length})
          </button>
          <button
            className={`rewards-tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            💰 Transactions
          </button>
        </div>

        {/* Tab Content */}
        <div className="slide-up" style={{ animationDelay: '0.15s' }}>
          {activeTab === 'catalog' && (
            <RewardCatalog
              rewards={rewards}
              onRedeem={handleRedeem}
              userBalance={wallet.total}
            />
          )}

          {activeTab === 'history' && (
            <div className="card">
              <div className="card-body" style={{ padding: redemptions.length ? 0 : undefined }}>
                {redemptions.length === 0 ? (
                  <div className="empty-state" style={{ padding: 32 }}>
                    <div className="empty-state-icon">📦</div>
                    <h3 className="empty-state-title">No redemptions yet</h3>
                    <p className="empty-state-text">Browse the catalog and redeem your first reward!</p>
                  </div>
                ) : (
                  <div className="redemption-list">
                    {redemptions.map(r => (
                      <div key={r.id} className="redemption-item">
                        <span className="redemption-icon">{r.rewardIcon || '🎁'}</span>
                        <div className="redemption-info">
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{r.rewardName}</div>
                          <div className="text-xs text-muted">{formatDate(r.redeemedAt)}</div>
                        </div>
                        <div className="redemption-cost">-{r.nexaCoinsSpent} 🪙</div>
                        <span className={`badge ${r.status === 'fulfilled' ? 'badge-success' : 'badge-warning'}`}>
                          {r.status === 'fulfilled' ? '✅ Delivered' : '⏳ Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="card">
              <div className="card-body" style={{ padding: transactions.length ? 0 : undefined }}>
                {transactions.length === 0 ? (
                  <div className="empty-state" style={{ padding: 32 }}>
                    <div className="empty-state-icon">💰</div>
                    <h3 className="empty-state-title">No transactions yet</h3>
                    <p className="empty-state-text">Start earning by referring friends!</p>
                  </div>
                ) : (
                  <div className="transaction-list">
                    {transactions.slice(0, 30).map(tx => (
                      <div key={tx.id} className="transaction-item">
                        <span className={`transaction-type ${tx.type}`}>
                          {tx.type === 'earn' ? '↗️' : '↘️'}
                        </span>
                        <div className="transaction-info">
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{tx.description}</div>
                          <div className="text-xs text-muted">{formatDate(tx.createdAt)}</div>
                        </div>
                        <div className={`transaction-amount ${tx.type}`}>
                          {tx.type === 'earn' ? '+' : '-'}{tx.amount} 🪙
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
