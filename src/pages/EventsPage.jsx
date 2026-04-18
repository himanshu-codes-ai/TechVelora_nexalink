import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import EventCard from '../components/events/EventCard';
import Modal from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';
import { getEvents, createEvent, registerForEvent } from '../services/realtimeService';

const DEMO_EVENTS = [
  {
    eventId: 'demo-event-1',
    organizerId: 'org1',
    organizerType: 'company',
    title: 'AI & Trust: Building Ethical Systems',
    description: 'Join industry leaders for a deep dive into building AI systems that prioritize trust and transparency.',
    type: 'workshop',
    location: 'San Francisco, CA',
    maxAttendees: 200,
    attendeesCount: 142,
    date: { toDate: () => new Date(Date.now() + 7 * 86400000) }
  },
  {
    eventId: 'demo-event-2',
    organizerId: 'org2',
    organizerType: 'company',
    title: 'TrustHack 2026 — Global Hackathon',
    description: 'Build the future of trust verification in this 48-hour global hackathon. $50K in prizes!',
    type: 'hackathon',
    location: 'Online',
    maxAttendees: 1000,
    attendeesCount: 567,
    date: { toDate: () => new Date(Date.now() + 14 * 86400000) }
  },
  {
    eventId: 'demo-event-3',
    organizerId: 'org3',
    organizerType: 'user',
    title: 'Bay Area Tech Networking Night',
    description: 'Connect with founders, engineers, and investors in the Bay Area. Free drinks and appetizers!',
    type: 'networking',
    location: 'Palo Alto, CA',
    maxAttendees: 100,
    attendeesCount: 78,
    date: { toDate: () => new Date(Date.now() + 3 * 86400000) }
  },
  {
    eventId: 'demo-event-4',
    organizerId: 'org1',
    organizerType: 'company',
    title: 'Senior Engineers Hiring Drive — Q2',
    description: 'Meet top companies looking for experienced engineers. On-the-spot interviews available.',
    type: 'hiring_drive',
    location: 'New York, NY',
    maxAttendees: 500,
    attendeesCount: 312,
    date: { toDate: () => new Date(Date.now() + 21 * 86400000) }
  },
];

export default function EventsPage() {
  const { currentUser, userProfile } = useAuth();
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registeredEvents, setRegisteredEvents] = useState(new Set());
  const [filter, setFilter] = useState('all');

  const [eventForm, setEventForm] = useState({
    title: '', description: '', type: 'workshop', location: '', maxAttendees: 100, date: ''
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      try {
        const data = await getEvents();
        if (data.length > 0) setEvents(data);
      } catch (err) {
        console.log('Using demo events data');
      }
      setLoading(false);
    }
    loadEvents();
  }, []);

  async function handleRegister(event) {
    if (!currentUser) return;
    try {
      await registerForEvent(event.eventId, currentUser.uid);
      setRegisteredEvents(prev => new Set([...prev, event.eventId]));
    } catch (err) {
      if (err.message.includes('demo')) {
        setRegisteredEvents(prev => new Set([...prev, event.eventId]));
      }
      console.error('Registration:', err.message);
    }
  }

  async function handleCreateEvent() {
    if (!eventForm.title || !eventForm.description) {
      setError('Title and description are required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await createEvent({
        ...eventForm,
        organizerId: currentUser.uid,
        organizerType: userProfile?.role === 'company' ? 'company' : 'user',
        date: new Date(eventForm.date)
      });
      setShowCreateEvent(false);
      setEventForm({ title: '', description: '', type: 'workshop', location: '', maxAttendees: 100, date: '' });
    } catch (err) {
      setError(err.message);
    }
    setCreating(false);
  }

  const filteredEvents = filter === 'all' ? events : events.filter(e => e.type === filter);

  return (
    <div className="page-full" style={{ maxWidth: 960, margin: '0 auto' }}>
      <motion.div
        className="flex justify-between items-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>🎯 Events</h1>
          <p className="text-sm text-secondary mt-2">Hackathons, workshops, networking events & more</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowCreateEvent(true)} id="create-event-btn">
          + Create Event
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex gap-2 mb-4 flex-wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {['all', 'hackathon', 'workshop', 'networking', 'hiring_drive'].map(type => (
          <button
            key={type}
            className={`btn btn-sm ${filter === type ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(type)}
          >
            {type === 'all' ? '📅 All' : type === 'hackathon' ? '💻 Hackathons' : type === 'workshop' ? '🛠️ Workshops' : type === 'networking' ? '🤝 Networking' : '🎯 Hiring Drives'}
          </button>
        ))}
      </motion.div>

      {/* Events Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filteredEvents.map((event, i) => (
          <motion.div
            key={event.eventId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <EventCard 
              event={event} 
              onRegister={handleRegister}
              isRegistered={registeredEvents.has(event.eventId)}
            />
          </motion.div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <EmptyState icon="🎯" title="No events found" message="Try a different filter or create a new event!" />
      )}

      {/* Create Event Modal */}
      <Modal
        isOpen={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        title="Create Event"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCreateEvent(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateEvent} disabled={creating} id="submit-event-btn">
              {creating ? '⏳ Creating...' : '🎯 Create Event'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Event Title *</label>
          <input className="form-input" placeholder="e.g. AI Innovation Workshop" value={eventForm.title} onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea className="form-textarea" placeholder="Describe your event..." value={eventForm.description} onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Event Type</label>
            <select className="form-select" value={eventForm.type} onChange={(e) => setEventForm(prev => ({ ...prev, type: e.target.value }))}>
              <option value="hackathon">Hackathon</option>
              <option value="workshop">Workshop</option>
              <option value="networking">Networking</option>
              <option value="hiring_drive">Hiring Drive</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" placeholder="e.g. Online" value={eventForm.location} onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={eventForm.date} onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Max Attendees</label>
            <input type="number" className="form-input" min="1" value={eventForm.maxAttendees} onChange={(e) => setEventForm(prev => ({ ...prev, maxAttendees: parseInt(e.target.value) || 100 }))} />
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
      </Modal>
    </div>
  );
}
