import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Avatar from '../shared/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { createPost } from '../../services/realtimeService';
import { uploadPostMedia } from '../../services/storageService';

export default function CreatePostModal({ isOpen, onClose, onPostCreated }) {
  const { currentUser, userProfile } = useAuth();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('update');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const postTypes = [
    { value: 'update', label: '📢 Update', desc: 'Share a general update' },
    { value: 'achievement', label: '🏆 Achievement', desc: 'Celebrate a win' },
    { value: 'project', label: '🚀 Project', desc: 'Showcase your work' },
    { value: 'certification', label: '📜 Certification', desc: 'New credential' },
    { value: 'milestone', label: '🎉 Milestone', desc: 'Mark a milestone' }
  ];

  function handleMediaSelect(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be under 5MB');
        return;
      }
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  }

  function removeMedia() {
    setMediaFile(null);
    setMediaPreview(null);
  }

  async function handleSubmit() {
    if (!content.trim()) {
      setError('Post content is required');
      return;
    }
    if (content.length > 3000) {
      setError('Post content is too long (max 3000 characters)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let mediaUrl = '';
      if (mediaFile) {
        mediaUrl = await uploadPostMedia(currentUser.uid, mediaFile);
      }

      const isCompany = userProfile?.role === 'company';
      await createPost({
        authorId: currentUser.uid,
        authorType: isCompany ? 'company' : 'user',
        authorName: userProfile?.name || currentUser.displayName || 'User',
        authorAvatar: isCompany ? userProfile?.logoUrl : (userProfile?.avatarUrl || currentUser.photoURL || ''),
        authorHeadline: isCompany ? userProfile?.industry : (userProfile?.headline || ''),
        authorTrustBadge: userProfile?.trustBadge || 'NEW',
        content: content.trim(),
        mediaUrl,
        postType
      });

      setContent('');
      setPostType('update');
      setMediaFile(null);
      setMediaPreview(null);
      onClose();
      if (onPostCreated) onPostCreated();
    } catch (err) {
      setError(err.message || 'Failed to create post');
    }
    setLoading(false);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Post"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={loading || !content.trim()}
            id="submit-post-btn"
          >
            {loading ? '⏳ Posting...' : '📤 Post'}
          </button>
        </>
      }
    >
      {/* Author Preview */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar 
          src={userProfile?.avatarUrl || currentUser?.photoURL} 
          name={userProfile?.name || 'U'} 
          size="md" 
        />
        <div>
          <div className="font-semibold text-sm">{userProfile?.name || 'User'}</div>
          <div className="text-xs text-muted">{userProfile?.headline || 'Professional'}</div>
        </div>
      </div>

      {/* Post Type Selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {postTypes.map(type => (
          <button
            key={type.value}
            className={`badge ${postType === type.value ? 'badge-verified' : 'badge-skill'}`}
            onClick={() => setPostType(type.value)}
            style={{ cursor: 'pointer', padding: '4px 10px' }}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Content Input */}
      <textarea
        className="form-textarea"
        placeholder="What do you want to talk about?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ minHeight: 150 }}
        id="post-content-input"
      />
      <div className="text-xs text-muted mt-2" style={{ textAlign: 'right' }}>
        {content.length}/3000
      </div>

      {/* Media Preview */}
      {mediaPreview && (
        <div style={{ position: 'relative', marginTop: 12 }}>
          <img 
            src={mediaPreview} 
            alt="Preview" 
            style={{ 
              width: '100%', 
              maxHeight: 200, 
              objectFit: 'cover', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)'
            }} 
          />
          <button 
            onClick={removeMedia}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >✕</button>
        </div>
      )}

      {/* Media Upload Button */}
      <div className="flex items-center gap-2 mt-3">
        <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
          📷 Photo
          <input type="file" accept="image/*" onChange={handleMediaSelect} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Error */}
      {error && <div className="form-error mt-2">{error}</div>}
    </Modal>
  );
}
