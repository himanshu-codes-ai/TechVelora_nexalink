import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function RewardCatalog({ rewards = [], onRedeem, userBalance = 0 }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [redeeming, setRedeeming] = useState(null);

  const filters = [
    { key: 'all', label: '🟢 All', color: '#22c55e' },
    { key: 'quick_win', label: '⚡ Quick Wins', color: '#3b82f6' },
    { key: 'premium', label: '💎 Premium', color: '#a855f7' },
    { key: 'physical', label: '🎁 Physical', color: '#f59e0b' },
    { key: 'mega', label: '🏆 Mega', color: '#ef4444' },
  ];

  const filteredRewards = activeFilter === 'all'
    ? rewards
    : rewards.filter(r => r.category === activeFilter);

  const handleRedeem = async (reward) => {
    if (userBalance < reward.nexaCoinsCost) return;
    setRedeeming(reward.id);
    try {
      await onRedeem(reward.id);
    } catch { /* handled in parent */ }
    setRedeeming(null);
  };

  return (
    <div className="reward-catalog">
      {/* Filter Tabs */}
      <div className="reward-filters">
        {filters.map(f => (
          <button
            key={f.key}
            className={`reward-filter-btn ${activeFilter === f.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      <div className="reward-grid">
        {filteredRewards.map(reward => {
          const canAfford = userBalance >= reward.nexaCoinsCost;
          const outOfStock = reward.stock === 0;
          const isRedeeming = redeeming === reward.id;

          return (
            <div key={reward.id} className={`reward-card ${!canAfford ? 'locked' : ''} ${outOfStock ? 'sold-out' : ''}`}>
              <div className="reward-card-icon">{reward.icon}</div>
              <h4 className="reward-card-name">{reward.name}</h4>
              <p className="reward-card-desc">{reward.description}</p>
              <div className="reward-card-cost">
                <span className="reward-coin-icon">🪙</span>
                <span>{reward.nexaCoinsCost.toLocaleString()}</span>
              </div>
              {reward.stock > 0 && reward.stock < 20 && (
                <div className="reward-card-stock">Only {reward.stock} left</div>
              )}
              <button
                className={`btn btn-sm btn-full ${canAfford && !outOfStock ? 'btn-primary' : 'btn-disabled'}`}
                onClick={() => handleRedeem(reward)}
                disabled={!canAfford || outOfStock || isRedeeming}
              >
                {isRedeeming ? '⏳ Redeeming...' : outOfStock ? 'Sold Out' : canAfford ? 'Redeem ✓' : `Need ${(reward.nexaCoinsCost - userBalance).toLocaleString()} more`}
              </button>
            </div>
          );
        })}
      </div>

      {filteredRewards.length === 0 && (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-state-icon">🎁</div>
          <h3 className="empty-state-title">No rewards in this category</h3>
          <p className="empty-state-text">Check back soon for new rewards!</p>
        </div>
      )}
    </div>
  );
}
