import React from 'react';

export default function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div className="empty-state fade-in">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-text">{message}</p>}
      {action && action}
    </div>
  );
}
