import React from 'react';

export default function EventCard({ event, onRegister, onView, isRegistered = false }) {
  function formatDate(timestamp) {
    if (!timestamp) return 'TBD';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
    });
  }

  function getTypeIcon(type) {
    switch (type) {
      case 'hackathon': return '💻';
      case 'workshop': return '🛠️';
      case 'networking': return '🤝';
      case 'hiring_drive': return '🎯';
      default: return '📅';
    }
  }

  function getTypeBanner(type) {
    switch (type) {
      case 'hackathon': return 'linear-gradient(135deg, #7C3AED, #EC4899)';
      case 'workshop': return 'linear-gradient(135deg, #2563EB, #06B6D4)';
      case 'networking': return 'linear-gradient(135deg, #16A34A, #2563EB)';
      case 'hiring_drive': return 'linear-gradient(135deg, #F59E0B, #EF4444)';
      default: return 'linear-gradient(135deg, #2563EB, #7C3AED)';
    }
  }

  return (
    <div className="event-card" onClick={onView} id={`event-card-${event.eventId}`}>
      <div className="event-card-banner" style={{ background: getTypeBanner(event.type) }}>
        <span style={{ fontSize: '48px' }}>{getTypeIcon(event.type)}</span>
      </div>
      <div className="event-card-body">
        <span className="event-card-type">
          {getTypeIcon(event.type)} {(event.type || 'event').replace('_', ' ')}
        </span>
        <h3 className="event-card-title">{event.title}</h3>
        <div className="event-card-meta">
          <span>📅 {formatDate(event.date)}</span>
          <span>📍 {event.location || 'Online'}</span>
          <span>👥 {event.attendeesCount || 0}{event.maxAttendees ? ` / ${event.maxAttendees}` : ''} attendees</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <button
            className={`btn btn-sm ${isRegistered ? 'btn-secondary' : 'btn-primary'} btn-full`}
            onClick={(e) => { e.stopPropagation(); onRegister && onRegister(event); }}
            disabled={isRegistered}
            id={`register-btn-${event.eventId}`}
          >
            {isRegistered ? '✓ Registered' : 'Register Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
