import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/shared/Avatar';
import TrustBadge from '../components/shared/TrustBadge';
import TrustScoreWidget from '../components/trust/TrustScoreWidget';
import Modal from '../components/shared/Modal';

export default function ProfilePage() {
  const { userProfile, updateUserProfile, isCompany } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState('about');
  const [saving, setSaving] = useState(false);
  const [eduInput, setEduInput] = useState({ school: '', degree: '', year: '' });

  if (!userProfile) {
    return <div className="page-full text-center p-5 text-muted">Loading profile...</div>;
  }

  function openEdit() {
    setEditData({ ...userProfile, education: userProfile.education || [], skills: userProfile.skills || [] });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { uid, createdAt, updatedAt, ...data } = editData;
      await updateUserProfile(data);
      setEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
    }
    setSaving(false);
  }

  function handleSkillInput(e) {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const skill = e.target.value.trim();
      setEditData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill]
      }));
      e.target.value = '';
    }
  }

  function removeSkill(index) {
    setEditData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  }

  function handleAddEdu() {
    if (!eduInput.school || !eduInput.degree) return;
    setEditData(prev => ({
      ...prev,
      education: [...(prev.education || []), { ...eduInput }]
    }));
    setEduInput({ school: '', degree: '', year: '' });
  }

  function removeEdu(index) {
    setEditData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  }

  return (
    <div className="page-full" style={{ maxWidth: 940, margin: '0 auto' }}>
      {/* Profile Header Block */}
      <motion.div
        className="card mb-4"
        style={{ overflow: 'hidden' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ height: 200, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: -50, left: 32, borderRadius: '50%', border: '4px solid var(--color-surface)', background: 'var(--color-surface)' }}>
            <Avatar 
              src={isCompany ? userProfile.logoUrl : userProfile.avatarUrl}
              name={userProfile.name} 
              size="2xl" 
            />
          </div>
        </div>
        
        <div className="card-body" style={{ paddingTop: 64, paddingLeft: 32, paddingRight: 32, paddingBottom: 24 }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {userProfile.name}
                <TrustBadge badge={userProfile.trustBadge || 'NEW'} size="md" />
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--color-text-primary)', marginTop: 4 }}>
                {isCompany ? userProfile.industry : (userProfile.headline || 'Professional')}
              </p>
              
              <div className="text-sm text-secondary mt-2 flex items-center gap-4">
                {userProfile.location && (<span>📍 {userProfile.location}</span>)}
                {isCompany && userProfile.website && (<span>🌐 <a href={userProfile.website} target="_blank" rel="noreferrer" className="text-primary">{userProfile.website.replace('https://', '')}</a></span>)}
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>• {userProfile.connectionsCount || 0} connections</span>
              </div>
            </div>

            <div className="flex gap-2">
              {userProfile.trustBadge !== 'HIGH_TRUST' && (
                <button className="btn btn-outline-primary" onClick={() => navigate('/verify')} style={{ gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🛡️</span> Get Verified
                </button>
              )}
              <button className="btn btn-secondary" onClick={openEdit}>✏️ Edit</button>
            </div>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24 }}>
        {/* Main Content Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* About Section */}
          <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 12 }}>About</h3>
            {userProfile.bio || userProfile.description ? (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {isCompany ? userProfile.description : userProfile.bio}
              </p>
            ) : (
              <div className="text-center p-4">
                <p className="text-sm text-muted mb-2">You haven't written anything about yourself yet.</p>
                <button className="btn btn-sm btn-outline-primary" onClick={openEdit}>Add summary</button>
              </div>
            )}
          </motion.div>

          {/* Education Section */}
          {!isCompany && (
            <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="flex justify-between items-center mb-12">
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Education</h3>
              </div>
              
              {userProfile.education && userProfile.education.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {userProfile.education.map((edu, i) => (
                    <div key={i} className="flex gap-3 pt-3" style={{ borderTop: i > 0 ? '1px solid var(--color-border-light)' : 'none' }}>
                      <div style={{ padding: '8px', background: 'var(--color-bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🎓
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{edu.school}</div>
                        <div className="text-sm text-secondary">{edu.degree}</div>
                        {edu.year && <div className="text-xs text-muted mt-1">{edu.year}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-sm text-muted">No education details added.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Skills Section */}
          {!isCompany && (
            <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 12 }}>Skills</h3>
              {(userProfile.skills && userProfile.skills.length > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {userProfile.skills.map((skill, i) => (
                    <span key={i} className="badge badge-skill" style={{ padding: '8px 14px', fontSize: '13px' }}>{skill}</span>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-sm text-muted">Showcase your top skills to stand out.</p>
                </div>
              )}
            </motion.div>
          )}

        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <motion.div className="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <TrustScoreWidget 
              score={userProfile.trustScore || 0} 
              badge={userProfile.trustBadge || 'NEW'} 
            />
          </motion.div>

          <motion.div className="card card-body" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 16 }}>Your Dashboard</h4>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-3 border-b border-light">
                <span className="text-sm text-secondary">Profile viewers</span>
                <span className="font-semibold text-primary">{Math.floor(Math.random() * 50) + 12}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-light">
                <span className="text-sm text-secondary">Post impressions</span>
                <span className="font-semibold text-primary">{Math.floor(Math.random() * 500) + 120}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Search appearances</span>
                <span className="font-semibold text-primary">{Math.floor(Math.random() * 30) + 5}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editing}
        onClose={() => setEditing(false)}
        title="Edit Profile"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" value={editData.name || ''} onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))} />
        </div>
        
        {!isCompany && (
          <div className="form-group">
            <label className="form-label">Headline</label>
            <input className="form-input" placeholder="e.g. Senior Software Engineer at Google" value={editData.headline || ''} onChange={(e) => setEditData(prev => ({ ...prev, headline: e.target.value }))} />
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">{isCompany ? 'Company Description' : 'Summary / Bio'}</label>
          <textarea className="form-textarea" placeholder="Tell us about yourself..." value={isCompany ? (editData.description || '') : (editData.bio || '')} onChange={(e) => setEditData(prev => ({ ...prev, [isCompany ? 'description' : 'bio']: e.target.value }))} style={{ minHeight: 100 }} />
        </div>
        
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" placeholder="e.g. San Francisco, CA" value={editData.location || ''} onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))} />
        </div>

        {!isCompany && (
          <>
            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border-light)' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 12 }}>Education</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 8, marginBottom: 12 }}>
              <input className="form-input input-sm" placeholder="School/University" value={eduInput.school} onChange={e => setEduInput(p => ({...p, school: e.target.value}))} />
              <input className="form-input input-sm" placeholder="Degree/Major" value={eduInput.degree} onChange={e => setEduInput(p => ({...p, degree: e.target.value}))} />
              <input className="form-input input-sm" placeholder="Year" value={eduInput.year} onChange={e => setEduInput(p => ({...p, year: e.target.value}))} />
            </div>
            <button className="btn btn-sm btn-outline-primary mb-4 w-full" onClick={handleAddEdu}>+ Add Education</button>
            
            {(editData.education || []).map((edu, i) => (
              <div key={i} className="flex justify-between items-center text-sm p-2 mb-2 bg-surface rounded border border-light">
                <div><strong>{edu.school}</strong> — {edu.degree} <span className="text-muted">({edu.year})</span></div>
                <button className="text-danger p-1" onClick={() => removeEdu(i)}>✕</button>
              </div>
            ))}

            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border-light)' }} />
            <div className="form-group">
              <label className="form-label">Skills (Press Enter to add)</label>
              <input className="form-input" placeholder="e.g. React, Python, Product Management..." onKeyDown={handleSkillInput} />
              <div className="flex flex-wrap gap-2 mt-2">
                {(editData.skills || []).map((skill, i) => (
                  <span key={i} className="badge badge-skill flex items-center gap-1">
                    {skill} 
                    <span style={{ cursor: 'pointer', fontSize: 10, padding: 2 }} onClick={() => removeSkill(i)}>✕</span>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
