import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function WalletWidget() {
  const { userProfile } = useAuth();
  
  if (!userProfile) return null;
  
  const coins = userProfile.nexaCoins || 0;

  return (
    <Link to="/rewards" className="wallet-widget" title="My NexaCoins — Click to view rewards">
      <span className="wallet-icon">🪙</span>
      <span className="wallet-amount">{coins.toLocaleString()}</span>
    </Link>
  );
}
