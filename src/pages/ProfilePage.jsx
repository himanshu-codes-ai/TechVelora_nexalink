import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, deleteProject, getUser, getConnectionStatus, sendConnectionRequest, acceptConnection } from '../services/realtimeService';
import { recalculateTrustScore } from '../services/trustService';
import Avatar from '../components/shared/Avatar';
import TrustBadge from '../components/shared/TrustBadge';
import TrustScoreWidget from '../components/trust/TrustScoreWidget';
import Modal from '../components/shared/Modal';
import UploadProjectModal from '../components/profile/UploadProjectModal';

export default function ProfilePage() {
  const { userId } = useParams();
  const { currentUser, userProfile: myProfile, updateUserProfile, isCompany, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState('about');
  const [saving, setSaving] = useState(false);
  const [eduInput, setEduInput] = useState({ school: '', degree: '', year: '' });
  const [projects, setProjects] = useState([]);
  const [uploadProjectOpen, setUploadProjectOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const targetId = userId || currentUser?.uid;
      const isSelf = !userId || userId === currentUser?.uid;
      setIsOwnProfile(isSelf);

      if (isSelf) {
        setProfile(myProfile);
        if (myProfile?.uid) {
          getProjects(myProfile.uid).then(setProjects).catch(console.error);
        }
      } else {
        try {
          const u = await getUser(targetId);
          setProfile(u);
          if (u) {
            getProjects(u.uid).then(setProjects).catch(console.error);
            const status = await getConnectionStatus(currentUser.uid, u.uid);
            setConnectionStatus(status);
          }
        } catch (err) {
          console.error('Error loading external profile:', err);
        }
      }
    }
    loadProfile();
  }, [userId, myProfile, currentUser]);

  if (!profile) {
    return <div className="page-full text-center p-5 text-muted">Loading profile...</div>;
  }

  const handleConnect = async () => {
    try {
      await sendConnectionRequest(currentUser.uid, profile.uid);
      setConnectionStatus('pending');
    } catch (err) {
      console.error('Connection request error:', err);
    }
  };

  const handleAccept = async () => {
    try {
      await acceptConnection(profile.uid, currentUser.uid);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Accept error:', err);
    }
  };

  async function handleDeleteProject(e, projectId) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Direct deletion as requested, no confirm prompt
    try {
      const success = await deleteProject(currentUser.uid, projectId);
      if (success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } else {
        alert('Could not reach the database to delete this project.');
      }
    } catch (err) {
      console.error('Direct delete error:', err);
    }
  }

  function openEdit() {
    setEditData({ ...profile, education: profile.education || [], skills: profile.skills || [] });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { uid, createdAt, updatedAt, ...data } = editData;
      await updateUserProfile(data);
      // Trigger trust score recalculation on profile update
      await recalculateTrustScore(currentUser.uid);
      // Fetch fresh profile from RTDB to show updated trust score immediately
      if (fetchUserProfile) await fetchUserProfile(currentUser.uid);
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
              src={profile.avatarUrl || profile.logoUrl}
              name={profile.name} 
              size="2xl" 
            />
          </div>
        </div>
        
        <div className="card-body" style={{ paddingTop: 64, paddingLeft: 32, paddingRight: 32, paddingBottom: 24 }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {profile.name}
                {profile.trustScore === 100 && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--color-primary)' }}>
                    <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM10.5 17L5.5 12L6.9 10.6L10.5 14.2L17.1 7.6L18.5 9L10.5 17Z" fill="currentColor"/>
                  </svg>
                )}
                {profile.trustScore < 100 && (
                   <TrustBadge badge={profile.trustBadge || 'NEW'} size="md" />
                )}
              </h1>
              {profile.nexusId && (
                <p style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 600, marginTop: 2, letterSpacing: '0.3px' }}>
                  {profile.nexusId}
                </p>
              )}
              <p style={{ fontSize: '16px', color: 'var(--color-text-primary)', marginTop: 4 }}>
                {profile.role === 'company' ? profile.industry : (profile.headline || 'Professional')}
              </p>
              
              <div className="text-sm text-secondary mt-2 flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
                {profile.location && (<span>📍 {profile.location}</span>)}
                {profile.role === 'company' && profile.website && (<span>🌐 <a href={profile.website} target="_blank" rel="noreferrer" className="text-primary">{profile.website.replace('https://', '')}</a></span>)}
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>• {profile.connectionsCount || 0} connections</span>
                {/* Identity Verification Badges */}
                {profile.livenessVerified && (
                  <span title="Face Liveness Verified" style={{ 
                    fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', fontWeight: 600 
                  }}>🟢 Liveness Verified</span>
                )}
                {profile.identityVerified && (
                  <span title="Government ID Verified" style={{ 
                    fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontWeight: 600 
                  }}>🛡️ ID Verified</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  {profile.trustScore < 100 && (
                    <button className="btn btn-outline-primary" onClick={() => navigate('/verify')} style={{ gap: 6 }}>
                      <span style={{ fontSize: 16 }}>🛡️</span> Get Verified
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={openEdit}>✏️ Edit</button>
                </>
              ) : (
                <>
                  {connectionStatus === 'connected' ? (
                    <button className="btn btn-secondary" disabled>✅ Connected</button>
                  ) : connectionStatus === 'pending' ? (
                    <button className="btn btn-secondary" disabled>⏳ Pending</button>
                  ) : connectionStatus === 'received' ? (
                    <button className="btn btn-primary" onClick={handleAccept}>Accept Request</button>
                  ) : (
                    <button className="btn btn-primary" onClick={handleConnect}>+ Connect</button>
                  )}
                </>
              )}
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
            {profile.bio || profile.description ? (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {profile.role === 'company' ? profile.description : profile.bio}
              </p>
            ) : (
              <div className="text-center p-4">
                <p className="text-sm text-muted mb-2">{isOwnProfile ? "You haven't written anything about yourself yet." : "No description provided."}</p>
                {isOwnProfile && <button className="btn btn-sm btn-outline-primary" onClick={openEdit}>Add summary</button>}
              </div>
            )}
          </motion.div>

          {/* Education Section */}
          {profile.role !== 'company' && (
            <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="flex justify-between items-center mb-12">
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Education</h3>
              </div>
              
              {profile.education && profile.education.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {profile.education.map((edu, i) => (
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
          {profile.role !== 'company' && (
            <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 12 }}>Skills</h3>
              {(profile.skills && profile.skills.length > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
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

          {/* AI Evaluated Projects Section */}
          {profile.role !== 'company' && (
            <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Verified Projects</h3>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>AI Scored & Audited Codebases</div>
                </div>
                {isOwnProfile && (
                  <button className="btn btn-sm btn-primary" onClick={() => setUploadProjectOpen(true)}>
                    + Upload Repo
                  </button>
                )}
              </div>

              {projects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {projects.map(proj => (
                    <div key={proj.id} style={{ padding: 16, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
                      <div className="flex justify-between items-start" style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <a href={proj.githubUrl} target="_blank" rel="noreferrer" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-primary)' }}>
                            {proj.title} 🔗
                          </a>
                          <span className={`badge ${proj.rating !== 'Error' && proj.rating !== 'Pending' ? 'badge-high-trust' : 'badge-new'}`} style={{ width: 'fit-content', marginTop: '4px' }}>
                            {proj.rating}
                          </span>
                        </div>
                        {isOwnProfile && (
                          <button 
                            className="btn btn-icon btn-sm" 
                            onClick={(e) => handleDeleteProject(e, proj.id)}
                            title="Delete Project"
                            style={{ 
                              color: 'var(--color-danger)', 
                              position: 'relative', 
                              zIndex: 10,
                              background: 'rgba(239, 68, 68, 0.1)'
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>AI Review: </strong>
                        {proj.aiReview}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-sm text-muted">Upload a project ZIP file to receive a recruiter-grade AI assessment natively added to your profile.</p>
                </div>
              )}
            </motion.div>
          )}

        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <motion.div className="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <TrustScoreWidget 
              score={profile.trustScore || 0} 
              badge={profile.trustBadge || 'NEW'} 
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

            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border-light)' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 12 }}>Professional Credibility</h4>

            <div className="form-group">
              <label className="form-label">
                Years of Experience
                <span style={{ fontSize: 11, color: 'var(--color-primary)', marginLeft: 6 }}>Verified Professionals Only</span>
              </label>
              <select className="form-select" value={editData.experienceYears || 0} onChange={(e) => setEditData(prev => ({ ...prev, experienceYears: parseInt(e.target.value) || 0 }))}>
                <option value="0">Select experience</option>
                <option value="1">1 year</option>
                <option value="2">2 years</option>
                <option value="3">3 years</option>
                <option value="5">5+ years</option>
                <option value="7">7+ years</option>
                <option value="10">10+ years</option>
                <option value="15">15+ years</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">
                  LinkedIn URL
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>+10 Trust</span>
                </label>
                <input className="form-input" placeholder="linkedin.com/in/yourname" value={editData.linkedInUrl || ''} onChange={(e) => setEditData(prev => ({ ...prev, linkedInUrl: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Corporate Email
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>+20 Trust</span>
                </label>
                <input type="email" className="form-input" placeholder="you@company.com" value={editData.corporateEmail || ''} onChange={(e) => setEditData(prev => ({ ...prev, corporateEmail: e.target.value }))} />
              </div>
            </div>
          </>
        )}
      </Modal>

      <UploadProjectModal 
        isOpen={uploadProjectOpen} 
        onClose={() => setUploadProjectOpen(false)} 
        onProjectUploaded={() => {
          getProjects(userProfile.uid).then(setProjects).catch(console.error);
        }} 
      />
    </div>
  );
}
