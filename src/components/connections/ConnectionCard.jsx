import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../shared/Avatar';
import TrustBadge from '../shared/TrustBadge';

export default function ConnectionCard({ user, onConnect, onAccept, onReject, connectionStatus, isPending = false }) {
  return (
    <div className="connection-card" id={`connection-${user.uid}`}>
      <Avatar src={user.avatarUrl} name={user.name} size="md" />
      <div className="connection-info">
        <Link to={`/profile/${user.uid}`} className="connection-name" style={{ textDecoration: 'none' }}>
          {user.name}
          {user.trustBadge && <TrustBadge badge={user.trustBadge} />}
        </Link>
        <div className="connection-headline">{user.headline || user.role || 'Professional'}</div>
      </div>
      <div className="flex gap-2">
        {isPending ? (
          <>
            <button 
              className="btn btn-sm btn-primary" 
              onClick={() => onAccept && onAccept(user)}
            >
              Accept
            </button>
            <button 
              className="btn btn-sm btn-ghost" 
              onClick={() => onReject && onReject(user)}
            >
              Ignore
            </button>
          </>
        ) : connectionStatus === 'accepted' ? (
          <span className="badge badge-trusted">Connected</span>
        ) : connectionStatus === 'pending' ? (
          <span className="badge badge-new">Pending</span>
        ) : (
          <button 
            className="btn btn-sm btn-outline-primary" 
            onClick={() => onConnect && onConnect(user)}
          >
            + Connect
          </button>
        )}
      </div>
    </div>
  );
}
