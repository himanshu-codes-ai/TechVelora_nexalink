import React from 'react';
import { getTrustBadgeColor, getTrustBadgeLabel } from '../../services/trustEngine';

export default function TrustBadge({ badge, size = 'sm' }) {
  const colorClass = getTrustBadgeColor(badge);
  const label = getTrustBadgeLabel(badge);
  
  return (
    <span className={`badge ${colorClass}`} style={size === 'lg' ? { fontSize: '13px', padding: '3px 10px' } : {}}>
      {label}
    </span>
  );
}
