import React, { useState } from 'react';
import Modal from '../shared/Modal';
import { useAuth } from '../../contexts/AuthContext';

export default function UploadProjectModal({ isOpen, onClose, onProjectUploaded }) {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [zipFile, setZipFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        setError('Only .zip files are allowed.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) { // 15MB limit
        setError('ZIP file is too large. Max size is 15MB.');
        return;
      }
      setZipFile(file);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !githubUrl.trim() || !zipFile) {
      setError('Please fill in all fields and select a ZIP file.');
      return;
    }
    
    // Quick validation on GitHub URL format
    if (!githubUrl.includes('github.com')) {
      setError('Please provide a valid GitHub URL.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('userId', currentUser.uid);
      formData.append('title', title.trim());
      formData.append('githubUrl', githubUrl.trim());
      formData.append('file', zipFile);

      const response = await fetch('/api/projects/evaluate', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      let resData;
      
      try {
        resData = JSON.parse(responseText);
      } catch (e) {
        console.error("Server returned non-JSON response:", responseText);
        throw new Error(`The server encountered a critical error and didn't return a valid response. Status: ${response.status}`);
      }

      if (!response.ok || resData.error) {
        throw new Error(resData.error || resData.detail || 'Failed to upload and evaluate project');
      }
      
      // Cleanup UI
      setTitle('');
      setGithubUrl('');
      setZipFile(null);
      onClose();
      if (onProjectUploaded) onProjectUploaded();
      
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Developer Project"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={loading || !title || !githubUrl || !zipFile}
          >
            {loading ? '🧠 AI is Evaluating...' : 'Upload & Evaluate'}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Submit your codebase for instant AI Code Quality Review. 
        Your source code zip is automatically evaluated within our systems without saving to our external storage buckets, retaining your raw source privacy natively. Note: Please upload a .ZIP mapping of your valid code.
      </div>
      
      <div className="form-group">
        <label className="form-label">Project Title</label>
        <input 
          className="form-input" 
          placeholder="e.g. Fullstack React Framework" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">GitHub URL</label>
        <input 
          className="form-input" 
          placeholder="https://github.com/Username/Project" 
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Project ZIP Archive (.zip)</label>
        <div style={{ 
          position: 'relative',
          border: '2px dashed var(--color-border)', 
          padding: '24px', 
          borderRadius: 'var(--radius-md)', 
          textAlign: 'center',
          background: 'var(--color-surface)',
          cursor: 'pointer'
        }}>
          {zipFile ? (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>{zipFile.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {(zipFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
              <button 
                className="btn btn-sm btn-ghost" 
                style={{ marginTop: '12px' }}
                onClick={() => setZipFile(null)}
              >
                Change File
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '12px', fontSize: '24px' }}>📁</div>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Click to Browse</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Max 15MB</div>
              <input 
                type="file" 
                accept=".zip" 
                onChange={handleFileChange} 
                style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} 
              />
            </>
          )}
        </div>
      </div>

      {error && <div className="form-error" style={{ marginTop: '16px' }}>{error}</div>}
    </Modal>
  );
}
